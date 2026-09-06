'use client'
// Prototip: Steam ayarlar penceresi tarzı — ortada yüzen pencere, solda dikey
// sekme listesi, sağda seçili sekmenin içeriği. Ayrı sayfaya gitmek yerine
// listeden isme tıklayınca açılır. Veri modal açılınca Server Action ile çekilir.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate, getMonthName, cn } from '@/lib/utils'
import { Pencil, Banknote, Mail, Trash2, Loader2 } from 'lucide-react'
import { getStaffDetail, deleteStaff, inviteCoach } from '@/app/(admin)/personel/actions'
import { EditStaffModal, PaySalaryModal } from './staff-detail-tabs'

const TYPE_LABEL: Record<string, string> = { coach: 'Antrenör', assistant: 'Asistan', other: 'Diğer' }
const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: 'Nakit',
  transfer: 'Havale / EFT',
  other: 'Diğer',
}

const SECTIONS = [
  { id: 'genel', label: 'Genel' },
  { id: 'gruplar', label: 'Gruplar' },
  { id: 'maas', label: 'Maaş Geçmişi' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']
type StaffDetail = Awaited<ReturnType<typeof getStaffDetail>>

export default function StaffDetailWindow({
  staffId,
  open,
  onClose,
}: {
  staffId: string | null
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const [section, setSection] = useState<SectionId>('genel')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<StaffDetail | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [payModal, setPayModal] = useState(false)
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    if (!open || !staffId) return
    // Yeni personel seçildiğinde pencereyi yükleme durumuna bilinçli olarak sıfırla.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSection('genel')
    setLoading(true)
    setData(null)
    getStaffDetail(staffId)
      .then(setData)
      .catch((err: any) => toast.error('Yüklenemedi: ' + (err.message ?? 'Bilinmeyen hata')))
      .finally(() => setLoading(false))
  }, [open, staffId])

  async function handleDelete() {
    if (!data) return
    if (!confirm(`${data.staff.full_name} arşive alınsın ve girişi kapatılsın mı?`)) return
    setDeleting(true)
    try {
      await deleteStaff(data.staff.id, data.staff.profile_id || undefined)
      onClose()
      router.push('/finans?tab=giderler')
    } catch (err: any) {
      toast.error(err.message ?? 'Arşivlenemedi')
      setDeleting(false)
    }
  }

  async function refreshDetail() {
    if (!staffId) return
    const updated = await getStaffDetail(staffId)
    setData(updated)
  }

  async function handleInvite() {
    if (!data) return
    setInviting(true)
    try {
      const result = await inviteCoach(data.staff.id)
      toast.success(
        result.linkedExisting
          ? 'Mevcut hesap antrenör uygulamasına bağlandı'
          : result.suppressed
            ? 'Davet sink/karantina modunda bastırıldı'
            : 'Antrenör daveti gönderildi',
      )
      await refreshDetail()
    } catch (err: any) {
      toast.error(err.message ?? 'Davet gönderilemedi')
    } finally {
      setInviting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[90vw] max-w-6xl h-[85vh] max-h-[900px] p-0 gap-0 overflow-hidden flex flex-col sm:max-w-6xl">
        <div className="px-8 py-5 border-b shrink-0">
          <DialogTitle className="text-lg">{data?.staff.full_name ?? 'Yükleniyor…'}</DialogTitle>
          <DialogDescription>Personel Detayı</DialogDescription>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Sol: dikey sekme listesi */}
          <nav className="w-64 border-r bg-muted/30 p-3 space-y-1 shrink-0 overflow-y-auto">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={cn(
                  'w-full text-left px-4 py-2.5 rounded-md text-sm transition-colors',
                  section === s.id
                    ? 'bg-background font-medium shadow-sm'
                    : 'text-muted-foreground hover:bg-background/60'
                )}
              >
                {s.label}
                {s.id === 'gruplar' && data ? ` (${data.groups.length})` : ''}
                {s.id === 'maas' && data ? ` (${data.salaryPayments.length})` : ''}
              </button>
            ))}
          </nav>

          {/* Sağ: seçili sekmenin içeriği */}
          <div className="flex-1 overflow-y-auto p-10">
            {loading || !data ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Yükleniyor…
              </div>
            ) : (
              <>
                {section === 'genel' && (
                  <div className="space-y-8 max-w-3xl">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h2 className="text-sm font-medium text-muted-foreground">Genel Bilgiler</h2>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => setEditModal(true)}>
                          <Pencil className="w-3.5 h-3.5 mr-1.5" />
                          Düzenle
                        </Button>
                        <Button size="sm" onClick={() => setPayModal(true)}>
                          <Banknote className="w-3.5 h-3.5 mr-1.5" />
                          Maaş Öde
                        </Button>
                        {data.staff.staff_type === 'coach' && data.staff.invitation_email && data.staff.invitation_status !== 'accepted' && (
                          <Button size="sm" variant="outline" onClick={handleInvite} disabled={inviting}>
                            <Mail className="w-3.5 h-3.5 mr-1.5" />
                            {inviting ? 'Gönderiliyor…' : 'Davet Gönder'}
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={handleDelete} disabled={deleting}>
                          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                          {deleting ? 'Arşivleniyor…' : 'Arşive Al'}
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-6 text-sm">
                      {(
                        [
                          ['Ad Soyad', data.staff.full_name],
                          ['Tip', TYPE_LABEL[data.staff.staff_type] ?? data.staff.staff_type],
                          ['Telefon', data.staff.phone ?? '—'],
                          ['Aylık Maaş', formatCurrency(data.staff.monthly_salary)],
                          ['İşe Giriş', formatDate(data.staff.hire_date)],
                          ['Durum', data.staff.is_active ? 'Aktif' : 'Pasif'],
                        ] as [string, string][]
                      ).map(([label, value]) => (
                        <div key={label}>
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="font-medium mt-1">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {section === 'gruplar' &&
                  (data.groups.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-8">
                      Henüz grup atanmadı.
                    </div>
                  ) : (
                    <table className="min-w-full text-sm divide-y">
                      <thead>
                        <tr>
                          <th className="px-2 py-2 text-left font-medium text-muted-foreground">Grup Adı</th>
                          <th className="px-2 py-2 text-left font-medium text-muted-foreground">Durum</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {data.groups.map((g) => (
                          <tr key={g.id}>
                            <td className="px-2 py-2 font-medium">{g.name}</td>
                            <td className="px-2 py-2">
                              <Badge variant={g.is_active ? 'success' : 'secondary'}>
                                {g.is_active ? 'Aktif' : 'Pasif'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ))}

                {section === 'maas' &&
                  (data.salaryPayments.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-8">
                      Henüz maaş ödemesi kaydedilmedi.
                    </div>
                  ) : (
                    <table className="min-w-full text-sm divide-y">
                      <thead>
                        <tr>
                          <th className="px-2 py-2 text-left font-medium text-muted-foreground">Dönem</th>
                          <th className="px-2 py-2 text-right font-medium text-muted-foreground">Tutar</th>
                          <th className="px-2 py-2 text-left font-medium text-muted-foreground">Yöntem</th>
                          <th className="px-2 py-2 text-left font-medium text-muted-foreground">Tarih</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {data.salaryPayments.map((p) => (
                          <tr key={p.id}>
                            <td className="px-2 py-2">
                              {getMonthName(p.period_month)} {p.period_year}
                            </td>
                            <td className="px-2 py-2 text-right font-semibold">
                              {formatCurrency(p.amount)}
                            </td>
                            <td className="px-2 py-2 text-muted-foreground">
                              {PAYMENT_METHOD_LABEL[p.payment_method ?? ''] ?? p.payment_method ?? '—'}
                            </td>
                            <td className="px-2 py-2 text-muted-foreground">{formatDate(p.paid_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ))}
              </>
            )}
          </div>
        </div>

        {data && (
          <>
            <EditStaffModal
              staff={data.staff}
              open={editModal}
              onClose={() => setEditModal(false)}
              onSuccess={async () => {
                setEditModal(false)
                await refreshDetail()
                router.refresh()
              }}
            />
            <PaySalaryModal
              staff={data.staff}
              open={payModal}
              onClose={() => setPayModal(false)}
              onSuccess={async () => {
                setPayModal(false)
                await refreshDetail()
                router.refresh()
              }}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
