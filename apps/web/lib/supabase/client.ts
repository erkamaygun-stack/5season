import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'
import { getWebSupabaseConfig } from '@/lib/safety/environment'
import { createProtectedFetch } from '@/lib/safety/protected-fetch'

export function createClient() {
  const config = getWebSupabaseConfig()
  return createBrowserClient<Database>(
    config.url,
    config.anonKey,
    { global: { fetch: createProtectedFetch() } },
  )
}
