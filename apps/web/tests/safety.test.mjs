import assert from 'node:assert/strict'
import test from 'node:test'

import {
  assertSafeSupabaseTarget,
  getSupabaseProjectRef,
  getWebSupabaseConfig,
} from '../lib/safety/environment.ts'
import {
  createProtectedFetch,
  isBlockedProtectedMutation,
} from '../lib/safety/protected-fetch.ts'
import {
  evaluateOutboundPolicy,
  parseOutboundDeliveryMode,
} from '../lib/safety/outbound-policy.ts'
import {
  assertReceiptTransition,
  canTransitionReceipt,
} from '../lib/domain/receipt-state.ts'
import { createWhatsAppProvider } from '../lib/integrations/whatsapp/provider.ts'
import { calculateAge, toLocalDateString } from '../lib/utils.ts'
import { resolveSafeDevelopmentTarget, resolveWritableStagingTarget } from '../lib/safety/dev-environment.mjs'
import { canAccessWebPanel } from '../lib/auth/panel-access.ts'
import { safePasswordResetNextPath } from '../lib/auth/reset-redirect.ts'

const LOCAL_KEY = 'local-anon-key'

test('web panel accepts only active administrator profiles', () => {
  assert.equal(canAccessWebPanel({ role: 'school_admin', is_active: true }), true)
  assert.equal(canAccessWebPanel({ role: 'super_admin', is_active: true }), true)
  assert.equal(canAccessWebPanel({ role: 'coach', is_active: true }), false)
  assert.equal(canAccessWebPanel({ role: 'school_admin', is_active: false }), false)
  assert.equal(canAccessWebPanel(null), false)
})

test('password reset callback accepts only local application paths', () => {
  assert.equal(safePasswordResetNextPath('/update-password'), '/update-password')
  assert.equal(safePasswordResetNextPath('/update-password?source=email'), '/update-password?source=email')
  assert.equal(safePasswordResetNextPath('https://example.com'), '/update-password')
  assert.equal(safePasswordResetNextPath('//example.com'), '/update-password')
  assert.equal(safePasswordResetNextPath(null), '/update-password')
})

test('local Supabase does not require protected project refs', () => {
  const result = assertSafeSupabaseTarget({
    url: 'http://127.0.0.1:54321',
    anonKey: LOCAL_KEY,
    appEnvironment: 'development',
    protectedProjectRefs: undefined,
  })

  assert.equal(result.isLocal, true)
  assert.equal(result.projectRef, null)
})

test('safe dev launcher uses local write mode or remote read-only mode', () => {
  assert.deepEqual(
    resolveSafeDevelopmentTarget('http://127.0.0.1:54321', undefined),
    { kind: 'local', protectedProjectRefs: '' },
  )

  assert.deepEqual(
    resolveSafeDevelopmentTarget('https://current-project.supabase.co', 'other-project'),
    {
      kind: 'remote_read_only',
      protectedProjectRefs: 'other-project,current-project',
    },
  )

  assert.throws(
    () => resolveSafeDevelopmentTarget('https://database.example.com', undefined),
    /local veya tanınan bir Supabase projesi/,
  )
})

test('writable staging launcher requires an exact non-production project ref', () => {
  assert.deepEqual(
    resolveWritableStagingTarget(
      'https://staging-ref.supabase.co',
      'staging-ref',
      'protected-ref',
    ),
    { projectRef: 'staging-ref', protectedProjectRefs: 'protected-ref' },
  )

  assert.throws(
    () => resolveWritableStagingTarget(
      'https://protected-ref.supabase.co',
      'protected-ref',
      'protected-ref',
    ),
    /protected_supabase_target_blocked/,
  )

  assert.throws(
    () => resolveWritableStagingTarget(
      'https://staging-ref.supabase.co',
      'different-ref',
      'protected-ref',
    ),
    /staging_supabase_target_mismatch/,
  )
})

test('remote development target fails closed without protected refs', () => {
  assert.throws(
    () => assertSafeSupabaseTarget({
      url: 'https://staging-ref.supabase.co',
      anonKey: LOCAL_KEY,
      appEnvironment: 'development',
      protectedProjectRefs: undefined,
    }),
    /protected_supabase_refs_missing/,
  )
})

