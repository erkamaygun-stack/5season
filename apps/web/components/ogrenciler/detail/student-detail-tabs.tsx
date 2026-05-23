'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatDate, formatCurrency, getMonthName } from '@/lib/utils'
import { Upload, Plus, Trash2, UserPlus, Download, ChevronLeft, ChevronRight, Pencil } from 'lucide-react'

interface Props {
  student: any
  attendance: any[]
  aidatInvoices: any[]
  equipmentInvoices: any[]
  payments: any[]
  groups: Array<{ id: string; name: string }>
}

const DAYS_TR = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']
const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

export default function StudentDetailTabs({
  student,
  attendance,
  aidatInvoices,
  equipmentInvoices,
  payments,
  groups,
}: Props) {
  const router = useRouter()
  const [notes, setNotes] = useState<string>(student.notes ?? '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear())
  const [paymentModal, setPaymentModal] = useState<any | null>(null)
  const [addParentModal, setAddParentModal] = useState(false)
  const [addGroupModal, setAddGroupModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [signingDoc, setSigningDoc] = useState<string | null>(null)
  const [parents, setParents] = useState<any[]>(student.parent_student ?? [])
  const [studentGroups, setStudentGroups] = useState<any[]>(student.student_groups ?? [])

  const activeGroup = studentGroups.find((sg: any) => sg.is_active)

  // ── Notes ────────────────────────────────────────────────────────────────
  async function saveNotes() {
    setSavingNotes(true)
    const supabase = createClient()
    const { error } = await supabase.from('students').update({ notes } as any).eq('id', student.id)
    if (error) toast.error('Notlar kaydedilemedi')
    else toast.success('Notlar kaydedildi')
    setSavingNotes(false)
  }

  // ── Document upload ───────────────────────────────────────────────────────
  const BUCKET: Record<'health_doc_url' | 'consent_doc_url', string> = {
    health_doc_url: 'health-docs',
    consent_doc_url: 'consent-docs',
  }

  async function uploadDoc(field: 'health_doc_url' | 'consent_doc_url', file: File) {
    const supabase = createClient()
    const bucket = BUCKET[field]
    const ext = file.name.split('.').pop()
    const path = `${student.id}/${field}_${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
    if (uploadError) { toast.error('Dosya yüklenemedi: ' + uploadError.message); return }
    // DB'ye path kaydediyoruz; URL değil — görüntüleme sırasında signed URL üretilecek
    const { error: updateError } = await supabase.from('students').update({ [field]: path } as any).eq('id', student.id)
    if (updateError) toast.error('Kayıt güncellenemedi')
    else { toast.success('Dosya yüklendi'); router.refresh() }
  }

  async function deleteDoc(field: 'health_doc_url' | 'consent_doc_url') {
    const path = student[field]
    if (!path) return
    if (!confirm('Dosya kalıcı olarak silinsin mi?')) return
    const supabase = createClient()
    const { error: removeError } = await supabase.storage.from(BUCKET[field]).remove([path])
    if (removeError) { toast.error('Dosya silinemedi: ' + removeError.message); return }
    const { error: updateError } = await supabase.from('students').update({ [field]: null } as any).eq('id', student.id)
    if (updateError) toast.error('Kayıt güncellenemedi')
    else { toast.success('Dosya kaldırıldı'); router.refresh() }
  }

  async function viewDoc(field: 'health_doc_url' | 'consent_doc_url') {
    const path = student[field]
    if (!path) return
    setSigningDoc(field)
    const supabase = createClient()
    const { data, error } = await supabase.storage.from(BUCKET[field]).createSignedUrl(path, 3600)
    if (error || !data?.signedUrl) {
      toast.error('Dosya açılamadı: ' + (error?.message ?? 'Bilinmeyen hata'))
    } else {
      window.open(data.signedUrl, '_blank')
    }
    setSigningDoc(null)
  }

  // ── Parent management ─────────────────────────────────────────────────────
  async function removeParent(parentProfileId: string, parentName: string) {
    if (!confirm(`${parentName} veli bağlantısı kaldırılsın mı?`)) return
    const supabase = createClient()
    const { error } = await supabase
      .from('parent_student')
      .delete()
      .eq('parent_profile_id', parentProfileId)
      .eq('student_id', student.id)
    if (error) toast.error('Veli kaldırılamadı')
    else {
      toast.success('Veli kaldırıldı')
      setParents((prev) => prev.filter((p: any) => p.parent_profile_id !== parentProfileId))
    }
  }

  // ── Group management ──────────────────────────────────────────────────────
  async function leaveGroup(sgId: string, groupName: string) {
    if (!confirm(`${groupName} grubundan çıkarılsın mı?`)) return
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]
    const { error } = await supabase
      .from('student_groups')
      .update({ is_active: false, left_at: today } as any)
      .eq('id', sgId)
    if (error) toast.error('İşlem başarısız')
    else {
      toast.success(`${groupName} grubundan çıkarıldı`)
      setStudentGroups((prev) =>
        prev.map((sg: any) => sg.id === sgId ? { ...sg, is_active: false, left_at: today } : sg)
      )
    }
  }

  // ── Attendance helpers ────────────────────────────────────────────────────
  const attendanceByDate: Record<string, string> = {}
  for (const ar of attendance) {
    const date = ar.attendance_sessions?.session_date
    if (date) attendanceByDate[date] = ar.status
  }
  const attendanceByMonth: Record<string, Array<{ date: string; status: string }>> = {}
  for (const date of Object.keys(attendanceByDate).sort().reverse()) {
    const key = date.slice(0, 7)
    if (!attendanceByMonth[key]) attendanceByMonth[key] = []
    attendanceByMonth[key].push({ date, status: attendanceByDate[date] })
  }

  return (
    <>
      <Tabs defaultValue="genel" className="w-full">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="genel">Genel</TabsTrigger>
          <TabsTrigger value="veliler">Veliler</TabsTrigger>
          <TabsTrigger value="gruplar">Gruplar</TabsTrigger>
          <TabsTrigger value="yoklama">Yoklama Geçmişi</TabsTrigger>
          <TabsTrigger value="aidat">Aidat</TabsTrigger>
          <TabsTrigger value="forma">Forma / Eşofman</TabsTrigger>
          <TabsTrigger value="odemeler">Ödeme Geçmişi</TabsTrigger>
          <TabsTrigger value="notlar">Notlar</TabsTrigger>
        </TabsList>

        {/* ── GENEL ─────────────────────────────────────────────────────── */}
        <TabsContent value="genel">
          <div className="rounded-lg border bg-white overflow-hidden">
            <div className="flex items-center justify-between px-6 py-3 border-b bg-gray-50">
              <span className="text-sm font-medium text-gray-700">Genel Bilgiler</span>
              <Button size="sm" variant="outline" onClick={() => setEditModal(true)}>
                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                Düzenle
              </Button>
            </div>
            <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {([
                ['Ad Soyad', student.full_name],
                ['Doğum Tarihi', formatDate(student.birth_date)],
                ['Cinsiyet', student.gender === 'M' ? 'Erkek' : student.gender === 'F' ? 'Kız' : '-'],
                ['Kan Grubu', student.blood_type ?? '-'],
                ['Kayıt Tarihi', formatDate(student.enrollment_date)],
                ['Durum', student.status === 'active' ? 'Aktif' : student.status === 'trial' ? 'Deneme' : 'Pasif'],
                ['Aktif Grup', activeGroup?.groups?.name ?? '-'],
                ['Forma', student.has_received_uniform ? 'Alındı' : 'Alınmadı'],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="font-medium text-gray-900 mt-0.5">{value}</p>
                </div>
              ))}
            </div>

            <div className="border-t pt-5 space-y-3">
              <p className="text-sm font-semibold text-gray-700">Belgeler</p>
              <div className="flex flex-wrap gap-3">
                {(
                  [
                    { field: 'health_doc_url', label: 'Sağlık Dosyası' },
                    { field: 'consent_doc_url', label: 'Veli İzin Formu' },
                  ] as const
                ).map(({ field, label }) => (
                  <div key={field} className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50 min-w-[240px]">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">{label}</p>
                      {student[field] ? (
                        <div className="flex items-center gap-2 mt-0.5">
                          <button
                            type="button"
                            onClick={() => viewDoc(field)}
                            disabled={signingDoc === field}
                            className="text-sm text-primary hover:underline disabled:opacity-50"
                          >
                            {signingDoc === field ? 'Açılıyor…' : 'Görüntüle'}
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            type="button"
                            onClick={() => deleteDoc(field)}
                            className="text-sm text-red-500 hover:underline"
                          >
                            Kaldır
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">Yüklenmedi</p>
                      )}
                    </div>
                    <label className="cursor-pointer shrink-0">
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDoc(field, f) }}
                      />
                      <Button variant="outline" size="sm" asChild>
                        <span>
                          <Upload className="w-3.5 h-3.5 mr-1.5" />
                          Yükle
                        </span>
                      </Button>
                    </label>
                  </div>
                ))}
              </div>
            </div>
            </div>
          </div>
        </TabsContent>

        {/* ── VELİLER ───────────────────────────────────────────────────── */}
        <TabsContent value="veliler">
          <div className="rounded-lg border bg-white overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
              <span className="text-sm font-medium text-gray-700">Bağlı Veliler</span>
              <Button size="sm" onClick={() => setAddParentModal(true)}>
                <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                Veli Ekle
              </Button>
            </div>
            {parents.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">Veli kaydı yok.</p>
            ) : (
              <table className="min-w-full text-sm divide-y">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Ad Soyad</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Telefon</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Yakınlık</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Birincil</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {parents.map((ps: any) => (
                    <tr key={ps.parent_profile_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{ps.profiles?.full_name ?? '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{ps.profiles?.phone ?? '-'}</td>
                      <td className="px-4 py-3 text-gray-600 capitalize">{ps.relation ?? '-'}</td>
                      <td className="px-4 py-3">
                        {ps.is_primary ? <Badge variant="success">Birincil</Badge> : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => removeParent(ps.parent_profile_id, ps.profiles?.full_name ?? 'Veli')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        {/* ── GRUPLAR ───────────────────────────────────────────────────── */}
        <TabsContent value="gruplar">
          <div className="rounded-lg border bg-white overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
              <span className="text-sm font-medium text-gray-700">Grup Atamaları</span>
              <Button size="sm" onClick={() => setAddGroupModal(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Gruba Ekle
              </Button>
            </div>
            <table className="min-w-full text-sm divide-y">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Grup</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Başlangıç</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Bitiş</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Durum</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {studentGroups.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-400 text-sm">
                      Grup ataması yok.
                    </td>
                  </tr>
                ) : studentGroups.map((sg: any) => (
                  <tr key={sg.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{sg.groups?.name}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(sg.joined_at)}</td>
                    <td className="px-4 py-3 text-gray-600">{sg.left_at ? formatDate(sg.left_at) : '-'}</td>
                    <td className="px-4 py-3">
                      {sg.is_active
                        ? <Badge variant="success">Aktif</Badge>
                        : <Badge variant="secondary">Geçmiş</Badge>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {sg.is_active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => leaveGroup(sg.id, sg.groups?.name ?? 'Grup')}
                        >
                          Çıkar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── YOKLAMA ───────────────────────────────────────────────────── */}
        <TabsContent value="yoklama">
          <div className="rounded-lg border bg-white p-4 space-y-5">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-green-200 inline-block" />Katıldı
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-red-200 inline-block" />Gelmedi
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-yellow-200 inline-block" />İzinli
              </span>
            </div>
            {Object.keys(attendanceByMonth).length === 0 ? (
              <p className="text-sm text-gray-400">Son 90 günde yoklama kaydı yok.</p>
            ) : (
              Object.entries(attendanceByMonth).map(([monthKey, records]) => {
                const [year, month] = monthKey.split('-')
                return (
                  <div key={monthKey}>
                    <p className="text-xs font-semibold text-gray-500 mb-2">
                      {MONTHS_TR[parseInt(month) - 1]} {year}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {records.map(({ date, status }) => {
                        const d = new Date(date + 'T12:00:00')
                        return (
                          <div
                            key={date}
                            title={date}
                            className={`flex flex-col items-center justify-center w-11 h-11 rounded-lg text-xs font-medium border ${
                              status === 'present'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : status === 'absent'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                            }`}
                          >
                            <span className="text-[10px] opacity-70">{DAYS_TR[d.getDay()]}</span>
                            <span className="font-bold">{d.getDate()}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </TabsContent>

        {/* ── AİDAT ─────────────────────────────────────────────────────── */}
        <TabsContent value="aidat">
          <div className="rounded-lg border bg-white overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b bg-gray-50">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setCurrentYear((y) => y - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-semibold text-sm min-w-[3.5rem] text-center">{currentYear}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setCurrentYear((y) => y + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <table className="min-w-full text-sm divide-y">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Ay</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Tutar</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Ödenen</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Durum</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Vade</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                  const inv = aidatInvoices.find(
                    (a: any) => a.period_year === currentYear && a.period_month === month
                  )
                  if (!inv) {
                    return (
                      <tr key={month} className="text-gray-300">
                        <td className="px-4 py-2.5">{MONTHS_TR[month - 1]}</td>
                        <td className="px-4 py-2.5">—</td>
                        <td className="px-4 py-2.5">—</td>
                        <td className="px-4 py-2.5">—</td>
                        <td className="px-4 py-2.5">—</td>
                        <td className="px-4 py-2.5" />
                      </tr>
                    )
                  }
                  return (
                    <tr key={month} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium">
                        {MONTHS_TR[month - 1]}{inv.is_prorated ? ' ½' : ''}
                      </td>
                      <td className="px-4 py-2.5">{formatCurrency(inv.amount)}</td>
                      <td className="px-4 py-2.5">{formatCurrency(inv.paid_amount ?? 0)}</td>
                      <td className="px-4 py-2.5">
                        <Badge
                          variant={
                            inv.status === 'paid'
                              ? 'success'
                              : inv.status === 'partial'
                              ? 'warning'
                              : 'destructive'
                          }
                        >
                          {inv.status === 'paid' ? 'Ödendi' : inv.status === 'partial' ? 'Kısmi' : 'Bekliyor'}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{formatDate(inv.due_date)}</td>
                      <td className="px-4 py-2.5 text-center">
                        {inv.status !== 'paid' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => setPaymentModal(inv)}
                          >
                            Ödeme Al
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── FORMA / EŞOFMAN ───────────────────────────────────────────── */}
        <TabsContent value="forma">
          <div className="rounded-lg border bg-white overflow-hidden">
            {equipmentInvoices.length === 0 ? (
              <p className="p-6 text-sm text-gray-400">Forma / eşofman kaydı yok.</p>
            ) : (
              <table className="min-w-full text-sm divide-y">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Açıklama</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Tutar</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Ödenen</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Ödeme</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Teslim</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Teslim Tarihi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {equipmentInvoices.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{inv.description ?? 'Forma'}</td>
                      <td className="px-4 py-3">{formatCurrency(inv.amount)}</td>
                      <td className="px-4 py-3">{formatCurrency(inv.paid_amount ?? 0)}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            inv.status === 'paid'
                              ? 'success'
                              : inv.status === 'partial'
                              ? 'warning'
                              : 'destructive'
                          }
                        >
                          {inv.status === 'paid' ? 'Ödendi' : inv.status === 'partial' ? 'Kısmi' : 'Bekliyor'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {inv.delivered
                          ? <Badge variant="success">Teslim Edildi</Badge>
                          : <Badge variant="secondary">Teslim Edilmedi</Badge>}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {inv.delivered_at ? formatDate(inv.delivered_at) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        {/* ── ÖDEME GEÇMİŞİ ─────────────────────────────────────────────── */}
        <TabsContent value="odemeler">
          <div className="rounded-lg border bg-white overflow-hidden">
            {payments.length === 0 ? (
              <p className="p-6 text-sm text-gray-400">Ödeme kaydı yok.</p>
            ) : (
              <table className="min-w-full text-sm divide-y">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Tarih</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Tutar</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Yöntem</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Tür</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Not</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600">Dekont</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{formatDate(p.payment_date)}</td>
                      <td className="px-4 py-3 font-medium">{formatCurrency(p.amount)}</td>
                      <td className="px-4 py-3 text-gray-600 capitalize">{p.payment_method ?? '-'}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {p.invoice_type === 'aidat'
                          ? 'Aidat'
                          : p.invoice_type === 'equipment'
                          ? 'Forma'
                          : p.invoice_type ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{p.notes ?? '—'}</td>
                      <td className="px-4 py-3 text-center">
                        {p.receipt_url ? (
                          <a href={p.receipt_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Dekont İndir">
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                          </a>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        {/* ── NOTLAR / AUDİT ────────────────────────────────────────────── */}
        <TabsContent value="notlar">
          <div className="rounded-lg border bg-white p-6 space-y-4">
            <p className="text-sm font-semibold text-gray-700">Notlar</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
              placeholder="Öğrenci hakkında notlar…"
            />
            <div className="flex justify-end">
              <Button onClick={saveNotes} disabled={savingNotes}>
                {savingNotes ? 'Kaydediliyor…' : 'Kaydet'}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      <AidatPaymentModal
        invoice={paymentModal}
        studentId={student.id}
        onClose={() => setPaymentModal(null)}
        onSuccess={() => { setPaymentModal(null); router.refresh() }}
      />
      <AddParentModal
        studentId={student.id}
        open={addParentModal}
        onClose={() => setAddParentModal(false)}
        onSuccess={(p) => { setParents((prev) => [...prev, p]); setAddParentModal(false) }}
      />
      <AddGroupModal
        studentId={student.id}
        groups={groups}
        activeGroupIds={studentGroups.filter((sg: any) => sg.is_active).map((sg: any) => sg.groups?.id).filter(Boolean)}
        open={addGroupModal}
        onClose={() => setAddGroupModal(false)}
        onSuccess={(sg) => { setStudentGroups((prev) => [...prev, sg]); setAddGroupModal(false) }}
      />
      <EditStudentModal
        student={student}
        open={editModal}
        onClose={() => setEditModal(false)}
        onSuccess={() => { setEditModal(false); router.refresh() }}
      />
    </>
  )
}

// ============================================================================
// AIDAT PAYMENT MODAL
// ============================================================================
function AidatPaymentModal({
  invoice,
  studentId,
  onClose,
  onSuccess,
}: {
  invoice: any | null
  studentId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('nakit')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (invoice) {
      setAmount(String(Math.max(0, (invoice.amount ?? 0) - (invoice.paid_amount ?? 0))))
      setMethod('nakit')
      setNotes('')
    }
  }, [invoice?.id])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return
    setLoading(true)
    const supabase = createClient()
    const { data: schoolData } = await supabase.from('schools').select('id').limit(1).single()
    const { error } = await supabase.from('payments').insert({
      student_id: studentId,
      school_id: schoolData?.id ?? '',
      invoice_type: 'aidat',
      invoice_id: invoice.id,
      amount: amt,
      payment_method: method,
      payment_date: new Date().toISOString().split('T')[0],
      notes: notes || null,
    })
    if (error) toast.error('Ödeme kaydedilemedi: ' + error.message)
    else { toast.success('Ödeme kaydedildi'); onSuccess() }
    setLoading(false)
  }

  const remaining = invoice ? (invoice.amount ?? 0) - (invoice.paid_amount ?? 0) : 0

  return (
    <Dialog open={!!invoice} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Ödeme Al</DialogTitle>
        </DialogHeader>
        {invoice && (
          <>
            <p className="text-sm text-gray-500 -mt-1">
              {getMonthName(invoice.period_month)} {invoice.period_year} — Kalan:{' '}
              <strong className="text-gray-900">{formatCurrency(remaining)}</strong>
            </p>
            <form onSubmit={submit} className="space-y-3 mt-1">
              <div className="space-y-1.5">
                <Label>Tutar (₺)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
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
                    <SelectItem value="nakit">Nakit</SelectItem>
                    <SelectItem value="kart">Kredi / Banka Kartı</SelectItem>
                    <SelectItem value="havale">Havale / EFT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Not <span className="text-gray-400 font-normal">(isteğe bağlı)</span></Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="…" />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Kaydediliyor…' : 'Kaydet'}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// ADD PARENT MODAL
// ============================================================================
function AddParentModal({
  studentId,
  open,
  onClose,
  onSuccess,
}: {
  studentId: string
  open: boolean
  onClose: () => void
  onSuccess: (parent: any) => void
}) {
  const [phone, setPhone] = useState('')
  const [relation, setRelation] = useState('veli')
  const [isPrimary, setIsPrimary] = useState(false)
  const [foundProfile, setFoundProfile] = useState<any>(null)
  const [searching, setSearching] = useState(false)
  const [linking, setLinking] = useState(false)

  async function searchParent() {
    if (!phone.trim()) return
    setSearching(true)
    setFoundProfile(null)
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, phone')
      .eq('phone', phone.trim())
      .limit(1)
      .maybeSingle()
    if (!data) toast.error('Bu telefon numarasına kayıtlı profil bulunamadı')
    setFoundProfile(data)
    setSearching(false)
  }

  async function linkParent() {
    if (!foundProfile) return
    setLinking(true)
    const supabase = createClient()
    const { error } = await supabase.from('parent_student').insert({
      parent_profile_id: foundProfile.id,
      student_id: studentId,
      relation,
      is_primary: isPrimary,
    })
    if (error) toast.error('Veli eklenemedi: ' + error.message)
    else {
      toast.success('Veli eklendi')
      onSuccess({
        parent_profile_id: foundProfile.id,
        relation,
        is_primary: isPrimary,
        profiles: foundProfile,
      })
      setPhone(''); setFoundProfile(null); setRelation('veli'); setIsPrimary(false)
    }
    setLinking(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Veli Ekle</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Veli Telefonu</Label>
            <div className="flex gap-2">
              <PhoneInput
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="5xx xxx xxxx"
                onKeyDown={(e) => e.key === 'Enter' && searchParent()}
              />
              <Button type="button" variant="outline" onClick={searchParent} disabled={searching}>
                {searching ? '…' : 'Ara'}
              </Button>
            </div>
          </div>
          {foundProfile && (
            <div className="rounded-lg border p-3 bg-green-50 border-green-200 text-sm">
              <p className="font-semibold text-green-800">{foundProfile.full_name}</p>
              <p className="text-green-600 text-xs">{foundProfile.phone}</p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Yakınlık</Label>
            <Select value={relation} onValueChange={setRelation}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="anne">Anne</SelectItem>
                <SelectItem value="baba">Baba</SelectItem>
                <SelectItem value="veli">Veli</SelectItem>
                <SelectItem value="diger">Diğer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="rounded"
            />
            Birincil veli olarak işaretle
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>İptal</Button>
            <Button onClick={linkParent} disabled={!foundProfile || linking}>
              {linking ? 'Ekleniyor…' : 'Ekle'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// ADD GROUP MODAL
// ============================================================================
function AddGroupModal({
  studentId,
  groups,
  activeGroupIds,
  open,
  onClose,
  onSuccess,
}: {
  studentId: string
  groups: Array<{ id: string; name: string }>
  activeGroupIds: string[]
  open: boolean
  onClose: () => void
  onSuccess: (sg: any) => void
}) {
  const available = groups.filter((g) => !activeGroupIds.includes(g.id))
  const [groupId, setGroupId] = useState('')
  const [joinedAt, setJoinedAt] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!groupId) return
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('student_groups')
      .insert({ student_id: studentId, group_id: groupId, joined_at: joinedAt, is_active: true })
      .select('id, joined_at, left_at, is_active, groups(id, name)')
      .single()
    if (error) toast.error('Gruba eklenemedi: ' + error.message)
    else {
      toast.success('Gruba eklendi')
      onSuccess(data)
      setGroupId(''); setJoinedAt(new Date().toISOString().split('T')[0])
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Gruba Ekle</DialogTitle>
        </DialogHeader>
        {available.length === 0 ? (
          <p className="text-sm text-gray-500 py-2">
            Eklenebilecek grup yok. Tüm aktif gruplara zaten kayıtlı.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Grup</Label>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger><SelectValue placeholder="Grup seç" /></SelectTrigger>
                <SelectContent>
                  {available.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Başlangıç Tarihi</Label>
              <Input
                type="date"
                value={joinedAt}
                onChange={(e) => setJoinedAt(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
              <Button type="submit" disabled={!groupId || loading}>
                {loading ? 'Ekleniyor…' : 'Ekle'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// EDIT STUDENT MODAL
// ============================================================================
function EditStudentModal({
  student,
  open,
  onClose,
  onSuccess,
}: {
  student: any
  open: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [fullName, setFullName] = useState(student.full_name ?? '')
  const [birthDate, setBirthDate] = useState(student.birth_date ?? '')
  const [gender, setGender] = useState(student.gender ?? '')
  const [bloodType, setBloodType] = useState(student.blood_type ?? '')
  const [enrollmentDate, setEnrollmentDate] = useState(student.enrollment_date ?? '')
  const [status, setStatus] = useState(student.status ?? 'active')
  const [hasUniform, setHasUniform] = useState<boolean>(student.has_received_uniform ?? false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setFullName(student.full_name ?? '')
      setBirthDate(student.birth_date ?? '')
      setGender(student.gender ?? '')
      setBloodType(student.blood_type ?? '')
      setEnrollmentDate(student.enrollment_date ?? '')
      setStatus(student.status ?? 'active')
      setHasUniform(student.has_received_uniform ?? false)
    }
  }, [open])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) return
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('students').update({
      full_name: fullName.trim(),
      birth_date: birthDate || null,
      gender: gender || null,
      blood_type: bloodType || null,
      enrollment_date: enrollmentDate || null,
      status,
      has_received_uniform: hasUniform,
      uniform_received_at: hasUniform && !student.has_received_uniform
        ? new Date().toISOString().split('T')[0]
        : student.uniform_received_at,
    }).eq('id', student.id)
    if (error) toast.error('Kaydedilemedi: ' + error.message)
    else { toast.success('Öğrenci bilgileri güncellendi'); onSuccess() }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Öğrenci Bilgilerini Düzenle</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3 mt-1">
          <div className="space-y-1.5">
            <Label>Ad Soyad</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Doğum Tarihi</Label>
              <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Cinsiyet</Label>
              <Select value={gender || 'none'} onValueChange={(v) => setGender(v === 'none' ? '' : v as 'M' | 'F')}>
                <SelectTrigger><SelectValue placeholder="Seç" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Belirtilmedi</SelectItem>
                  <SelectItem value="M">Erkek</SelectItem>
                  <SelectItem value="F">Kız</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Kan Grubu</Label>
              <Select value={bloodType || 'none'} onValueChange={(v) => setBloodType(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Seç" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Belirtilmedi</SelectItem>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-'].map((bg) => (
                    <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Kayıt Tarihi</Label>
              <Input type="date" value={enrollmentDate} onChange={(e) => setEnrollmentDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Durum</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="trial">Deneme</SelectItem>
                  <SelectItem value="inactive">Pasif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Forma</Label>
              <label className="flex items-center gap-2 text-sm cursor-pointer h-9 px-3 rounded-md border border-input bg-background">
                <input
                  type="checkbox"
                  checked={hasUniform}
                  onChange={(e) => setHasUniform(e.target.checked)}
                  className="rounded"
                />
                Forma Alındı
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Kaydediliyor…' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
