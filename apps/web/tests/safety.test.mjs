import assert from 'node:assert/strict'
import test from 'node:test'

import {
  assertSafeSupabaseTarget,
  getSupabaseProjectRef,
} from '../lib/safety/environment.ts'
import {
  createProtectedFetch,
  isBlockedProtectedMutation,
} from '../lib/safety/protected-fetch.ts'
import {
  evaluateOutboundPolicy,
  parseOutboundDeliveryMode,
} from '../lib/safety/outbound-policy.ts'

const LOCAL_KEY = 'local-anon-key'

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

test('protected data mode blocks Supabase mutations and allows reads', () => {
  assert.equal(isBlockedProtectedMutation('https://example.supabase.co/rest/v1/students', 'POST', true), true)
  assert.equal(isBlockedProtectedMutation('https://example.supabase.co/storage/v1/object/receipts/a', 'DELETE', true), true)
  assert.equal(isBlockedProtectedMutation('https://example.supabase.co/rest/v1/students', 'GET', true), false)
  assert.equal(isBlockedProtectedMutation('https://example.supabase.co/auth/v1/token', 'POST', true), false)
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
