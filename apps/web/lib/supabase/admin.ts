import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { getWebSupabaseConfig } from '@/lib/safety/environment'
import { createProtectedFetch } from '@/lib/safety/protected-fetch'

export function createAdminClient() {
  const config = getWebSupabaseConfig()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) throw new Error('supabase_service_role_missing')

  return createClient<Database>(
    config.url,
    serviceRoleKey,
    { global: { fetch: createProtectedFetch() } },
  )
}
