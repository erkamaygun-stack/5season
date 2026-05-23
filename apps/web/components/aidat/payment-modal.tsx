'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'

interface Invoice {
  id: string; student_id: string; studentName: string
  amount: number; paid_amount: number; status: string; period_month: number
}

interface Props {
  invoice: Invoice
  onClose: () => void
  onSuccess: () => void
}

export default function PaymentModal({ invoice, onClose, onSuccess }: Props) {
  const remaining = invoice.amount - invoice.paid_amount
  const [amount, setAmount] = useState(String(remaining))
  const [method, setMethod] = useState('cash')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsedAmount = parseFloat(amount)
    if (!parsedAmount || parsedAmount <= 0) return
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: schoolData } = await supabase.from('schools').select('id').limit(1).single()

    const { error } = await supabase.from('payments').insert({
      school_id: schoolData?.id ?? '',
      student_id: invoice.student_id,
      invoice_type: 'aidat',
      invoice_id: invoice.id,
      amount: parsedAmount,
      payment_method: method,
      payment_date: new Date().toISOString().split('T')[0],
      received_by: user?.id ?? null,
      notes: notes || null,
    })

    if (error) {
      toast.error('Ödeme kaydedilemedi: ' + error.message)
      setLoading(false)
      return
    }

    toast.success('Ödeme kaydedildi')
    onSuccess()
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ödeme Al</DialogTitle>
        </DialogHeader>

        <div className="rounded-md bg-gray-50 p-4 text-sm space-y-1 mb-2">
          <p><span className="text-gray-500">Öğrenci:</span> <span className="font-medium">{invoice.studentName}</span></p>
          <p><span className="text-gray-500">Toplam:</span> {formatCurrency(invoice.amount)}</p>
          <p><span className="text-gray-500">Ödenen:</span> {formatCurrency(invoice.paid_amount)}</p>
          <p><span className="text-gray-500 font-semibold">Kalan:</span> <span className="font-bold text-red-600">{formatCurrency(remaining)}</span></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Tutar (₺)</Label>
            <Input
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Ödeme Yöntemi</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Nakit</SelectItem>
                <SelectItem value="transfer">Havale / EFT</SelectItem>
                <SelectItem value="card">Kredi Kartı</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Notlar</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="İsteğe bağlı" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Kaydediliyor…' : 'Kaydet'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
