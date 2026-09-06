'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError('E-posta veya şifre hatalı.')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  async function handlePasswordReset() {
    setError(null)
    setResetSent(false)

    if (!email.trim()) {
      setError('Önce e-posta adresinizi yazın.')
      return
    }

    setResetLoading(true)
    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    })
    setResetLoading(false)

    if (resetError) {
      setError('Şifre yenileme bağlantısı gönderilemedi. Lütfen daha sonra tekrar deneyin.')
      return
    }

    setResetSent(true)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">E-posta</Label>
        <Input
          id="email"
          type="email"
          placeholder="admin@okul.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="bg-background text-foreground caret-foreground placeholder:text-muted-foreground"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Şifre</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className="bg-background text-foreground caret-foreground placeholder:text-muted-foreground"
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {resetSent && (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          Hesap bu e-postayla kayıtlıysa şifre yenileme bağlantısı gönderildi.
        </p>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
      </Button>

      <Button
        type="button"
        variant="link"
        className="w-full"
        disabled={resetLoading}
        onClick={handlePasswordReset}
      >
        {resetLoading ? 'Bağlantı gönderiliyor…' : 'Şifremi unuttum'}
      </Button>
    </form>
  )
}
