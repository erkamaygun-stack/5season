import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LoginForm from './login-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; password?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/')
  }

  const { error, password } = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="bg-card text-card-foreground rounded-xl shadow-sm border p-8">
          <div className="text-center mb-8">
            <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4">
              <span className="text-white font-bold text-xl">5M</span>
            </div>
            <h1 className="text-xl font-semibold text-foreground">5mevsim</h1>
            <p className="text-sm text-muted-foreground mt-1">Yönetim Paneli</p>
          </div>

          {error === 'no_access' && (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Bu panel yalnızca okul yöneticileri içindir.
            </div>
          )}

          {error === 'reset_link' && (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Şifre yenileme bağlantısı geçersiz veya süresi dolmuş. Yeni bir bağlantı isteyin.
            </div>
          )}

          {password === 'updated' && (
            <div className="mb-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
              Şifreniz yenilendi. Yeni şifrenizle giriş yapabilirsiniz.
            </div>
          )}

          <LoginForm />
        </div>
      </div>
    </div>
  )
}