test('protected production project is blocked outside production', () => {
  assert.throws(
    () => assertSafeSupabaseTarget({
      url: 'https://protected-ref.supabase.co',
      anonKey: LOCAL_KEY,
      appEnvironment: 'staging',
      protectedProjectRefs: 'protected-ref',
    }),
    /protected_supabase_target_blocked/,
  )
})

test('a declared staging ref is allowed when it is not protected', () => {
  const result = assertSafeSupabaseTarget({
    url: 'https://staging-ref.supabase.co',
    anonKey: LOCAL_KEY,
    appEnvironment: 'staging',
    protectedProjectRefs: 'protected-ref',
  })

  assert.equal(result.projectRef, 'staging-ref')
  assert.equal(getSupabaseProjectRef(result.url), 'staging-ref')
})

test('production Node environment alone does not authorize a remote target', () => {
  const original = {
    nodeEnv: process.env.NODE_ENV,
    appEnv: process.env.NEXT_PUBLIC_APP_ENV,
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    protectedRefs: process.env.NEXT_PUBLIC_PROTECTED_SUPABASE_PROJECT_REFS,
  }

  try {
    process.env.NODE_ENV = 'production'
    delete process.env.NEXT_PUBLIC_APP_ENV
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://production-ref.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = LOCAL_KEY
    delete process.env.NEXT_PUBLIC_PROTECTED_SUPABASE_PROJECT_REFS

    assert.throws(() => getWebSupabaseConfig(), /protected_supabase_refs_missing/)
  } finally {
    for (const [key, value] of Object.entries({
      NODE_ENV: original.nodeEnv,
      NEXT_PUBLIC_APP_ENV: original.appEnv,
      NEXT_PUBLIC_SUPABASE_URL: original.url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: original.anonKey,
      NEXT_PUBLIC_PROTECTED_SUPABASE_PROJECT_REFS: original.protectedRefs,
    })) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
})

test('explicit read-only real-data mode allows only a listed protected target', () => {
  const result = assertSafeSupabaseTarget({
    url: 'https://protected-ref.supabase.co',
    anonKey: LOCAL_KEY,
    appEnvironment: 'development',
    protectedProjectRefs: 'protected-ref',
    realDataTestMode: 'read_only',
    protectedDataMode: 'true',
  })

  assert.equal(result.isReadOnlyRealDataTest, true)
})

test('read-only real-data mode cannot disable mutation protection', () => {
  assert.throws(
    () => assertSafeSupabaseTarget({
      url: 'https://protected-ref.supabase.co',
      anonKey: LOCAL_KEY,
      appEnvironment: 'development',
      protectedProjectRefs: 'protected-ref',
      realDataTestMode: 'read_only',
      protectedDataMode: 'false',
    }),
    /real_data_test_requires_protected_mode/,
  )
})

test('protected data mode blocks Supabase mutations and allows reads', () => {
  assert.equal(isBlockedProtectedMutation('https://example.supabase.co/rest/v1/students', 'POST', true), true)
  assert.equal(isBlockedProtectedMutation('https://example.supabase.co/storage/v1/object/receipts/a', 'DELETE', true), true)
  assert.equal(isBlockedProtectedMutation('https://example.supabase.co/rest/v1/students', 'GET', true), false)
  assert.equal(isBlockedProtectedMutation('https://example.supabase.co/auth/v1/token', 'POST', true), false)
  assert.equal(isBlockedProtectedMutation('https://example.supabase.co/auth/v1/logout', 'POST', true), false)
  assert.equal(isBlockedProtectedMutation('https://example.supabase.co/auth/v1/user', 'PUT', true), true)
  assert.equal(isBlockedProtectedMutation('https://example.supabase.co/auth/v1/recover', 'POST', true), true)
  assert.equal(isBlockedProtectedMutation('https://example.supabase.co/storage/v1/object/sign/docs/a', 'POST', true), false)
  assert.equal(isBlockedProtectedMutation('https://example.supabase.co/unknown/v1/action', 'POST', true), true)
})

test('protected fetch rejects before calling the transport', async () => {
  let called = false
  const guardedFetch = createProtectedFetch(async () => {
    called = true
    return new Response(null, { status: 204 })
  }, true)

  await assert.rejects(
    () => guardedFetch('https://example.supabase.co/rest/v1/students', { method: 'PATCH' }),
    /blocked_by_protected_data_mode/,
  )
  assert.equal(called, false)
})

test('outbound mode defaults to disabled', () => {
  assert.equal(parseOutboundDeliveryMode(undefined), 'disabled')
  assert.deepEqual(evaluateOutboundPolicy({
    mode: 'disabled',
    appEnvironment: 'production',
    communicationsStatus: 'active',
    recipient: '+905550000000',
    allowlist: ['+905550000000'],
    purposeCode: 'payment_reminder',
    consentOrLegalBasisConfirmed: true,
  }), { allowed: false, reason: 'outbound_disabled' })
})

test('production delivery needs production environment, active tenant and legal basis', () => {
  const base = {
    mode: 'production',
    appEnvironment: 'production',
    communicationsStatus: 'active',
    recipient: '+905550000000',
    allowlist: [],
    purposeCode: 'payment_reminder',
    consentOrLegalBasisConfirmed: true,
  }

  assert.deepEqual(evaluateOutboundPolicy({ ...base, appEnvironment: 'staging' }), {
    allowed: false,
    reason: 'production_mode_outside_production',
  })
  assert.deepEqual(evaluateOutboundPolicy({ ...base, communicationsStatus: 'quarantined' }), {
    allowed: false,
    reason: 'tenant_quarantined',
  })
  assert.deepEqual(evaluateOutboundPolicy({ ...base, consentOrLegalBasisConfirmed: false }), {
    allowed: false,
    reason: 'consent_or_legal_basis_missing',
  })
})

test('allowlist mode rejects every recipient not explicitly listed', () => {
  assert.deepEqual(evaluateOutboundPolicy({
    mode: 'allowlist',
    appEnvironment: 'staging',
    communicationsStatus: 'quarantined',
    recipient: '+905550000001',
    allowlist: ['+905550000002'],
    purposeCode: 'receipt_result',
    consentOrLegalBasisConfirmed: true,
  }), { allowed: false, reason: 'recipient_not_allowlisted' })
})

test('receipt state machine accepts the review-cleanup path and rejects shortcuts', () => {
  assert.equal(canTransitionReceipt('received', 'identifying'), true)
  assert.equal(canTransitionReceipt('identifying', 'pending_review'), true)
  assert.equal(canTransitionReceipt('pending_review', 'cleanup_pending'), true)
  assert.equal(canTransitionReceipt('cleanup_pending', 'completed'), true)
  assert.equal(canTransitionReceipt('received', 'completed'), false)
  assert.throws(() => assertReceiptTransition('pending_review', 'completed'), /invalid_receipt_transition/)
})

test('WhatsApp provider is disabled by default and sink performs no transport', async () => {
  await assert.rejects(
    () => createWhatsAppProvider('disabled').sendTemplate({
      phoneNumberId: 'test-phone-id',
      recipient: '+905550000000',
      templateName: 'receipt_result',
      languageCode: 'tr',
      variables: {},
      idempotencyKey: 'submission-1',
    }),
    /whatsapp_provider_disabled/,
  )

  const result = await createWhatsAppProvider('sink').sendTemplate({
    phoneNumberId: 'test-phone-id',
    recipient: '+905550000000',
    templateName: 'receipt_result',
    languageCode: 'tr',
    variables: {},
    idempotencyKey: 'submission-1',
  })
  assert.equal(result.providerMessageId, 'sink:submission-1')
  assert.throws(() => createWhatsAppProvider('production'), /access_token_missing/)
})

test('calendar helpers do not shift date-only values through UTC', () => {
  assert.equal(toLocalDateString(new Date(2026, 7, 30, 0, 30)), '2026-08-30')
  assert.equal(calculateAge('2016-08-31', new Date(2026, 7, 30)), 9)
  assert.equal(calculateAge('2016-08-30', new Date(2026, 7, 30)), 10)
})
