import type { OutboundDeliveryMode } from '@/lib/safety/outbound-policy'

export type WhatsAppTemplateRequest = {
  phoneNumberId: string
  recipient: string
  templateName: string
  languageCode: string
  variables: Readonly<Record<string, string>>
  idempotencyKey: string
}

export type WhatsAppTextRequest = {
  phoneNumberId: string
  recipient: string
  text: string
  idempotencyKey: string
}

export type WhatsAppInteractiveRow = {
  id: string
  title: string
  description?: string
}

export type WhatsAppInteractiveRequest = {
  phoneNumberId: string
  recipient: string
  body: string
  buttonLabel: string
  sectionTitle: string
  rows: readonly WhatsAppInteractiveRow[]
  idempotencyKey: string
}

export type WhatsAppSendResult = {
  providerMessageId: string
  acceptedAt: string
}

export interface WhatsAppProvider {
  readonly name: string
  sendTemplate(request: WhatsAppTemplateRequest): Promise<WhatsAppSendResult>
  sendText(request: WhatsAppTextRequest): Promise<WhatsAppSendResult>
  sendInteractive(request: WhatsAppInteractiveRequest): Promise<WhatsAppSendResult>
}

class DisabledWhatsAppProvider implements WhatsAppProvider {
  readonly name = 'disabled'

  async sendTemplate(_request: WhatsAppTemplateRequest): Promise<WhatsAppSendResult> {
    throw new Error('blocked_by_safety_mode:whatsapp_provider_disabled')
  }

  async sendText(_request: WhatsAppTextRequest): Promise<WhatsAppSendResult> {
    throw new Error('blocked_by_safety_mode:whatsapp_provider_disabled')
  }

  async sendInteractive(_request: WhatsAppInteractiveRequest): Promise<WhatsAppSendResult> {
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

  async sendText(request: WhatsAppTextRequest): Promise<WhatsAppSendResult> {
    return {
      providerMessageId: `sink:${request.idempotencyKey}`,
      acceptedAt: new Date().toISOString(),
    }
  }

  async sendInteractive(request: WhatsAppInteractiveRequest): Promise<WhatsAppSendResult> {
    return {
      providerMessageId: `sink:${request.idempotencyKey}`,
      acceptedAt: new Date().toISOString(),
    }
  }
}

type MetaProviderConfig = {
  accessToken: string
  graphApiVersion: string
  fetchImplementation?: typeof fetch
}

class MetaCloudWhatsAppProvider implements WhatsAppProvider {
  readonly name = 'meta_cloud'
  private readonly fetchImplementation: typeof fetch
  private readonly config: MetaProviderConfig

  constructor(config: MetaProviderConfig) {
    this.config = config
    this.fetchImplementation = config.fetchImplementation ?? globalThis.fetch
  }

  private async send(phoneNumberId: string, payload: Record<string, unknown>): Promise<WhatsAppSendResult> {
    const response = await this.fetchImplementation(
      `https://graph.facebook.com/${this.config.graphApiVersion}/${encodeURIComponent(phoneNumberId)}/messages`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.config.accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', ...payload }),
      },
    )

    const result = await response.json().catch(() => null) as {
      messages?: Array<{ id?: string }>
      error?: { code?: number; message?: string }
    } | null

    const messageId = result?.messages?.[0]?.id
    if (!response.ok || !messageId) {
      const code = result?.error?.code ? String(result.error.code) : String(response.status)
      throw new Error(`whatsapp_provider_rejected:${code}`)
    }

    return { providerMessageId: messageId, acceptedAt: new Date().toISOString() }
  }

  sendTemplate(request: WhatsAppTemplateRequest): Promise<WhatsAppSendResult> {
    const values = Object.values(request.variables)
    return this.send(request.phoneNumberId, {
      to: request.recipient,
      type: 'template',
      template: {
        name: request.templateName,
        language: { code: request.languageCode },
        ...(values.length > 0
          ? {
              components: [{
                type: 'body',
                parameters: values.map((value) => ({ type: 'text', text: value })),
              }],
            }
          : {}),
      },
    })
  }

  sendText(request: WhatsAppTextRequest): Promise<WhatsAppSendResult> {
    return this.send(request.phoneNumberId, {
      to: request.recipient,
      type: 'text',
      text: { preview_url: false, body: request.text },
    })
  }

  sendInteractive(request: WhatsAppInteractiveRequest): Promise<WhatsAppSendResult> {
    if (request.rows.length < 1 || request.rows.length > 10) {
      throw new Error('whatsapp_interactive_row_count_invalid')
    }

    return this.send(request.phoneNumberId, {
      to: request.recipient,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: request.body.slice(0, 1024) },
        action: {
          button: request.buttonLabel.slice(0, 20),
          sections: [{
            title: request.sectionTitle.slice(0, 24),
            rows: request.rows.map((row) => ({
              id: row.id.slice(0, 200),
              title: row.title.slice(0, 24),
              ...(row.description ? { description: row.description.slice(0, 72) } : {}),
            })),
          }],
        },
      },
    })
  }
}

function createMetaProviderFromEnvironment(): WhatsAppProvider {
  const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN
  const graphApiVersion = process.env.META_GRAPH_API_VERSION
  if (!accessToken) throw new Error('meta_whatsapp_access_token_missing')
  if (!graphApiVersion || !/^v\d+\.\d+$/.test(graphApiVersion)) {
    throw new Error('meta_graph_api_version_missing_or_invalid')
  }
  return new MetaCloudWhatsAppProvider({ accessToken, graphApiVersion })
}

export function createWhatsAppProvider(mode: OutboundDeliveryMode): WhatsAppProvider {
  if (mode === 'sink') return new SinkWhatsAppProvider()
  if (mode === 'disabled') return new DisabledWhatsAppProvider()
  return createMetaProviderFromEnvironment()
}
