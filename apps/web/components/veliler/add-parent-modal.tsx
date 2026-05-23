'use client'

import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createParent } from '@/app/(admin)/veliler/actions'

export default function AddParentModal() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({ full_name: '', phone: '', email: '' })

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim() || !form.phone.trim()) return

    startTransition(async () => {
      try {
        await createParent({
          full_name: form.full_name,
          phone: form.phone,
          email: form.email || undefined,
        })
        toast.success(`${form.full_name} eklendi`)
        setOpen(false)
        setForm({ full_name: '', phone: '', email: '' })
      } catch (err: any) {
        toast.error('Veli eklenemedi: ' + (err?.message ?? 'Bilinmeyen hata'))
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4" /> Veli Ekle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Yeni Veli</DialogTitle>
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
            <Label>Telefon *</Label>
            <PhoneInput
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="5xxxxxxxxx"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>E-posta</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="isteğe bağlı"
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
