'use client'
// useState, form submit için

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { addExpense } from '@/app/(admin)/giderler/actions'
import { today } from '@/lib/utils'

const CATEGORIES = [
  { value: 'rent', label: 'Kira' },
  { value: 'utility', label: 'Fatura' },
  { value: 'equipment', label: 'Malzeme' },
  { value: 'tax', label: 'Vergi' },
  { value: 'other', label: 'Diğer' },
]

export default function AddExpenseModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    category: '',
    amount: '',
    expense_date: today(),
    description: '',
    paid_to: '',
  })

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.category || !form.amount) return
    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Geçerli bir tutar girin')
      return
    }
    setLoading(true)
    try {
      await addExpense({
        category: form.category,
        amount,
        expense_date: form.expense_date,
        description: form.description || undefined,
        paid_to: form.paid_to || undefined,
      })
      toast.success('Gider eklendi')
      setOpen(false)
      setForm({ category: '', amount: '', expense_date: today(), description: '', paid_to: '' })
      router.refresh()
    } catch (err: any) {
      toast.error(err.message ?? 'Gider eklenemedi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="w-4 h-4" /> Gider Ekle
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Yeni Gider</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Kategori *</Label>
            <Select onValueChange={(v) => set('category', v)} required>
              <SelectTrigger><SelectValue placeholder="Seç" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tutar (₺) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tarih *</Label>
              <Input
                type="date"
                value={form.expense_date}
                onChange={(e) => set('expense_date', e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Açıklama</Label>
            <Input
              placeholder="Haziran kirası, elektrik faturası…"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Ödenen Kişi / Kurum</Label>
            <Input
              placeholder="Mülk sahibi, TEDAŞ…"
              value={form.paid_to}
              onChange={(e) => set('paid_to', e.target.value)}
            />
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
