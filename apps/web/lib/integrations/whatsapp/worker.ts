import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import {
  evaluateOutboundPolicy,
  parseOutboundDeliveryMode,
  readOutboundRecipientAllowlist,
} from '@/lib/safety/outbound-policy'
import { buildReceiptStoragePath, downloadMetaReceiptImage } from './media'
import { createWhatsAppProvider } from './provider'
import { parseReceiptSelectionId } from './webhook'

type AdminClient = SupabaseClient<Database>

type WorkerSummary = {
  remindersQueued: number
  inboundCompleted: number
  inboundFailed: number
  cleanupCompleted: number
  cleanupFailed: number
  outboundSent: number
  outboundSuppressed: number
  outboundFailed: number
}

function toErrorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : 'unknown_error'
  return message.replace(/[^a-zA-Z0-9:_-]/g, '_').slice(0, 120) || 'unknown_error'
}

function isRetryable(errorCode: string): boolean {
  if (
    errorCode.includes('_missing')
    || errorCode.includes('_invalid')
    || errorCode.includes('_forbidden')
    || errorCode.includes('blocked_by_safety_mode')
    || /:(400|401|403|404)$/.test(errorCode)
  ) return false
  return true
}

async function rpc(admin: AdminClient, name: string, params: Record<string, unknown>): Promise<any> {
  const { data, error } = await (admin.rpc as any)(name, params)
  if (error) throw new Error(`${name}:${error.code ?? 'db_error'}`)
  return data
}

function getMetaMediaConfig(): { accessToken: string; graphApiVersion: string } {
  const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN
  const graphApiVersion = process.env.META_GRAPH_API_VERSION
  if (!accessToken) throw new Error('meta_whatsapp_access_token_missing')
  if (!graphApiVersion || !/^v\d+\.\d+$/.test(graphApiVersion)) {
    throw new Error('meta_graph_api_version_missing_or_invalid')
  }
  return { accessToken, graphApiVersion }
}

async function processInboundJobs(admin: AdminClient, limit: number, summary: WorkerSummary): Promise<void> {
  const jobs = await rpc(admin, 'claim_whatsapp_inbound_jobs', { p_limit: limit }) as any[]

  for (const job of jobs ?? []) {
    try {
      const { data: message, error: messageError } = await (admin as any).from('whatsapp_messages')
        .select('id, school_id, channel_id, media_id, conversation_id')
        .eq('id', job.message_id)
        .single()
      if (messageError || !message) throw new Error('whatsapp_inbound_message_missing')

      if (job.job_type === 'receipt_media') {
        const submissionId = String(job.payload?.submission_id ?? '')
        const mediaId = String(job.payload?.media_id ?? message.media_id ?? '')
        if (!submissionId || !mediaId) throw new Error('receipt_media_job_payload_invalid')

        const { data: existing } = await (admin as any).from('receipt_submissions')
          .select('storage_path, status')
          .eq('id', submissionId)
          .eq('message_id', message.id)
          .single()

        if (!existing?.storage_path) {
          const validated = await downloadMetaReceiptImage({ mediaId, ...getMetaMediaConfig() })
          const storagePath = buildReceiptStoragePath(message.school_id, submissionId, validated.extension)
          const { error: uploadError } = await admin.storage
            .from('whatsapp-receipts')
            .upload(storagePath, validated.bytes, {
              contentType: validated.mimeType,
              upsert: false,
              cacheControl: 'no-store',
            })
          if (uploadError) throw new Error(`receipt_storage_upload_failed:${uploadError.statusCode ?? 'storage_error'}`)

          try {
            await rpc(admin, 'finalize_whatsapp_receipt_media', {
              p_submission_id: submissionId,
              p_storage_path: storagePath,
              p_content_sha256: validated.sha256,
              p_mime_type: validated.mimeType,
              p_size_bytes: validated.bytes.byteLength,
            })
          } catch (error) {
            await admin.storage.from('whatsapp-receipts').remove([storagePath])
            throw error
          }
        }
      } else if (job.job_type === 'receipt_selection') {
        const parsed = parseReceiptSelectionId(String(job.payload?.interactive_reply_id ?? ''))
        if (!parsed) throw new Error('receipt_selection_reply_invalid')
        await rpc(admin, 'select_whatsapp_receipt_invoice', {
          p_message_id: message.id,
          p_submission_id: parsed.submissionId,
          p_invoice_type: parsed.invoiceType,
          p_invoice_id: parsed.invoiceId,
        })
      } else {
        throw new Error('whatsapp_inbound_job_type_invalid')
      }

      await rpc(admin, 'complete_whatsapp_inbound_job', { p_job_id: job.id })
      summary.inboundCompleted += 1
    } catch (error) {
      const errorCode = toErrorCode(error)
      await rpc(admin, 'fail_whatsapp_inbound_job', {
        p_job_id: job.id,
        p_error_code: errorCode,
        p_retryable: isRetryable(errorCode),
      })
      summary.inboundFailed += 1
    }
  }
}

