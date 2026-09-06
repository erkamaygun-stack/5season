import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  MAX_WEBHOOK_BODY_BYTES,
  parseMetaWebhook,
  verifyMetaWebhookSignature,
} from '@/lib/integrations/whatsapp/webhook'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function safeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, 'utf8')
  const rightBytes = Buffer.from(right, 'utf8')
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes)
}

function isInboundModeEnabled(): boolean {
  const mode = process.env.WHATSAPP_INBOUND_MODE ?? 'disabled'
  const appEnvironment = process.env.APP_ENV ?? process.env.NEXT_PUBLIC_APP_ENV ?? 'unknown'
  if (mode === 'test') return ['development', 'test', 'staging'].includes(appEnvironment)
  if (mode === 'production') return appEnvironment === 'production'
  return false
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode')
  const verifyToken = request.nextUrl.searchParams.get('hub.verify_token')
  const challenge = request.nextUrl.searchParams.get('hub.challenge')
  const configuredToken = process.env.META_WHATSAPP_VERIFY_TOKEN

  if (
    mode !== 'subscribe'
    || !verifyToken
    || !challenge
    || !configuredToken
    || !safeEqual(verifyToken, configuredToken)
  ) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  return new NextResponse(challenge, { status: 200, headers: { 'content-type': 'text/plain' } })
}

export async function POST(request: NextRequest) {
  if (!isInboundModeEnabled()) {
    return NextResponse.json({ error: 'whatsapp_inbound_disabled' }, { status: 503 })
  }

  const appSecret = process.env.META_APP_SECRET
  if (!appSecret) return NextResponse.json({ error: 'webhook_secret_missing' }, { status: 503 })

  const rawBody = await request.text()
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_WEBHOOK_BODY_BYTES) {
    return NextResponse.json({ error: 'webhook_body_too_large' }, { status: 413 })
  }
  if (!verifyMetaWebhookSignature(rawBody, request.headers.get('x-hub-signature-256'), appSecret)) {
    return NextResponse.json({ error: 'webhook_signature_invalid' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'webhook_json_invalid' }, { status: 400 })
  }

  const events = parseMetaWebhook(payload)
  const admin = createAdminClient()

  for (const event of events) {
    if (event.kind === 'status') {
      const { error } = await (admin.rpc as any)('record_whatsapp_delivery_status', {
        p_phone_number_id: event.phoneNumberId,
        p_provider_message_id: event.providerMessageId,
        p_delivery_status: event.deliveryStatus,
        p_occurred_at: event.occurredAt,
        p_error_code: event.errorCode,
      })
      if (error) return NextResponse.json({ error: 'webhook_status_persist_failed' }, { status: 500 })
      continue
    }

    const { error } = await (admin.rpc as any)('ingest_whatsapp_message', {
      p_phone_number_id: event.phoneNumberId,
      p_provider_message_id: event.providerMessageId,
      p_sender_wa_id: event.senderWaId,
      p_message_type: event.messageType,
      p_occurred_at: event.occurredAt,
      p_media_id: event.mediaId,
      p_interactive_reply_id: event.interactiveReplyId,
      p_is_stop_request: event.isStopRequest,
    })
    if (error) return NextResponse.json({ error: 'webhook_message_persist_failed' }, { status: 500 })
  }

  return NextResponse.json({ accepted: true, eventCount: events.length })
}
