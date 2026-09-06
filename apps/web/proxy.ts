import { NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware-client'
import { canAccessWebPanel } from '@/lib/auth/panel-access'

function redirectWithAuthCookies(url: URL, source: NextResponse) {
  const response = NextResponse.redirect(url)
  source.cookies.getAll().forEach((cookie) => response.cookies.set(cookie))
  return response
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Bu iki endpoint kendi imza/secret doğrulamasını yapar ve kullanıcı oturumu
  // kullanmaz. Auth redirect'i webhook doğrulamasını bozmamalıdır.
  if (
    pathname === '/api/integrations/whatsapp/webhook'
    || pathname === '/api/internal/jobs/whatsapp'
    || pathname === '/auth/callback'
  ) {
    return NextResponse.next()
  }

  const { supabase, supabaseResponse } = createMiddlewareClient(request)

  // Kullanıcıyı Auth sunucusunda doğrula; yalnızca cookie içeriğine güvenme.
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    if (pathname !== '/login') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return supabaseResponse
  }

  // JWT rolü eski kalabilir ve pasiflik bilgisini taşımaz. Her istekte kendi profil
  // satırını doğrulayarak pasif veya yönetici olmayan hesabı kapıda durdur.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (!canAccessWebPanel(profile)) {
    await supabase.auth.signOut()
    return redirectWithAuthCookies(
      new URL('/login?error=no_access', request.url),
      supabaseResponse,
    )
  }

  const role = profile!.role

  if (pathname.startsWith('/super-admin') && role !== 'super_admin') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (role === 'super_admin' && !pathname.startsWith('/super-admin')) {
    return NextResponse.redirect(new URL('/super-admin', request.url))
  }

  if (pathname === '/login') {
    const destination = role === 'super_admin' ? '/super-admin' : '/'
    return NextResponse.redirect(new URL(destination, request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
