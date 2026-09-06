'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [passwordAgain, setPasswordAgain] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Yeni şifre en az 8 karakter olmalı.')
      return
    }

    if (password !== passwordAgain) {
      setError('Şifreler birbiriyle eşleşmiyor.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError('Şifre yenilenemedi. Bağlantının süresi dolmuş olabilir; yeniden bağlantı isteyin.')
      setLoading(false)
      return
    }

    await supabase.auth.signOut()
    router.replace('/login?password=updated')
    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 text-card-foreground shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <span className="text-xl font-bold text-white">5M</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground">Yeni şifre oluşturun</h1>
          <p className="mt-1 text-sm text-muted-foreground">En az 8 karakter kullanın.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">Yeni şifre</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password-again">Yeni şifre tekrar</Label>
            <Input
              id="password-again"
              type="password"
              value={passwordAgain}
              onChange={(event) => setPasswordAgain(event.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Şifre yenileniyor…' : 'Şifreyi Yenile'}
          </Button>
        </form>
      </div>
    </main>
  )
}
