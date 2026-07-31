'use client'
// useState, form submit ve şifre değiştirme için

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { updateProfile, changePassword } from './actions'

interface Profile {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  role: string | null
  school_id: string | null
}

export default function HesabimClient({ profile }: { profile: Profile }) {
  const router = useRouter()
  const [fullName, setFullName] = useState(profile.full_name ?? '')
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [email, setEmail] = useState(profile.email ?? '')
  const [isPending, startTransition] = useTransition()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwPending, startPwTransition] = useTransition()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim() || !phone.trim()) return
    startTransition(async () => {
      try {
        await updateProfile({ full_name: fullName, phone, email: email || undefined })
        toast.success('Profil güncellendi')
      } catch (err: any) {
        toast.error(err.message ?? 'Güncellenemedi')
      }
    })
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 6) { toast.error('Şifre en az 6 karakter olmalı'); return }
    if (newPassword !== confirmPassword) { toast.error('Şifreler eşleşmiyor'); return }
    startPwTransition(async () => {
      try {
        await changePassword(newPassword)
        toast.success('Şifre değiştirildi')
        setNewPassword('')
        setConfirmPassword('')
      } catch (err: any) {
        toast.error(err.message ?? 'Şifre değiştirilemedi')
      }
    })
  }

  const roleLabel = profile.role === 'school_admin' ? 'Okul Yöneticisi'
    : profile.role === 'super_admin' ? 'Süper Admin'
    : profile.role === 'coach' ? 'Antrenör'
    : profile.role ?? '-'

  return (
    <div className="space-y-6">
      {/* Profil bilgileri */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-6 py-3 border-b bg-muted/50">
          <span className="text-sm font-medium text-foreground">Hesap Bilgileri</span>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xl font-bold text-primary">
                {(profile.full_name ?? 'K').charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold text-foreground">{profile.full_name ?? '-'}</p>
              <p className="text-sm text-muted-foreground">{roleLabel}</p>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4 max-w-md">
            <div className="space-y-1.5">
              <Label>Ad Soyad *</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Ad Soyad"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Telefon *</Label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="+90 5xx xxx xxxx"
              />
            </div>
            <div className="space-y-1.5">
              <Label>E-posta</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="isteğe bağlı"
              />
            </div>
            <div className="flex justify-end pt-1">
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Kaydediliyor…' : 'Kaydet'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Şifre değiştirme */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-6 py-3 border-b bg-muted/50">
          <span className="text-sm font-medium text-foreground">Şifre Değiştir</span>
        </div>
        <div className="p-6">
          <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
            <div className="space-y-1.5">
              <Label>Yeni Şifre *</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="En az 6 karakter"
                minLength={6}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Şifre Tekrar *</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Şifreyi tekrar girin"
              />
            </div>
            <div className="flex justify-end pt-1">
              <Button type="submit" disabled={pwPending}>
                {pwPending ? 'Değiştiriliyor…' : 'Şifreyi Değiştir'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Oturum */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-6 py-3 border-b bg-muted/50">
          <span className="text-sm font-medium text-foreground">Oturum</span>
        </div>
        <div className="p-6">
          <Button variant="destructive" onClick={handleSignOut} disabled={signingOut}>
            <LogOut className="w-4 h-4" />
            {signingOut ? 'Çıkış yapılıyor…' : 'Hesaptan Çıkış Yap'}
          </Button>
        </div>
      </div>
    </div>
  )
}
