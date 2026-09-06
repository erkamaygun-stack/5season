'use client'
// useState, edit/delete modalları için

import { useState, useTransition, useEffect } from 'react'
import { toast } from 'sonner'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatCurrency } from '@/lib/utils'
import { updateExpense, deleteExpense } from '@/app/(admin)/giderler/actions'

const CATEGORIES = [
  { value: 'rent', label: 'Kira' },
  { value: 'utility', label: 'Fatura' },
  { value: 'equipment', label: 'Malzeme' },
  { value: 'tax', label: 'Vergi' },
  { value: 'other', label: 'Diğer' },
]

const CATEGORY_LABELS: Record<string, string> = {
  rent: 'Kira', salary: 'Maaş', utility: 'Fatura',
  equipment: 'Malzeme', tax: 'Vergi', other: 'Diğer',
}

interface Expense {
  id: string
  expense_date: string | null
  category: string
  description: string | null
  amount: number
  paid_to: string | null
}

function EditExpenseModal({
  expense,
  onClose,
  onSuccess,
}: {
  expense: Expense | null
  onClose: () => void
  onSuccess: (updated: Expense) => void
}) {
  const [form, setForm] = useState({
    category: '',
    amount: '',
    expense_date: '',
    description: '',
    paid_to: '',
  })
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (expense) {
      // Seçilen gider değiştiğinde modal taslağını kaynaktan yenile.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        category: expense.category,
        amount: String(expense.amount),
        expense_date: expense.expense_date ?? '',
        description: expense.description ?? '',
        paid_to: expense.paid_to ?? '',
      })
    }
  }, [expense])

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!expense || !form.category || !form.amount) return
    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) { toast.error('Geçerli bir tutar girin'); return }
    startTransition(async () => {
      try {
        await updateExpense(expense.id, {
          category: form.category,
          amount,
          expense_date: form.expense_date,
          description: form.description || undefined,
          paid_to: form.paid_to || undefined,
        })
        toast.success('Gider güncellendi')
        onSuccess({ ...expense, category: form.category, amount, expense_date: form.expense_date, description: form.description || null, paid_to: form.paid_to || null })
      } catch (err: any) {
        toast.error(err.message ?? 'Güncellenemedi')
      }
    })
  }

  return (
    <Dialog open={!!expense} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gideri Düzenle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Kategori *</Label>
            <Select value={form.category} onValueChange={(v) => set('category', v)}>
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
              <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Tarih *</Label>
              <Input type="date" value={form.expense_date} onChange={(e) => set('expense_date', e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Açıklama</Label>
            <Input placeholder="Açıklama…" value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Ödenen Kişi / Kurum</Label>
            <Input placeholder="Mülk sahibi, TEDAŞ…" value={form.paid_to} onChange={(e) => set('paid_to', e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>İptal</Button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Kaydediliyor…' : 'Kaydet'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function GiderlerClient({ initialExpenses }: { initialExpenses: Expense[] }) {
  const [expenses, setExpenses] = useState(initialExpenses)
  const [editTarget, setEditTarget] = useState<Expense | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(expense: Expense) {
    if (!confirm('Bu gider kaydı silinsin mi?')) return
    setDeletingId(expense.id)
    try {
      await deleteExpense(expense.id)
      setExpenses((prev) => prev.filter((e) => e.id !== expense.id))
      toast.success('Gider silindi')
    } catch (err: any) {
      toast.error(err.message ?? 'Silinemedi')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="min-w-full text-sm divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tarih</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kategori</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Açıklama</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Tutar</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {expenses.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground text-sm">
                  Gider kaydı yok.
                </td>
              </tr>
            )}
            {expenses.map((e) => (
              <tr key={e.id} className={`hover:bg-muted/50 ${e.category === 'salary' ? 'bg-muted/30' : ''}`}>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(e.expense_date)}</td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">{CATEGORY_LABELS[e.category] ?? e.category}</Badge>
                </td>
                <td className="px-4 py-3 text-foreground">{e.description ?? '-'}</td>
                <td className="px-4 py-3 text-right font-medium">{formatCurrency(e.amount)}</td>
                <td className="px-4 py-3 text-center">
                  {e.category !== 'salary' && (
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        aria-label="Gideri düzenle"
                        title="Gideri düzenle"
                        onClick={() => setEditTarget(e)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                        aria-label="Gideri sil"
                        title="Gideri sil"
                        onClick={() => handleDelete(e)}
                        disabled={deletingId === e.id}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <EditExpenseModal
        expense={editTarget}
        onClose={() => setEditTarget(null)}
        onSuccess={(updated) => {
          setExpenses((prev) => prev.map((e) => e.id === updated.id ? updated : e))
          setEditTarget(null)
        }}
      />
    </>
  )
}
