export type OutboundDeliveryMode = 'disabled' | 'sink' | 'allowlist' | 'production'
export type CommunicationsStatus = 'quarantined' | 'active' | 'suspended'

export type OutboundPolicyInput = {
  mode: OutboundDeliveryMode
  appEnvironment: string
  communicationsStatus: CommunicationsStatus
  recipient: string | null
  allowlist: readonly string[]
  purposeCode: string
  consentOrLegalBasisConfirmed: boolean
}

export type OutboundDecision =
  | { allowed: true; route: 'sink' | 'provider' }
  | { allowed: false; reason: string }

function normalizeRecipient(value: string): string {
  return value.trim().toLowerCase().replace(/[\s()-]/g, '')
}

export function parseOutboundDeliveryMode(value: string | undefined): OutboundDeliveryMode {
  if (value === 'sink' || value === 'allowlist' || value === 'production') return value
  return 'disabled'
}

export function evaluateOutboundPolicy(input: OutboundPolicyInput): OutboundDecision {
  if (input.mode === 'disabled') return { allowed: false, reason: 'outbound_disabled' }
  if (!input.purposeCode.trim()) return { allowed: false, reason: 'purpose_code_missing' }

  if (input.mode === 'sink') {
    return { allowed: true, route: 'sink' }
  }

  if (!input.recipient) return { allowed: false, reason: 'recipient_missing' }

  const recipient = normalizeRecipient(input.recipient)
  const allowlist = new Set(input.allowlist.map(normalizeRecipient).filter(Boolean))

  if (input.mode === 'allowlist') {
    return allowlist.has(recipient)
      ? { allowed: true, route: 'provider' }
      : { allowed: false, reason: 'recipient_not_allowlisted' }
  }

  if (input.appEnvironment !== 'production') {
    return { allowed: false, reason: 'production_mode_outside_production' }
  }
  if (input.communicationsStatus !== 'active') {
    return { allowed: false, reason: 'tenant_quarantined' }
  }
  if (!input.consentOrLegalBasisConfirmed) {
    return { allowed: false, reason: 'consent_or_legal_basis_missing' }
  }

  return { allowed: true, route: 'provider' }
}

function readAllowlist(): string[] {
  return (process.env.OUTBOUND_RECIPIENT_ALLOWLIST ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function assertOutboundSystemEnabled(): void {
  const mode = parseOutboundDeliveryMode(process.env.OUTBOUND_DELIVERY_MODE)
  if (mode === 'disabled') throw new Error('blocked_by_safety_mode:outbound_disabled')
}

export function assertOutboundDeliveryAllowed(input: {
  recipient: string | null
  communicationsStatus: CommunicationsStatus
  purposeCode: string
  consentOrLegalBasisConfirmed: boolean
}): 'sink' | 'provider' {
  const decision = evaluateOutboundPolicy({
    mode: parseOutboundDeliveryMode(process.env.OUTBOUND_DELIVERY_MODE),
    appEnvironment: process.env.APP_ENV ?? process.env.NEXT_PUBLIC_APP_ENV ?? 'unknown',
    communicationsStatus: input.communicationsStatus,
    recipient: input.recipient,
    allowlist: readAllowlist(),
    purposeCode: input.purposeCode,
    consentOrLegalBasisConfirmed: input.consentOrLegalBasisConfirmed,
  })

  if (!decision.allowed) {
    throw new Error(`blocked_by_safety_mode:${decision.reason}`)
  }

  return decision.route
}
