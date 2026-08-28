import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'
import { getWebSupabaseConfig } from '@/lib/safety/environment'
import { createProtectedFetch } from '@/lib/safety/protected-fetch'

export async function createClient() {
  const cookieStore = await cookies()
  const config = getWebSupabaseConfig()

  return createServerClient<Database>(
    config.url,
    config.anonKey,
    {
      global: { fetch: createProtectedFetch() },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            )
          } catch {
            // Server Component — cookies set in middleware
          }
        },
      },
    }
  )
}
