'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatCurrency, formatDate, getMonthName, TR_MONTHS } from '@/lib/utils'
import { User, Phone, Pencil, Banknote } from 'lucide-react'
import { paySalary } from '@/app/(admin)/personel/actions'

const TYPE_LABEL: Record<string, string> = { coach: 'Antrenör', assistant: 'Asistan', other: 'Diğer' }
const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: 'Nakit',
  transfer: 'Havale / EFT',
  credit_card: 'Kredi Kartı',
}

interface StaffMember {
  id: string
  full_name: string
  staff_type: string
  monthly_salary: number | null
  hire_date: string | null
  is_active: boolean | null
  notes: string | null
  profile_id: string | null
  phone: string | null
}

interface Group {
  id: string
  name: string
  capacity: number | null
  is_active: boolean | null
}

interface SalaryPayment {
  id: string
  period_year: number
  period_month: number
  amount: number
  payment_method: string | null
  notes: string | null
  paid_at: string | null
}

// ============================================================================
// EDIT STAFF MODAL
// ============================================================================
function EditStaffModal({
  staff,
  open,
  onClose,
  onSuccess,
}: {
  staff: StaffMember
  open: boolean
  onClose: () => void
  onSuccess: (updated: Partial<StaffMember>) => void
}) {
  const [fullName, setFullName] = useState(staff.full_name)
  const [staffType, setStaffType] = useState(staff.staff_type)
  const [monthlySalary, setMonthlySalary] = useState(String(staff.monthly_salary ?? ''))
  const [isActive, setIsActive] = useState(staff.is_active ?? true)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) return
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('staff')
      .update({
        full_name: fullName.trim(),
        staff_type: staffType,
        monthly_salary: monthlySalary ? Number(monthlySalary) : null,
        is_active: isActive,
      } as any)
      .eq('id', staff.id)

    if (error) {
      toast.error('Kaydedilemedi: ' + error.message)
    } else {
      toast.success('Personel bilgileri güncellendi')
      onSuccess({
        full_name: fullName.trim(),
        staff_type: staffType,
        monthly_salary: monthlySalary ? Number(monthlySalary) : null,
        is_active: isActive,
      })
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Personel Bilgilerini Düzenle</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3 mt-1">
          <div className="space-y-1.5">
            <Label>Ad Soyad *</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Tip</Label>
            <Select value={staffType} onValueChange={setStaffType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="coach">Antrenör</SelectItem>
                <SelectItem value="assistant">Asistan</SelectItem>
                <SelectItem value="other">Diğer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Aylık Maaş (₺)</Label>
            <Input
              type="number"
              value={monthlySalary}
              onChange={(e) => setMonthlySalary(e.target.value)}
              min={0}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Durum</Label>
            <Select
              value={isActive ? 'active' : 'inactive'}
              onValueChange={(v) => setIsActive(v === 'active')}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Pasif</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Kaydediliyor…' : 'Kaydet'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// PAY SALARY MODAL
// ============================================================================
const now = new Date()

function PaySalaryModal({
  staff,
  open,
  onClose,
  onSuccess,
}: {
  staff: StaffMember
  open: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    period_year: String(now.getFullYear()),
    period_month: String(now.getMonth() + 1),
    amount: String(staff.monthly_salary ?? ''),
    payment_method: 'cash',
    notes: '',
  })

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.amount || Number(form.amount) <= 0) return

    startTransition(async () => {
      try {
        await paySalary({
          staff_id: staff.id,
          staff_name: staff.full_name,
          period_year: Number(form.period_year),
          period_month: Number(form.period_month),
          amount: Number(form.amount),
          payment_method: form.payment_method,
          notes: form.notes || undefined,
        })
        toast.success('Maaş ödeme kaydedildi')
        onSuccess()
      } catch (err: any) {
        toast.error('Hata: ' + (err?.message ?? 'Bilinmeyen hata'))
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Maaş Öde — {staff.full_name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Yıl</Label>
              <Input
                type="number"
                value={form.period_year}
                onChange={(e) => set('period_year', e.target.value)}
                min={2020}
                max={2030}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ay</Label>
              <Select value={form.period_month} onValueChange={(v) => set('period_month', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TR_MONTHS.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Tutar (₺) *</Label>
            <Input
              type="number"
              value={form.amount}
              onChange={(e) => set('amount', e.target.value)}
              min={1}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Ödeme Yöntemi</Label>
            <Select value={form.payment_method} onValueChange={(v) => set('payment_method', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Nakit</SelectItem>
                <SelectItem value="transfer">Havale / EFT</SelectItem>
                <SelectItem value="credit_card">Kredi Kartı</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Not</Label>
            <Input
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="isteğe bağlı"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Kaydediliyor…' : 'Öde'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// STAFF DETAIL
// ============================================================================
export default function StaffDetail({
  staff: initialStaff,
  groups,
  salaryPayments: initialPayments,
}: {
  staff: StaffMember
  groups: Group[]
  salaryPayments: SalaryPayment[]
}) {
  const router = useRouter()
  const [staff, setStaff] = useState(initialStaff)
  const [payments, setPayments] = useState(initialPayments)
  const [editModal, setEditModal] = useState(false)
  const [payModal, setPayModal] = useState(false)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="text-base">Personel Bilgileri</CardTitle>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditModal(true)}
                className="flex items-center gap-1.5"
              >
                <Pencil className="w-3.5 h-3.5" />
                Düzenle
              </Button>
              <Button
                size="sm"
                onClick={() => setPayModal(true)}
                className="flex items-center gap-1.5"
              >
                <Banknote className="w-3.5 h-3.5" />
                Maaş Öde
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <User className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="font-medium text-gray-700">{staff.full_name}</span>
            <Badge variant="outline">{TYPE_LABEL[staff.staff_type] ?? staff.staff_type}</Badge>
            <Badge variant={staff.is_active ? 'success' : 'secondary'}>
              {staff.is_active ? 'Aktif' : 'Pasif'}
            </Badge>
          </div>
          {staff.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-gray-400" />
              <span className="text-gray-700">+90 {staff.phone}</span>
            </div>
          )}
          <div className="pt-3 border-t flex items-center gap-6 text-sm text-gray-600 flex-wrap">
            <div>
              <span className="text-gray-500">Aylık Maaş: </span>
              <span className="font-semibold text-gray-900">{formatCurrency(staff.monthly_salary)}</span>
            </div>
            {staff.hire_date && (
              <div>
                <span className="text-gray-500">İşe Giriş: </span>
                <span>{formatDate(staff.hire_date)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Sorumlu Olduğu Gruplar ({groups.length})
        </h2>
        {groups.length === 0 ? (
          <div className="rounded-lg border bg-white p-6 text-center text-sm text-gray-500">
            Henüz grup atanmadı.
          </div>
        ) : (
          <div className="rounded-lg border bg-white overflow-hidden">
            <table className="min-w-full text-sm divide-y">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Grup</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Kapasite</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {groups.map((g) => (
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-700">{g.name}</td>
                    <td className="px-4 py-3 text-gray-600">{g.capacity ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={g.is_active ? 'success' : 'secondary'}>
                        {g.is_active ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Maaş Ödeme Geçmişi ({payments.length})
        </h2>
        {payments.length === 0 ? (
          <div className="rounded-lg border bg-white p-6 text-center text-sm text-gray-500">
            Henüz maaş ödemesi kaydedilmedi.
          </div>
        ) : (
          <div className="rounded-lg border bg-white overflow-hidden">
            <table className="min-w-full text-sm divide-y">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Dönem</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Tutar</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Yöntem</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Tarih</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Not</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">
                      {getMonthName(p.period_month)} {p.period_year}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {PAYMENT_METHOD_LABEL[p.payment_method ?? ''] ?? p.payment_method ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(p.paid_at)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EditStaffModal
        staff={staff}
        open={editModal}
        onClose={() => setEditModal(false)}
        onSuccess={(updated) => {
          setStaff((s) => ({ ...s, ...updated }))
          setEditModal(false)
          router.refresh()
        }}
      />
      <PaySalaryModal
        staff={staff}
        open={payModal}
        onClose={() => setPayModal(false)}
        onSuccess={() => {
          setPayModal(false)
          router.refresh()
        }}
      />
    </div>
  )
}
