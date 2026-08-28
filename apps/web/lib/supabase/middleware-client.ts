import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/lib/database.types'
import { getWebSupabaseConfig } from '@/lib/safety/environment'
import { createProtectedFetch } from '@/lib/safety/protected-fetch'

export function createMiddlewareClient(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const config = getWebSupabaseConfig()

  const supabase = createServerClient<Database>(
    config.url,
    config.anonKey,
    {
      global: { fetch: createProtectedFetch() },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          )
        },
      },
    }
  )

  return { supabase, supabaseResponse }
}
