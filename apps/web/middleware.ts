import { NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware-client'

export async function middleware(request: NextRequest) {
  const { supabase, supabaseResponse } = createMiddlewareClient(request)
  const { pathname } = request.nextUrl

  // getSession() cookie'deki imzalı JWT'yi okur — network round-trip yok (~0ms)
  // Güvenlik: JWT Supabase tarafından imzalandığı için client tarafından taklit edilemez.
  // Rol zaten app_metadata'da (trigger ile yazıldı), RLS da veri erişimini koruyor.
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user

  if (!user) {
    if (pathname !== '/login') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return supabaseResponse
  }

  const role = user.app_metadata?.role as string | undefined

  // coach / parent → no web access
  if (role === 'coach' || role === 'parent') {
    return NextResponse.redirect(new URL('/login?error=no_access', request.url))
  }

  // super-admin routes: only super_admin
  if (pathname.startsWith('/super-admin') && role !== 'super_admin') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // super_admin should only access /super-admin/* — redirect away from school admin routes
  if (role === 'super_admin' && !pathname.startsWith('/super-admin')) {
    return NextResponse.redirect(new URL('/super-admin', request.url))
  }

  // Redirect away from login if already authenticated
  if (pathname === '/login') {
    const dest = role === 'super_admin' ? '/super-admin' : '/'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
