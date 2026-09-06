import assert from 'node:assert/strict'
import { lookup as dnsLookup } from 'node:dns'
import process from 'node:process'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { Agent, setGlobalDispatcher } from 'undici'

function required(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name}_missing`)
  return value
}

const baseUrl = required('CLOUDFLARE_PREVIEW_URL').replace(/\/$/, '')
const previewIp = process.env.CLOUDFLARE_PREVIEW_IP?.trim()
if (previewIp) {
  const previewHostname = new URL(baseUrl).hostname
  setGlobalDispatcher(new Agent({
    connect: {
      lookup(hostname, options, callback) {
        if (hostname !== previewHostname) {
          dnsLookup(hostname, options, callback)
        } else if (options?.all) {
          callback(null, [{ address: previewIp, family: 4 }])
        } else {
          callback(null, previewIp, 4)
        }
      },
    },
  }))
}

const supabaseUrl = required('NEXT_PUBLIC_SUPABASE_URL')
const anonKey = required('NEXT_PUBLIC_SUPABASE_ANON_KEY')
const expectedRef = (
  process.env.CLOUDFLARE_EXPECTED_SUPABASE_PROJECT_REF?.trim()
  || process.env.NEXT_PUBLIC_STAGING_SUPABASE_PROJECT_REF?.trim()
  || required('PRODUCTION_SUPABASE_PROJECT_REF')
).toLowerCase()
const protectedRefs = new Set(
  required('NEXT_PUBLIC_PROTECTED_SUPABASE_PROJECT_REFS')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
)
const actualRef = new URL(supabaseUrl).hostname.replace(/\.supabase\.co$/, '').toLowerCase()
assert.equal(actualRef, expectedRef)
if (process.env.NEXT_PUBLIC_APP_ENV === 'production') {
  assert.equal(protectedRefs.has(actualRef), true)
  assert.equal(process.env.OUTBOUND_DELIVERY_MODE, 'disabled')
} else {
  assert.equal(process.env.NEXT_PUBLIC_APP_ENV, 'staging')
  assert.equal(protectedRefs.has(actualRef), false)
}

const cookies = new Map()

const supabase = createServerClient(supabaseUrl, anonKey, {
  cookies: {
    getAll() {
      return [...cookies].map(([name, value]) => ({ name, value }))
    },
    setAll(items) {
      for (const { name, value } of items) cookies.set(name, value)
    },
  },
})

const email = process.env.CLOUDFLARE_QA_EMAIL?.trim()
const password = process.env.CLOUDFLARE_QA_PASSWORD?.trim()

if (email && password) {
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) throw signInError
} else {
  const service = createClient(supabaseUrl, required('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: profiles, error: profilesError } = await service
    .from('profiles')
    .select('id')
    .eq('role', 'school_admin')
    .eq('is_active', true)
    .limit(2)
  if (profilesError) throw profilesError
  const expectedActiveAdmins = Number(process.env.CLOUDFLARE_QA_EXPECTED_ACTIVE_ADMINS ?? '1')
  assert.equal(profiles.length, expectedActiveAdmins, 'unexpected_active_school_admin_count')

  const { data: usersData, error: usersError } = await service.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })
  if (usersError) throw usersError
  const adminUser = usersData.users.find((user) => user.id === profiles[0].id)
  assert.ok(adminUser?.email, 'admin_auth_user_missing')

  const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
    type: 'magiclink',
    email: adminUser.email,
    options: { redirectTo: baseUrl },
  })
  if (linkError) throw linkError
  assert.ok(linkData.properties?.hashed_token, 'test_session_token_missing')

  const { error: verificationError } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: linkData.properties.hashed_token,
  })
  if (verificationError) throw verificationError
}

const cookieHeader = [...cookies]
  .map(([name, value]) => `${name}=${value}`)
  .join('; ')

const publicLogin = await fetch(`${baseUrl}/login`, { redirect: 'manual' })
assert.equal(publicLogin.status, 200)

for (const path of ['/', '/ogrenciler', '/finans?tab=raporlar', '/ayarlar']) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { cookie: cookieHeader },
    redirect: 'manual',
  })
  assert.equal(response.status, 200, `${path}:${response.status}`)
}

let attendanceTakingHidden = false
if (process.env.NEXT_PUBLIC_ATTENDANCE_ENABLED !== 'true') {
  const service = createClient(supabaseUrl, required('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: group, error: groupError } = await service.from('groups').select('id').limit(1).single()
  if (groupError) throw groupError
  const response = await fetch(`${baseUrl}/gruplar/${group.id}`, {
    headers: { cookie: cookieHeader },
    redirect: 'manual',
  })
  assert.equal(response.status, 200, `/gruplar/${group.id}:${response.status}`)
  assert.equal((await response.text()).includes('Bugünkü Yoklama'), false)
  attendanceTakingHidden = true
}

process.stdout.write(JSON.stringify({
  ready: true,
  authenticatedRoutes: 4,
  publicLogin: true,
  attendanceTakingHidden,
}) + '\n')
