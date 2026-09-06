import { createHmac, timingSafeEqual } from 'node:crypto'

export const MAX_WEBHOOK_BODY_BYTES = 1_048_576

export type WhatsAppInboundEvent = {
  kind: 'message'
  phoneNumberId: string
  providerMessageId: string
  senderWaId: string
  messageType: string
  occurredAt: string
  mediaId: string | null
  interactiveReplyId: string | null
  isStopRequest: boolean
}

export type WhatsAppDeliveryEvent = {
  kind: 'status'
  phoneNumberId: string
  providerMessageId: string
  deliveryStatus: 'sent' | 'delivered' | 'read' | 'failed'
  occurredAt: string
  errorCode: string | null
}

export type WhatsAppWebhookEvent = WhatsAppInboundEvent | WhatsAppDeliveryEvent

function asObject(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function toOccurredAt(value: unknown): string {
  const seconds = Number(value)
  if (!Number.isFinite(seconds) || seconds <= 0) return new Date().toISOString()
  return new Date(seconds * 1000).toISOString()
}

export function verifyMetaWebhookSignature(rawBody: string, signatureHeader: string | null, appSecret: string): boolean {
  if (!signatureHeader?.startsWith('sha256=') || !appSecret) return false
  const suppliedHex = signatureHeader.slice('sha256='.length)
  if (!/^[0-9a-f]{64}$/i.test(suppliedHex)) return false

  const expected = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest()
  const supplied = Buffer.from(suppliedHex, 'hex')
  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
}

export function isWhatsAppStopRequest(text: string | null): boolean {
  if (!text) return false
  const normalized = text
    .trim()
    .toLocaleUpperCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return ['DUR', 'IPTAL', 'STOP', 'VAZGEC'].includes(normalized)
}

function getInteractiveReplyId(message: Record<string, unknown>): string | null {
  const interactive = asObject(message.interactive)
  if (!interactive) return null
  const listReply = asObject(interactive.list_reply)
  const buttonReply = asObject(interactive.button_reply)
  return asString(listReply?.id) ?? asString(buttonReply?.id)
}

export function parseMetaWebhook(payload: unknown): WhatsAppWebhookEvent[] {
  const root = asObject(payload)
  const events: WhatsAppWebhookEvent[] = []

  for (const entryValue of asArray(root?.entry)) {
    const entry = asObject(entryValue)
    for (const changeValue of asArray(entry?.changes)) {
      const change = asObject(changeValue)
      const value = asObject(change?.value)
      const metadata = asObject(value?.metadata)
      const phoneNumberId = asString(metadata?.phone_number_id)
      if (!phoneNumberId) continue

      for (const messageValue of asArray(value?.messages)) {
        const message = asObject(messageValue)
        if (!message) continue
        const providerMessageId = asString(message?.id)
        const senderWaId = asString(message?.from)
        const messageType = asString(message?.type)
        if (!providerMessageId || !senderWaId || !messageType) continue

        const image = asObject(message?.image)
        const text = asObject(message?.text)
        events.push({
          kind: 'message',
          phoneNumberId,
          providerMessageId,
          senderWaId,
          messageType,
          occurredAt: toOccurredAt(message?.timestamp),
          mediaId: asString(image?.id),
          interactiveReplyId: getInteractiveReplyId(message),
          isStopRequest: messageType === 'text' && isWhatsAppStopRequest(asString(text?.body)),
        })
      }

      for (const statusValue of asArray(value?.statuses)) {
        const status = asObject(statusValue)
        const providerMessageId = asString(status?.id)
        const deliveryStatus = asString(status?.status)
        if (!providerMessageId || !['sent', 'delivered', 'read', 'failed'].includes(deliveryStatus ?? '')) continue
        const error = asObject(asArray(status?.errors)[0])
        events.push({
          kind: 'status',
          phoneNumberId,
          providerMessageId,
          deliveryStatus: deliveryStatus as WhatsAppDeliveryEvent['deliveryStatus'],
          occurredAt: toOccurredAt(status?.timestamp),
          errorCode: error?.code === undefined ? null : String(error.code),
        })
      }
    }
  }

  return events
}

export function parseReceiptSelectionId(value: string): {
  submissionId: string
  invoiceType: 'aidat' | 'equipment'
  invoiceId: string
} | null {
  const match = /^receipt:([0-9a-f-]{36}):(aidat|equipment):([0-9a-f-]{36})$/i.exec(value)
  if (!match) return null
  return {
    submissionId: match[1].toLowerCase(),
    invoiceType: match[2] as 'aidat' | 'equipment',
    invoiceId: match[3].toLowerCase(),
  }
}
