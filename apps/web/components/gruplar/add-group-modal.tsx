'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { TR_DAYS } from '@/lib/utils'
import { GROUP_CATEGORIES, type GroupCategory } from '@/lib/group-categories'
import { createGroup } from '@/app/(admin)/gruplar/actions'

interface Coach {
  id: string
  full_name: string
}

interface Slot {
  day_of_week: string
  start_time: string
  end_time: string
}

export default function AddGroupModal({ coaches }: { coaches: Coach[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState<{
    name: string
    monthly_fee: string
    primary_coach_id: string
    category: GroupCategory
  }>({
    name: '',
    monthly_fee: '',
    primary_coach_id: '',
    category: GROUP_CATEGORIES[0].value,
  })
  const [slots, setSlots] = useState<Slot[]>([
    { day_of_week: '1', start_time: '16:00', end_time: '17:30' },
  ])

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function addSlot() {
    setSlots((s) => [...s, { day_of_week: '1', start_time: '16:00', end_time: '17:30' }])
  }

  function removeSlot(i: number) {
    setSlots((s) => s.filter((_, idx) => idx !== i))
  }

  function setSlot(i: number, key: keyof Slot, value: string) {
    setSlots((s) => s.map((slot, idx) => (idx === i ? { ...slot, [key]: value } : slot)))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return

    startTransition(async () => {
      try {
        await createGroup({
          name: form.name.trim(),
          monthly_fee: form.monthly_fee ? Number(form.monthly_fee) : null,
          primary_coach_id: form.primary_coach_id || null,
          category: form.category,
          slots: slots.map((s) => ({
            day_of_week: Number(s.day_of_week),
            start_time: s.start_time.length === 5 ? s.start_time + ':00' : s.start_time,
            end_time: s.end_time.length === 5 ? s.end_time + ':00' : s.end_time,
          })),
        })
        toast.success(`${form.name} grubu oluşturuldu`)
        setOpen(false)
        setForm({ name: '', monthly_fee: '', primary_coach_id: '', category: GROUP_CATEGORIES[0].value })
        setSlots([{ day_of_week: '1', start_time: '16:00', end_time: '17:30' }])
        router.refresh()
      } catch (err: any) {
        toast.error('Grup oluşturulamadı: ' + (err?.message ?? 'Bilinmeyen hata'))
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="w-4 h-4" /> Yeni Grup
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Yeni Grup</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          <div className="space-y-1.5">
            <Label>Grup Adı *</Label>
            <Input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="U10 Pazartesi-Çarşamba"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Kategori *</Label>
            <Select value={form.category} onValueChange={(v) => set('category', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GROUP_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Aylık Ücret (₺)</Label>
            <Input
              type="number"
              value={form.monthly_fee}
              onChange={(e) => set('monthly_fee', e.target.value)}
              placeholder="500"
              min={0}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Antrenör</Label>
            <Select value={form.primary_coach_id} onValueChange={(v) => set('primary_coach_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seçiniz (isteğe bağlı)" />
              </SelectTrigger>
              <SelectContent>
                {coaches.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Antrenman Günleri</Label>
              <Button type="button" size="sm" variant="outline" onClick={addSlot}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Gün Ekle
              </Button>
            </div>
            {slots.map((slot, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
                <Select
                  value={slot.day_of_week}
                  onValueChange={(v) => setSlot(i, 'day_of_week', v)}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TR_DAYS.map((d, idx) => (
                      <SelectItem key={idx + 1} value={String(idx + 1)}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="time"
                  value={slot.start_time}
                  onChange={(e) => setSlot(i, 'start_time', e.target.value)}
                  className="w-28 text-sm"
                />
                <Input
                  type="time"
                  value={slot.end_time}
                  onChange={(e) => setSlot(i, 'end_time', e.target.value)}
                  className="w-28 text-sm"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeSlot(i)}
                  disabled={slots.length === 1}
                  className="px-2"
                >
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Kaydediliyor…' : 'Oluştur'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
