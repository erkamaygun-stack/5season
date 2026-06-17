'use client'
// useState ile onay/red modal ve resim önizleme gerekiyor

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatCurrency, formatDate } from '@/lib/utils'
import { approveReceipt, rejectReceipt } from './actions'
import { Check, X, ZoomIn } from 'lucide-react'

type Dekont = {
  id: string
  studentId: string
  studentName: string
  invoiceType: 'aidat' | 'equipment'
  invoiceId: string
  invoiceLabel: string
  invoiceAmount: number
  signedUrl: string | null
  createdAt: string
}

function ApproveModal({
  dekont,
  onClose,
}: {
  dekont: Dekont
  onClose: () => void
}) {
  const [amount, setAmount] = useState(String(dekont.invoiceAmount || ''))
  const [method, setMethod] = useState('transfer')
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleApprove(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseFloat(amount)
    if (!parsed || parsed <= 0) { toast.error('Geçerli bir tutar girin'); return }

    startTransition(async () => {
      try {
        await approveReceipt({ paymentId: dekont.id, amount: parsed, paymentMethod: method, notes: notes || undefined })
        toast.success('Dekont onaylandı, ödeme kaydedildi')
        onClose()
      } catch (err: any) {
        toast.error(err.message ?? 'Onaylanamadı')
      }
    })
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dekontu Onayla</DialogTitle>
        </DialogHeader>

        <div className="rounded-md bg-gray-50 p-4 text-sm space-y-1 mb-2">
          <p><span className="text-gray-500">Öğrenci:</span> <span className="font-medium">{dekont.studentName}</span></p>
          <p><span className="text-gray-500">Fatura:</span> {dekont.invoiceLabel}</p>
          <p><span className="text-gray-500">Fatura tutarı:</span> {formatCurrency(dekont.invoiceAmount)}</p>
        </div>

        {dekont.signedUrl && (
          <div className="mb-2">
            <a href={dekont.signedUrl} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={dekont.signedUrl}
                alt="Dekont"
                className="w-full max-h-48 object-contain rounded border cursor-zoom-in"
              />
            </a>
          </div>
        )}

        <form onSubmit={handleApprove} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Ödenen Tutar (₺)</Label>
            <Input
              type="number"
              min="0.01"
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
                <SelectItem value="other">Diğer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Not</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="İsteğe bağlı" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>İptal</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Kaydediliyor…' : 'Onayla ve Kaydet'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function DekontlarClient({ items }: { items: Dekont[] }) {
  const [approving, setApproving] = useState<Dekont | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleReject(dekont: Dekont) {
    if (!confirm(`${dekont.studentName} — ${dekont.invoiceLabel} için gönderilen dekont reddedilsin mi?`)) return
    setRejectingId(dekont.id)
    startTransition(async () => {
      try {
        await rejectReceipt(dekont.id)
        toast.success('Dekont reddedildi')
      } catch (err: any) {
        toast.error(err.message ?? 'Reddedilemedi')
      } finally {
        setRejectingId(null)
      }
    })
  }

  return (
    <>
      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="divide-y">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 px-5 py-4">
              {/* Küçük resim önizleme */}
              <div className="flex-shrink-0 w-16 h-16 rounded border overflow-hidden bg-gray-50">
                {item.signedUrl ? (
                  <a href={item.signedUrl} target="_blank" rel="noopener noreferrer" className="relative block w-full h-full group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.signedUrl} alt="Dekont" className="w-full h-full object-cover" />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ZoomIn className="w-4 h-4 text-white" />
                    </span>
                  </a>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">Yok</div>
                )}
              </div>

              {/* Bilgiler */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm">{item.studentName}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.invoiceLabel}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {item.invoiceType === 'aidat' ? 'Aidat' : 'Ekipman'}
                  </Badge>
                  <span className="text-xs text-gray-400">{formatCurrency(item.invoiceAmount)}</span>
                </div>
              </div>

              {/* Tarih */}
              <div className="text-xs text-gray-400 flex-shrink-0 hidden sm:block">
                {formatDate(item.createdAt)}
              </div>

              {/* Aksiyon butonları */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:border-red-300"
                  disabled={isPending && rejectingId === item.id}
                  onClick={() => handleReject(item)}
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Reddet
                </Button>
                <Button size="sm" onClick={() => setApproving(item)}>
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Onayla
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {approving && (
        <ApproveModal dekont={approving} onClose={() => setApproving(null)} />
      )}
    </>
  )
}