async function processReceiptCleanup(admin: AdminClient, limit: number, summary: WorkerSummary): Promise<void> {
  const submissions = await rpc(admin, 'claim_receipt_cleanup', { p_limit: limit }) as any[]
  for (const submission of submissions ?? []) {
    try {
      if (!submission.storage_path) throw new Error('receipt_cleanup_path_missing')
      const { error } = await admin.storage
        .from(submission.storage_bucket || 'whatsapp-receipts')
        .remove([submission.storage_path])
      if (error) throw new Error(`receipt_storage_cleanup_failed:${error.statusCode ?? 'storage_error'}`)
      await rpc(admin, 'complete_receipt_cleanup', { p_submission_id: submission.id })
      summary.cleanupCompleted += 1
    } catch (error) {
      await rpc(admin, 'fail_receipt_cleanup', {
        p_submission_id: submission.id,
        p_error_code: toErrorCode(error),
      })
      summary.cleanupFailed += 1
    }
  }
}

function isServiceWindowOpen(value: string | null | undefined): boolean {
  if (!value) return false
  const expiresAt = new Date(value).getTime()
  return Number.isFinite(expiresAt) && expiresAt > Date.now()
}

async function processOutboundJobs(admin: AdminClient, limit: number, summary: WorkerSummary): Promise<void> {
  const mode = parseOutboundDeliveryMode(process.env.OUTBOUND_DELIVERY_MODE)
  const provider = createWhatsAppProvider(mode)
  const outboxRows = await rpc(admin, 'claim_integration_outbox', { p_limit: limit }) as any[]

  for (const outbox of outboxRows ?? []) {
    try {
      const [{ data: channel }, { data: guardian }, { data: school }, { data: conversation }, { data: consent }] = await Promise.all([
        (admin as any).from('whatsapp_channels')
          .select('phone_number_id, status, template_config')
          .eq('id', outbox.channel_id).single(),
        outbox.guardian_id
          ? (admin as any).from('guardians').select('phone_e164, status').eq('id', outbox.guardian_id).single()
          : Promise.resolve({ data: null }),
        (admin as any).from('schools')
          .select('communications_status').eq('id', outbox.school_id).single(),
        outbox.guardian_id
          ? (admin as any).from('whatsapp_conversations')
              .select('service_window_expires_at')
              .eq('channel_id', outbox.channel_id)
              .eq('guardian_id', outbox.guardian_id)
              .order('updated_at', { ascending: false }).limit(1).maybeSingle()
          : Promise.resolve({ data: null }),
        outbox.guardian_id
          ? (admin as any).from('guardian_consents')
              .select('status')
              .eq('guardian_id', outbox.guardian_id)
              .eq('purpose_code', 'whatsapp_transactional')
              .order('recorded_at', { ascending: false }).limit(1).maybeSingle()
          : Promise.resolve({ data: null }),
      ])

      const recipient = guardian?.phone_e164 ?? null
      const decision = evaluateOutboundPolicy({
        mode,
        appEnvironment: process.env.APP_ENV ?? process.env.NEXT_PUBLIC_APP_ENV ?? 'unknown',
        communicationsStatus: school?.communications_status ?? 'quarantined',
        recipient,
        allowlist: readOutboundRecipientAllowlist(),
        purposeCode: outbox.purpose_code,
        consentOrLegalBasisConfirmed: outbox.purpose_code === 'aidat_reminder'
          ? ['granted', 'not_required'].includes(consent?.status ?? '')
          : consent?.status !== 'revoked',
      })
      if (!decision.allowed) {
        await rpc(admin, 'suppress_integration_outbox', {
          p_outbox_id: outbox.id,
          p_reason: decision.reason,
        })
        summary.outboundSuppressed += 1
        continue
      }
      if (!channel?.phone_number_id || (!recipient && decision.route !== 'sink')) {
        throw new Error('outbound_destination_missing')
      }

      const destination = recipient ?? 'sink-recipient'
      let result
      if (outbox.purpose_code === 'receipt_selection') {
        if (!isServiceWindowOpen(conversation?.service_window_expires_at)) {
          throw new Error('receipt_selection_service_window_closed')
        }
        const submissionId = String(outbox.payload?.submission_id ?? '')
        const options = await rpc(admin, 'get_receipt_selection_options', {
          p_submission_id: submissionId,
        }) as any[]
        if (!Array.isArray(options) || options.length < 1 || options.length > 10) {
          throw new Error('receipt_selection_options_invalid')
        }
        result = await provider.sendInteractive({
          phoneNumberId: channel.phone_number_id,
          recipient: destination,
          body: 'Dekontunuzu eşleştirmek için ilgili öğrenci ve borcu seçin.',
          buttonLabel: 'Borç seç',
          sectionTitle: 'Açık borçlar',
          rows: options.map((option) => ({
            id: `receipt:${submissionId}:${option.invoice_type}:${option.invoice_id}`,
            title: String(option.student_name),
            description: `${option.invoice_label} · ₺${Number(option.remaining_amount).toLocaleString('tr-TR')}`,
          })),
          idempotencyKey: outbox.event_key,
        })
      } else if (outbox.purpose_code === 'receipt_result') {
        const decisionValue = String(outbox.payload?.decision ?? '')
        const approved = decisionValue === 'approved'
        if (!approved && decisionValue !== 'rejected') throw new Error('receipt_result_decision_invalid')

        if (isServiceWindowOpen(conversation?.service_window_expires_at)) {
          result = await provider.sendText({
            phoneNumberId: channel.phone_number_id,
            recipient: destination,
            text: approved
              ? 'Dekontunuz onaylandı ve ödemeniz hesabınıza işlendi.'
              : 'Dekontunuz incelendi ancak onaylanamadı. Okul yönetimiyle iletişime geçebilirsiniz.',
            idempotencyKey: outbox.event_key,
          })
        } else {
          const config = channel.template_config ?? {}
          const templateName = approved ? config.receipt_approved : config.receipt_rejected
          if (!templateName) throw new Error('receipt_result_template_missing')
          result = await provider.sendTemplate({
            phoneNumberId: channel.phone_number_id,
            recipient: destination,
            templateName,
            languageCode: config.language_code ?? 'tr',
            variables: {},
            idempotencyKey: outbox.event_key,
          })
        }
      } else if (outbox.purpose_code === 'aidat_reminder') {
        const invoiceId = String(outbox.payload?.invoice_id ?? '')
        const { data: invoice, error: invoiceError } = await (admin as any)
          .from('aidat_invoices')
          .select('id, period_year, period_month, amount, paid_amount, due_date, students(full_name)')
          .eq('id', invoiceId)
          .eq('school_id', outbox.school_id)
          .single()
        if (invoiceError || !invoice) throw new Error('aidat_reminder_invoice_missing')
        const config = channel.template_config ?? {}
        if (!config.aidat_reminder) throw new Error('aidat_reminder_template_missing')
        const remainingAmount = Number(invoice.amount) - Number(invoice.paid_amount ?? 0)
        result = await provider.sendTemplate({
          phoneNumberId: channel.phone_number_id,
          recipient: destination,
          templateName: config.aidat_reminder,
          languageCode: config.language_code ?? 'tr',
          variables: {
            student_name: invoice.students?.full_name ?? 'Öğrenciniz',
            period: `${String(invoice.period_month).padStart(2, '0')}/${invoice.period_year}`,
            remaining_amount: `₺${remainingAmount.toLocaleString('tr-TR')}`,
            due_date: String(invoice.due_date),
          },
          idempotencyKey: outbox.event_key,
        })
      } else {
        throw new Error('outbox_purpose_not_supported')
      }

      await rpc(admin, 'complete_integration_outbox', {
        p_outbox_id: outbox.id,
        p_provider_message_id: result.providerMessageId,
        p_accepted_at: result.acceptedAt,
      })
      summary.outboundSent += 1
    } catch (error) {
      const errorCode = toErrorCode(error)
      await rpc(admin, 'fail_integration_outbox', {
        p_outbox_id: outbox.id,
        p_error_code: errorCode,
        p_retryable: isRetryable(errorCode),
      })
      summary.outboundFailed += 1
    }
  }
}

export async function runWhatsAppIntegrationWorker(admin: AdminClient, limit = 10): Promise<WorkerSummary> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 50)
  const summary: WorkerSummary = {
    remindersQueued: 0,
    inboundCompleted: 0,
    inboundFailed: 0,
    cleanupCompleted: 0,
    cleanupFailed: 0,
    outboundSent: 0,
    outboundSuppressed: 0,
    outboundFailed: 0,
  }

  summary.remindersQueued = Number(await rpc(admin, 'enqueue_due_aidat_reminders', {})) || 0
  await processInboundJobs(admin, safeLimit, summary)
  await processReceiptCleanup(admin, safeLimit, summary)
  await processOutboundJobs(admin, safeLimit, summary)
  return summary
}
