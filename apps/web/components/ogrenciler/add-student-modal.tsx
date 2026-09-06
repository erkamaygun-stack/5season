'use client'
// useState: form state ve enrollment_date client-side init için

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { addStudent } from '@/app/(admin)/ogrenciler/actions'
import { today } from '@/lib/utils'

interface Group { id: string; name: string }

export default function AddStudentModal({ groups }: { groups: Group[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    full_name: '',
    birth_date: '',
    gender: '',
    blood_type: '',
    enrollment_date: '',
    group_id: '',
    notes: '',
    parent_name: '',
    parent_phone: '',
  })

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen && !form.enrollment_date) {
      setForm((current) => ({ ...current, enrollment_date: today() }))
    }
    setOpen(nextOpen)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim()) return
    setLoading(true)
    try {
      await addStudent({
        full_name: form.full_name,
        birth_date: form.birth_date || undefined,
        gender: form.gender || undefined,
        blood_type: form.blood_type || undefined,
        enrollment_date: form.enrollment_date,
        group_id: form.group_id || undefined,
        notes: form.notes || undefined,
        parent_name: form.parent_name || undefined,
        parent_phone: form.parent_phone || undefined,
      })
      toast.success(`${form.full_name} eklendi`)
      setOpen(false)
      setForm({
        full_name: '', birth_date: '', gender: '', blood_type: '',
        enrollment_date: today(),
        group_id: '', notes: '', parent_name: '', parent_phone: '',
      })
      router.refresh()
    } catch (err: any) {
      toast.error(err.message ?? 'Öğrenci eklenemedi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>
        <Plus className="w-4 h-4" /> Öğrenci Ekle
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Yeni Öğrenci</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Ad Soyad *</Label>
            <Input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Doğum Tarihi</Label>
              <Input type="date" value={form.birth_date} onChange={(e) => set('birth_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Cinsiyet</Label>
              <Select onValueChange={(v) => set('gender', v)}>
                <SelectTrigger><SelectValue placeholder="Seç" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Erkek</SelectItem>
                  <SelectItem value="F">Kız</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Kan Grubu</Label>
              <Select onValueChange={(v) => set('blood_type', v)}>
                <SelectTrigger><SelectValue placeholder="Seç" /></SelectTrigger>
                <SelectContent>
                  {['A+','A-','B+','B-','AB+','AB-','0+','0-'].map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Kayıt Tarihi</Label>
              <Input type="date" value={form.enrollment_date} onChange={(e) => set('enrollment_date', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Grup</Label>
            <Select onValueChange={(v) => set('group_id', v)}>
              <SelectTrigger><SelectValue placeholder="Grup seç (isteğe bağlı)" /></SelectTrigger>
              <SelectContent>
                {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Notlar</Label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
            />
          </div>

          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Veli Bilgileri <span className="text-muted-foreground font-normal">(isteğe bağlı)</span></p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Veli Adı</Label>
                <Input
                  placeholder="Ad Soyad"
                  value={form.parent_name}
                  onChange={(e) => set('parent_name', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Veli Telefonu</Label>
                <Input
                  placeholder="5XXXXXXXXX"
                  value={form.parent_phone}
                  onChange={(e) => set('parent_phone', e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Veli iletişim kaydı oluşturulur; veli için ayrıca kullanıcı hesabı açılmaz.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>İptal</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Kaydediliyor…' : 'Kaydet'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
