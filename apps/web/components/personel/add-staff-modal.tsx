'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createStaff } from '@/app/(admin)/personel/actions'

export default function AddStaffModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    full_name: '',
    staff_type: 'coach',
    email: '',
    phone: '',
    monthly_salary: '',
  })

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim()) return
    if (form.staff_type === 'coach' && !form.email.trim()) return

    startTransition(async () => {
      try {
        await createStaff({
          full_name: form.full_name,
          staff_type: form.staff_type,
          email: form.email,
          phone: form.phone,
          monthly_salary: form.monthly_salary ? Number(form.monthly_salary) : undefined,
        })
        toast.success(
          form.staff_type === 'coach'
            ? `${form.full_name} eklendi; e-posta daveti güvenlik karantinasında.`
            : `${form.full_name} eklendi`,
        )
        setOpen(false)
        setForm({ full_name: '', staff_type: 'coach', email: '', phone: '', monthly_salary: '' })
        router.refresh()
      } catch (err: any) {
        toast.error('Personel eklenemedi: ' + (err?.message ?? 'Bilinmeyen hata'))
      }
    })
  }

  const isCoach = form.staff_type === 'coach'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="w-4 h-4" /> Personel Ekle
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Yeni Personel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Ad Soyad *</Label>
            <Input
              value={form.full_name}
              onChange={(e) => set('full_name', e.target.value)}
              placeholder="Ahmet Yılmaz"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tip *</Label>
            <Select value={form.staff_type} onValueChange={(v) => set('staff_type', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="coach">Antrenör</SelectItem>
                <SelectItem value="assistant">Asistan</SelectItem>
                <SelectItem value="other">Diğer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isCoach && (
            <div className="space-y-1.5">
              <Label>E-posta *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="antrenor@ornek.com"
                autoComplete="off"
                required
              />
              <p className="text-xs text-muted-foreground">
                Antrenör mobil uygulamaya bu e-posta adresiyle giriş yapacak.
              </p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Telefon</Label>
            <PhoneInput
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="5xxxxxxxxx"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Aylık Maaş (₺)</Label>
            <Input
              type="number"
              value={form.monthly_salary}
              onChange={(e) => set('monthly_salary', e.target.value)}
              placeholder="0"
              min={0}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
