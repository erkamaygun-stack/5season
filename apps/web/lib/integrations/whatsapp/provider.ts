import type { OutboundDeliveryMode } from '@/lib/safety/outbound-policy'

export type WhatsAppTemplateRequest = {
  recipient: string
  templateName: string
  languageCode: string
  variables: Readonly<Record<string, string>>
  idempotencyKey: string
}

export type WhatsAppSendResult = {
  providerMessageId: string
  acceptedAt: string
}

export interface WhatsAppProvider {
  readonly name: string
  sendTemplate(request: WhatsAppTemplateRequest): Promise<WhatsAppSendResult>
}

class DisabledWhatsAppProvider implements WhatsAppProvider {
  readonly name = 'disabled'

  async sendTemplate(_request: WhatsAppTemplateRequest): Promise<WhatsAppSendResult> {
    throw new Error('blocked_by_safety_mode:whatsapp_provider_disabled')
  }
}

class SinkWhatsAppProvider implements WhatsAppProvider {
  readonly name = 'sink'

  async sendTemplate(request: WhatsAppTemplateRequest): Promise<WhatsAppSendResult> {
    // Sink only returns an opaque deterministic marker; it never performs I/O and
    // deliberately does not log recipient or template variables.
    return {
      providerMessageId: `sink:${request.idempotencyKey}`,
      acceptedAt: new Date().toISOString(),
    }
  }
}

export function createWhatsAppProvider(mode: OutboundDeliveryMode): WhatsAppProvider {
  if (mode === 'sink') return new SinkWhatsAppProvider()
  if (mode === 'disabled') return new DisabledWhatsAppProvider()

  // Meta Cloud API credentials and legal go-live approval are intentionally not
  // part of the overnight package. Never silently fall back to a live provider.
  throw new Error('whatsapp_live_provider_not_configured')
}
