'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatCurrency, formatDate, getMonthName } from '@/lib/utils'
import { Pencil, Smartphone, Trash2 } from 'lucide-react'
import { deleteParent } from '@/app/(admin)/veliler/actions'

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
    student_groups: Array<{ is_active: boolean; groups: { id: string; name: string } | null }>
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
            <PhoneInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="5xxxxxxxxx" required />
          </div>
          <div className="space-y-1.5">
            <Label>E-posta</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="isteğe bağlı" />
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
// PARENT DETAIL TABS
// ============================================================================
export default function ParentDetailTabs({ parent, debtByStudent }: Props) {
  const router = useRouter()
  const [editModal, setEditModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [info, setInfo] = useState({
    full_name: parent.full_name,
    phone: parent.phone ?? '',
    email: parent.email ?? '',
  })

  const totalDebt = Object.values(debtByStudent)
    .flat()
    .reduce((sum, inv) => sum + Math.max(0, (inv.amount ?? 0) - (inv.paid_amount ?? 0)), 0)

  const allInvoices = parent.parent_student.flatMap((ps) => {
    const student = ps.students
    if (!student) return []
    return (debtByStudent[student.id] ?? []).map((inv) => ({ ...inv, studentName: student.full_name }))
  })

  function handleInvite() {
    toast.info('SMS davet henüz aktif değil. WhatsApp entegrasyonu onaylandığında etkinleştirilecek.')
  }

  async function handleDelete() {
    if (!confirm(`${info.full_name} kalıcı olarak silinsin mi? Bu işlem geri alınamaz.`)) return
    setDeleting(true)
    try {
      await deleteParent(parent.id)
      router.push('/veliler')
    } catch (err: any) {
      toast.error(err.message ?? 'Silinemedi')
      setDeleting(false)
    }
  }

  return (
    <>
      <Tabs defaultValue="genel" className="w-full">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="genel">Genel</TabsTrigger>
          <TabsTrigger value="cocuklar">
            Çocuklar ({parent.parent_student.length})
          </TabsTrigger>
          <TabsTrigger value="borclar">
            Borçlar {allInvoices.length > 0 && `(${allInvoices.length})`}
          </TabsTrigger>
        </TabsList>

        {/* ── GENEL ─────────────────────────────────────────────────────────── */}
        <TabsContent value="genel">
          <div className="rounded-lg border bg-white overflow-hidden">
            <div className="flex items-center justify-between px-6 py-3 border-b bg-gray-50">
              <span className="text-sm font-medium text-gray-700">Genel Bilgiler</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditModal(true)}>
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  Düzenle
                </Button>
                <Button size="sm" variant="outline" onClick={handleInvite}>
                  <Smartphone className="w-3.5 h-3.5 mr-1.5" />
                  Davet Et
                </Button>
                <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleting}>
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  {deleting ? 'Siliniyor…' : 'Profili Sil'}
                </Button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {([
                  ['Ad Soyad', info.full_name],
                  ['Telefon', info.phone ? `+90 ${info.phone}` : '—'],
                  ['E-posta', info.email || '—'],
                  ['Kayıt Tarihi', formatDate(parent.created_at)],
                  ['Toplam Borç', totalDebt > 0 ? formatCurrency(totalDebt) : 'Borçsuz'],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-gray-500">{label}</p>
                    <p
                      className={`font-medium mt-0.5 ${
                        label === 'Toplam Borç' && totalDebt > 0
                          ? 'text-red-600'
                          : label === 'Toplam Borç'
                          ? 'text-green-600'
                          : 'text-gray-900'
                      }`}
                    >
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── ÇOCUKLAR ──────────────────────────────────────────────────────── */}
        <TabsContent value="cocuklar">
          <div className="rounded-lg border bg-white overflow-hidden">
            <div className="px-6 py-3 border-b bg-gray-50">
              <span className="text-sm font-medium text-gray-700">Bağlı Çocuklar</span>
            </div>
            {parent.parent_student.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">Bu veliye bağlı öğrenci bulunamadı.</div>
            ) : (
              <table className="min-w-full text-sm divide-y">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Ad Soyad</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Grup</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Yakınlık</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Durum</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Borç</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {parent.parent_student.map((ps, i) => {
                    const student = ps.students
                    if (!student) return null
                    const activeGroup = student.student_groups?.find((sg) => sg.is_active)
                    const debt = (debtByStudent[student.id] ?? []).reduce(
                      (s, inv) => s + Math.max(0, (inv.amount ?? 0) - (inv.paid_amount ?? 0)),
                      0
                    )
                    return (
                      <tr key={student.id ?? i} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link href={`/ogrenciler/${student.id}`} className="font-medium text-primary hover:underline">
                              {student.full_name}
                            </Link>
                            {ps.is_primary && <Badge variant="outline" className="text-xs">Birincil</Badge>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {activeGroup?.groups?.name ?? <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{ps.relation ?? 'Veli'}</td>
                        <td className="px-4 py-3">
                          <Badge variant={STATUS_VARIANT[student.status] ?? 'secondary'}>
                            {STATUS_LABEL[student.status] ?? student.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          <span className={debt > 0 ? 'text-red-600' : 'text-green-600'}>
                            {debt > 0 ? formatCurrency(debt) : 'Borçsuz'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        {/* ── BORÇLAR ───────────────────────────────────────────────────────── */}
        <TabsContent value="borclar">
          <div className="rounded-lg border bg-white overflow-hidden">
            <div className="px-6 py-3 border-b bg-gray-50">
              <span className="text-sm font-medium text-gray-700">Bekleyen Borçlar</span>
            </div>
            {allInvoices.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">Bekleyen borç yok.</div>
            ) : (
              <table className="min-w-full text-sm divide-y">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Öğrenci</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Dönem</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Tutar</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Ödenen</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Kalan</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 pl-3">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {allInvoices.map((inv) => {
                    const remaining = Math.max(0, (inv.amount ?? 0) - (inv.paid_amount ?? 0))
                    return (
                      <tr key={inv.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700 font-medium">{inv.studentName}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {getMonthName(inv.period_month)} {inv.period_year}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(inv.amount)}</td>
                        <td className="px-4 py-3 text-right text-green-600">{formatCurrency(inv.paid_amount)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-red-600">{formatCurrency(remaining)}</td>
                        <td className="px-4 py-3 pl-3">
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
        </TabsContent>
      </Tabs>

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
    </>
  )
}
