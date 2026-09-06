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
import { approveReceipt, matchReceipt, rejectReceipt, retryReceiptCleanup } from './actions'
import { AlertTriangle, Check, Link2, RefreshCw, X, ZoomIn } from 'lucide-react'

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
  guardianName: string
  guardianPhoneMasked: string
}

type AttentionItem = {
  id: string
  status: string
  reason: string | null
  guardianName: string
  signedUrl: string | null
  createdAt: string
}

type CleanupItem = {
  id: string
  decision: string
  error: string | null
  attempts: number
}

type InvoiceOption = {
  id: string
  invoiceType: 'aidat' | 'equipment'
  label: string
  studentName: string
  remainingAmount: number
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
        await approveReceipt({ submissionId: dekont.id, amount: parsed, paymentMethod: method, notes: notes || undefined })
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

        <div className="rounded-md bg-muted/50 p-4 text-sm space-y-1 mb-2">
          <p><span className="text-muted-foreground">Öğrenci:</span> <span className="font-medium">{dekont.studentName}</span></p>
          <p><span className="text-muted-foreground">Veli:</span> {dekont.guardianName} · {dekont.guardianPhoneMasked}</p>
          <p><span className="text-muted-foreground">Fatura:</span> {dekont.invoiceLabel}</p>
          <p><span className="text-muted-foreground">Fatura tutarı:</span> {formatCurrency(dekont.invoiceAmount)}</p>
        </div>

        {dekont.signedUrl && (
          <div className="mb-2">
            <a href={dekont.signedUrl} target="_blank" rel="noopener noreferrer">
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

export default function DekontlarClient({
  items,
  attentionItems = [],
  cleanupItems = [],
  invoiceOptions = [],
}: {
  items: Dekont[]
  attentionItems?: AttentionItem[]
  cleanupItems?: CleanupItem[]
  invoiceOptions?: InvoiceOption[]
}) {
  const [approving, setApproving] = useState<Dekont | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [selectedInvoices, setSelectedInvoices] = useState<Record<string, string>>({})

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

  function handleMatch(item: AttentionItem) {
    const selected = selectedInvoices[item.id]
    const option = invoiceOptions.find((candidate) => `${candidate.invoiceType}:${candidate.id}` === selected)
    if (!option) { toast.error('Öğrenci ve borç seçin'); return }
    startTransition(async () => {
      try {
        await matchReceipt({ submissionId: item.id, invoiceType: option.invoiceType, invoiceId: option.id })
        toast.success('Dekont inceleme kuyruğuna alındı')
      } catch (err: any) {
        toast.error(err.message ?? 'Dekont eşleştirilemedi')
      }
    })
  }

  function handleCleanupRetry(item: CleanupItem) {
    startTransition(async () => {
      try {
        await retryReceiptCleanup(item.id)
        toast.success('Dosya temizliği yeniden sıraya alındı')
      } catch (err: any) {
        toast.error(err.message ?? 'Yeniden sıraya alınamadı')
      }
    })
  }

  return (
    <>
      {attentionItems.length > 0 && (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50/60 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-amber-200 text-sm font-medium text-amber-900">
            <AlertTriangle className="w-4 h-4" />
            Manuel eşleme gereken dekontlar ({attentionItems.length})
          </div>
          <div className="divide-y divide-amber-200">
            {attentionItems.map((item) => (
              <div key={item.id} className="p-4 grid gap-3 md:grid-cols-[1fr_2fr_auto] md:items-center">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.guardianName}</p>
                  <p className="text-xs text-muted-foreground">{item.reason ?? item.status} · {formatDate(item.createdAt)}</p>
                  {item.signedUrl && <a className="text-xs text-primary hover:underline" href={item.signedUrl} target="_blank" rel="noreferrer">Görseli aç</a>}
                </div>
                <Select
                  value={selectedInvoices[item.id]}
                  onValueChange={(value) => setSelectedInvoices((current) => ({ ...current, [item.id]: value }))}
                >
                  <SelectTrigger><SelectValue placeholder="Öğrenci ve açık borç seçin" /></SelectTrigger>
                  <SelectContent>
                    {invoiceOptions.map((option) => (
                      <SelectItem key={`${option.invoiceType}:${option.id}`} value={`${option.invoiceType}:${option.id}`}>
                        {option.studentName} · {option.label} · {formatCurrency(option.remainingAmount)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={() => handleMatch(item)} disabled={isPending}>
                  <Link2 className="w-3.5 h-3.5 mr-1" /> Eşleştir
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {cleanupItems.length > 0 && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50/60 overflow-hidden">
          <div className="px-5 py-3 border-b border-red-200 text-sm font-medium text-red-900">
            Temizlenemeyen dosyalar ({cleanupItems.length})
          </div>
          <div className="divide-y divide-red-200">
            {cleanupItems.map((item) => (
              <div key={item.id} className="px-5 py-3 flex items-center justify-between gap-3 text-sm">
                <span>{item.decision === 'approved' ? 'Onaylanan' : 'Reddedilen'} dekont · {item.attempts} deneme · {item.error ?? 'Bilinmeyen hata'}</span>
                <Button size="sm" variant="outline" onClick={() => handleCleanupRetry(item)} disabled={isPending}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> Yeniden Dene
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-card overflow-hidden">
        {items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Onay bekleyen dekont yok.</div>
        ) : <div className="divide-y">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 px-5 py-4">
              {/* Küçük resim önizleme */}
              <div className="flex-shrink-0 w-16 h-16 rounded border overflow-hidden bg-muted/50">
                {item.signedUrl ? (
                  <a href={item.signedUrl} target="_blank" rel="noopener noreferrer" className="relative block w-full h-full group">
                    <img src={item.signedUrl} alt="Dekont" className="w-full h-full object-cover" />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ZoomIn className="w-4 h-4 text-white" />
                    </span>
                  </a>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">Yok</div>
                )}
              </div>

              {/* Bilgiler */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm">{item.studentName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.invoiceLabel}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {item.invoiceType === 'aidat' ? 'Aidat' : 'Ekipman'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{formatCurrency(item.invoiceAmount)}</span>
                </div>
              </div>

              {/* Tarih */}
              <div className="text-xs text-muted-foreground flex-shrink-0 hidden sm:block">
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
        </div>}
      </div>

      {approving && (
        <ApproveModal dekont={approving} onClose={() => setApproving(null)} />
      )}
    </>
  )
}
