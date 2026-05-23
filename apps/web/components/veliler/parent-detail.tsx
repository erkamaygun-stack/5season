'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhoneInput } from '@/components/ui/phone-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatCurrency, formatDate, getMonthName } from '@/lib/utils'
import { Phone, Mail, User, ChevronDown, ChevronUp, Smartphone, Pencil } from 'lucide-react'

interface AidatInvoice {
  id: string
  student_id: string
  period_year: number
  period_month: number
  amount: number
  paid_amount: number
  status: string
}

interface ParentStudentLink {
  relation: string | null
  is_primary: boolean | null
  students: {
    id: string
    full_name: string
    birth_date: string | null
    status: string
    has_received_uniform: boolean | null
    student_groups: Array<{
      is_active: boolean
      groups: { id: string; name: string } | null
    }>
  } | null
}

interface Props {
  parent: {
    id: string
    full_name: string
    phone: string | null
    email: string | null
    created_at: string
    parent_student: ParentStudentLink[]
  }
  debtByStudent: Record<string, AidatInvoice[]>
}

const STATUS_LABEL: Record<string, string> = { active: 'Aktif', trial: 'Deneme', inactive: 'Pasif' }
const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'secondary'> = {
  active: 'success',
  trial: 'warning',
  inactive: 'secondary',
}

function ChildCard({ ps, invoices }: { ps: ParentStudentLink; invoices: AidatInvoice[] }) {
  const [open, setOpen] = useState(false)
  const student = ps.students
  if (!student) return null

  const activeGroup = student.student_groups?.find((sg) => sg.is_active)
  const totalDebt = invoices.reduce(
    (sum, inv) => sum + Math.max(0, (inv.amount ?? 0) - (inv.paid_amount ?? 0)),
    0
  )

  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      <button
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <div>
            <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
              <Link
                href={`/ogrenciler/${student.id}`}
                className="text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {student.full_name}
              </Link>
              <Badge variant={STATUS_VARIANT[student.status] ?? 'secondary'}>
                {STATUS_LABEL[student.status] ?? student.status}
              </Badge>
              {ps.is_primary && <Badge variant="outline">Birincil</Badge>}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {activeGroup?.groups?.name ?? 'Grup atanmadı'} · {ps.relation ?? 'Veli'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-3">
          <span className={`text-sm font-semibold ${totalDebt > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {totalDebt > 0 ? formatCurrency(totalDebt) : 'Borçsuz'}
          </span>
          {open ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {open && (
        <div className="border-t px-4 py-3 bg-gray-50">
          {invoices.length === 0 ? (
            <p className="text-sm text-gray-500 py-1">Bekleyen borç yok.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500">
                  <th className="pb-2 text-left font-medium">Dönem</th>
                  <th className="pb-2 text-right font-medium">Tutar</th>
                  <th className="pb-2 text-right font-medium">Ödenen</th>
                  <th className="pb-2 text-right font-medium">Kalan</th>
                  <th className="pb-2 text-left font-medium pl-3">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoices.map((inv) => {
                  const remaining = Math.max(0, (inv.amount ?? 0) - (inv.paid_amount ?? 0))
                  return (
                    <tr key={inv.id}>
                      <td className="py-1.5 text-gray-700">
                        {getMonthName(inv.period_month)} {inv.period_year}
                      </td>
                      <td className="py-1.5 text-right text-gray-700">{formatCurrency(inv.amount)}</td>
                      <td className="py-1.5 text-right text-green-600">{formatCurrency(inv.paid_amount)}</td>
                      <td className="py-1.5 text-right font-medium text-red-600">{formatCurrency(remaining)}</td>
                      <td className="py-1.5 pl-3">
                        <Badge variant={inv.status === 'partial' ? 'warning' : 'secondary'}>
                          {inv.status === 'partial' ? 'Kısmi' : 'Bekliyor'}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// EDIT PARENT MODAL
// ============================================================================
function EditParentModal({
  parentId,
  open,
  initialValues,
  onClose,
  onSuccess,
}: {
  parentId: string
  open: boolean
  initialValues: { full_name: string; phone: string; email: string }
  onClose: () => void
  onSuccess: (updated: { full_name: string; phone: string; email: string }) => void
}) {
  const [fullName, setFullName] = useState(initialValues.full_name)
  const [phone, setPhone] = useState(initialValues.phone)
  const [email, setEmail] = useState(initialValues.email)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim() || !phone.trim()) return
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), phone: phone.trim(), email: email.trim() || null } as any)
      .eq('id', parentId)
    if (error) {
      toast.error('Kaydedilemedi: ' + error.message)
    } else {
      toast.success('Veli bilgileri güncellendi')
      onSuccess({ full_name: fullName.trim(), phone: phone.trim(), email: email.trim() })
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Veli Bilgilerini Düzenle</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3 mt-1">
          <div className="space-y-1.5">
            <Label>Ad Soyad *</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Telefon *</Label>
            <PhoneInput
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="5xxxxxxxxx"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>E-posta</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="isteğe bağlı"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              İptal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Kaydediliyor…' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// PARENT DETAIL
// ============================================================================
export default function ParentDetail({ parent, debtByStudent }: Props) {
  const router = useRouter()
  const [editModal, setEditModal] = useState(false)
  const [info, setInfo] = useState({
    full_name: parent.full_name,
    phone: parent.phone ?? '',
    email: parent.email ?? '',
  })

  const totalDebt = Object.values(debtByStudent)
    .flat()
    .reduce((sum, inv) => sum + Math.max(0, (inv.amount ?? 0) - (inv.paid_amount ?? 0)), 0)

  function handleInvite() {
    toast.info('SMS davet henüz aktif değil. WhatsApp entegrasyonu onaylandığında etkinleştirilecek.')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="text-base">Veli Bilgileri</CardTitle>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => setEditModal(true)} className="flex items-center gap-1.5">
                <Pencil className="w-3.5 h-3.5" />
                Düzenle
              </Button>
              <Button variant="outline" size="sm" onClick={handleInvite} className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" />
                Davet Et
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-gray-700 font-medium">{info.full_name}</span>
          </div>
          {info.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-gray-400" />
              <span className="text-gray-700">{info.phone}</span>
            </div>
          )}
          {info.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="text-gray-700">{info.email}</span>
            </div>
          )}
          <div className="pt-3 border-t flex items-center justify-between">
            <span className="text-xs text-gray-500">Kayıt: {formatDate(parent.created_at)}</span>
            <div className="text-sm">
              Toplam Borç:{' '}
              <span className={`font-semibold ${totalDebt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {totalDebt > 0 ? formatCurrency(totalDebt) : 'Borçsuz'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Bağlı Çocuklar ({parent.parent_student.length})
        </h2>
        <div className="space-y-2">
          {parent.parent_student.length === 0 ? (
            <div className="rounded-lg border bg-white p-8 text-center text-sm text-gray-500">
              Bu veliye bağlı öğrenci bulunamadı.
            </div>
          ) : (
            parent.parent_student.map((ps, i) => (
              <ChildCard
                key={ps.students?.id ?? i}
                ps={ps}
                invoices={debtByStudent[ps.students?.id ?? ''] ?? []}
              />
            ))
          )}
        </div>
      </div>

      <EditParentModal
        parentId={parent.id}
        open={editModal}
        initialValues={info}
        onClose={() => setEditModal(false)}
        onSuccess={(updated) => {
          setInfo(updated)
          setEditModal(false)
          router.refresh()
        }}
      />
    </div>
  )
}
