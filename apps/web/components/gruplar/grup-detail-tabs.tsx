'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatCurrency, formatDate, TR_DAYS } from '@/lib/utils'
import { Pencil, Plus, Trash2, UserMinus, Check } from 'lucide-react'
import { GROUP_COLORS } from '@/lib/group-colors'
import {
  updateGroup,
  updateGroupColor,
  addSlot,
  removeSlot,
  addStudentToGroup,
  removeStudentFromGroup,
  deleteGroup,
} from '@/app/(admin)/gruplar/actions'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Slot {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
}

interface StudentGroup {
  id: string
  is_active: boolean | null
  joined_at: string | null
  left_at?: string | null
  students: { id: string; full_name: string; status: string | null } | null
}

interface Group {
  id: string
  name: string
  monthly_fee: number | null
  is_active: boolean | null
  primary_coach_id: string | null
  color: string | null
  staff: { id: string; full_name: string } | null
  group_schedule_slots: Slot[]
  student_groups: StudentGroup[]
}

interface Session {
  id: string
  session_date: string
  start_time: string
  end_time: string
  status: string | null
  cancellation_reason: string | null
  cancelled_at: string | null
  notes: string | null
}

interface Coach {
  id: string
  full_name: string
}

interface Student {
  id: string
  full_name: string
  status: string | null
}

// ── Edit Group Modal ───────────────────────────────────────────────────────────

function EditGroupModal({
  group,
  coaches,
  open,
  onClose,
  onSuccess,
}: {
  group: Group
  coaches: Coach[]
  open: boolean
  onClose: () => void
  onSuccess: (updated: Partial<Group>) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    name: group.name,
    monthly_fee: group.monthly_fee != null ? String(group.monthly_fee) : '',
    primary_coach_id: group.primary_coach_id ?? '',
    is_active: group.is_active !== false ? 'active' : 'inactive',
  })

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    startTransition(async () => {
      try {
        await updateGroup(group.id, {
          name: form.name.trim(),
          monthly_fee: form.monthly_fee ? Number(form.monthly_fee) : null,
          primary_coach_id: form.primary_coach_id || null,
          is_active: form.is_active === 'active',
        })
        toast.success('Grup bilgileri güncellendi')
        onSuccess({
          name: form.name.trim(),
          monthly_fee: form.monthly_fee ? Number(form.monthly_fee) : null,
          primary_coach_id: form.primary_coach_id || null,
          is_active: form.is_active === 'active',
        })
      } catch (err: any) {
        toast.error('Güncellenemedi: ' + (err?.message ?? 'Bilinmeyen hata'))
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Grubu Düzenle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-1">
          <div className="space-y-1.5">
            <Label>Grup Adı *</Label>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Aylık Ücret (₺)</Label>
            <Input
              type="number"
              value={form.monthly_fee}
              onChange={(e) => set('monthly_fee', e.target.value)}
              min={0}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Antrenör</Label>
            <Select value={form.primary_coach_id} onValueChange={(v) => set('primary_coach_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seçiniz" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">— Seçilmedi —</SelectItem>
                {coaches.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Durum</Label>
            <Select value={form.is_active} onValueChange={(v) => set('is_active', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Pasif</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              İptal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Add Slot Modal ─────────────────────────────────────────────────────────────

function AddSlotModal({
  groupId,
  open,
  onClose,
  onSuccess,
}: {
  groupId: string
  open: boolean
  onClose: () => void
  onSuccess: (slot: Slot) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({ day_of_week: '1', start_time: '16:00', end_time: '17:30' })

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      try {
        await addSlot(groupId, {
          day_of_week: Number(form.day_of_week),
          start_time: form.start_time.length === 5 ? form.start_time + ':00' : form.start_time,
          end_time: form.end_time.length === 5 ? form.end_time + ':00' : form.end_time,
        })
        toast.success('Slot eklendi')
        onSuccess({
          id: crypto.randomUUID(),
          day_of_week: Number(form.day_of_week),
          start_time: form.start_time + ':00',
          end_time: form.end_time + ':00',
        })
        onClose()
      } catch (err: any) {
        toast.error('Slot eklenemedi: ' + (err?.message ?? 'Bilinmeyen hata'))
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Slot Ekle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-1">
          <div className="space-y-1.5">
            <Label>Gün</Label>
            <Select value={form.day_of_week} onValueChange={(v) => set('day_of_week', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TR_DAYS.map((d, idx) => (
                  <SelectItem key={idx + 1} value={String(idx + 1)}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Başlangıç</Label>
              <Input
                type="time"
                value={form.start_time}
                onChange={(e) => set('start_time', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Bitiş</Label>
              <Input
                type="time"
                value={form.end_time}
                onChange={(e) => set('end_time', e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              İptal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Kaydediliyor…' : 'Ekle'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Add Student Modal ──────────────────────────────────────────────────────────

function AddStudentModal({
  groupId,
  available,
  open,
  onClose,
  onSuccess,
}: {
  groupId: string
  available: Student[]
  open: boolean
  onClose: () => void
  onSuccess: (student: Student) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')

  const filtered = available.filter((s) =>
    s.full_name.toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr'))
  )

  function pick(student: Student) {
    startTransition(async () => {
      try {
        await addStudentToGroup(groupId, student.id)
        toast.success(`${student.full_name} gruba eklendi`)
        onSuccess(student)
        onClose()
      } catch (err: any) {
        toast.error('Eklenemedi: ' + (err?.message ?? 'Bilinmeyen hata'))
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Öğrenci Ekle</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-1">
          <Input
            placeholder="Öğrenci ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-64 overflow-y-auto divide-y rounded border">
            {filtered.length === 0 && (
              <p className="p-4 text-sm text-center text-muted-foreground">Öğrenci bulunamadı.</p>
            )}
            {filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={isPending}
                onClick={() => pick(s)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors text-foreground"
              >
                {s.full_name}
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Session status label ───────────────────────────────────────────────────────

const SESSION_STATUS_LABEL: Record<string, string> = {
  scheduled: 'Planlandı',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function GrupDetailTabs({
  group: initialGroup,
  sessions,
  coaches,
  allStudents,
}: {
  group: Group
  sessions: Session[]
  coaches: Coach[]
  allStudents: Student[]
}) {
  const router = useRouter()
  const [group, setGroup] = useState(initialGroup)
  const [slots, setSlots] = useState<Slot[]>(initialGroup.group_schedule_slots)
  const [studentGroups, setStudentGroups] = useState<StudentGroup[]>(
    initialGroup.student_groups
  )

  const [editModal, setEditModal] = useState(false)
  const [slotModal, setSlotModal] = useState(false)
  const [addStudentModal, setAddStudentModal] = useState(false)
  const [removingSlot, setRemovingSlot] = useState<string | null>(null)
  const [removingStudent, setRemovingStudent] = useState<string | null>(null)
  const [deletingGroup, setDeletingGroup] = useState(false)
  const [colorPending, startColorTransition] = useTransition()

  const activeStudentGroups = studentGroups.filter((sg) => sg.is_active)

  const activeStudentIds = new Set(
    activeStudentGroups.map((sg) => sg.students?.id).filter(Boolean)
  )
  const availableStudents = allStudents.filter((s) => !activeStudentIds.has(s.id))

  const normalSessions = sessions.filter((s) => s.status !== 'cancelled')
  const cancelledSessions = sessions.filter((s) => s.status === 'cancelled')

  const coachName =
    group.staff?.full_name ??
    coaches.find((c) => c.id === group.primary_coach_id)?.full_name ??
    '—'

  async function handleRemoveSlot(slotId: string) {
    setRemovingSlot(slotId)
    try {
      await removeSlot(slotId, group.id)
      setSlots((s) => s.filter((sl) => sl.id !== slotId))
      toast.success('Slot silindi')
    } catch (err: any) {
      toast.error('Silinemedi: ' + (err?.message ?? 'Bilinmeyen hata'))
    } finally {
      setRemovingSlot(null)
    }
  }

  async function handleDeleteGroup() {
    if (!confirm(`"${group.name}" grubu kalıcı olarak silinsin mi? İçindeki öğrenci atamaları ve slotlar da silinir.`)) return
    setDeletingGroup(true)
    try {
      await deleteGroup(group.id)
      router.push('/')
    } catch (err: any) {
      toast.error('Silinemedi: ' + (err?.message ?? 'Bilinmeyen hata'))
      setDeletingGroup(false)
    }
  }

  function handleColorChange(colorKey: string) {
    if (colorKey === group.color) return
    startColorTransition(async () => {
      try {
        await updateGroupColor(group.id, colorKey)
        setGroup((g) => ({ ...g, color: colorKey }))
        toast.success('Grup rengi güncellendi')
      } catch (err: any) {
        toast.error('Renk güncellenemedi: ' + (err?.message ?? 'Bilinmeyen hata'))
      }
    })
  }

  async function handleRemoveStudent(sgId: string) {
    setRemovingStudent(sgId)
    try {
      await removeStudentFromGroup(sgId, group.id)
      setStudentGroups((prev) =>
        prev.map((sg) => (sg.id === sgId ? { ...sg, is_active: false } : sg))
      )
      toast.success('Öğrenci gruptan çıkarıldı')
    } catch (err: any) {
      toast.error('İşlem başarısız: ' + (err?.message ?? 'Bilinmeyen hata'))
    } finally {
      setRemovingStudent(null)
    }
  }

  return (
    <>
      <Tabs defaultValue="genel" className="w-full">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="genel">Genel</TabsTrigger>
          <TabsTrigger value="program">Program ({slots.length})</TabsTrigger>
          <TabsTrigger value="yoklama">
            Yoklama Geçmişi ({normalSessions.length})
          </TabsTrigger>
          <TabsTrigger value="iptal">
            İptal Edilen ({cancelledSessions.length})
          </TabsTrigger>
        </TabsList>

        {/* ── GENEL ─────────────────────────────────────────────────────────── */}
        <TabsContent value="genel">
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/50">
              <span className="text-sm font-medium text-foreground/80">Genel Bilgiler</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditModal(true)}>
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  Düzenle
                </Button>
                <Button size="sm" variant="destructive" onClick={handleDeleteGroup} disabled={deletingGroup}>
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  {deletingGroup ? 'Siliniyor…' : 'Grubu Sil'}
                </Button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {([
                  ['Grup Adı', group.name],
                  ['Antrenör', coachName],
                  ['Aylık Ücret', formatCurrency(group.monthly_fee)],
                  ['Durum', group.is_active !== false ? 'Aktif' : 'Pasif'],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-medium text-foreground mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <p className="text-xs text-muted-foreground mb-2">Grup Rengi</p>
                <div className="flex flex-wrap gap-2">
                  {GROUP_COLORS.map((c) => {
                    const selected = group.color === c.key
                    return (
                      <button
                        key={c.key}
                        type="button"
                        disabled={colorPending}
                        onClick={() => handleColorChange(c.key)}
                        className={`flex items-center justify-center w-7 h-7 rounded-full ${c.swatch} transition-transform hover:scale-110 disabled:opacity-50 ${
                          selected ? 'ring-2 ring-offset-2 ring-foreground ring-offset-card' : ''
                        }`}
                        title={c.key}
                      >
                        {selected && (
                          <Check
                            className={`w-3.5 h-3.5 ${c.key === 'white' ? 'text-neutral-900' : 'text-white'}`}
                          />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card overflow-hidden mt-4">
            <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/50">
              <span className="text-sm font-medium text-foreground/80">
                Kayıtlı Öğrenciler — {activeStudentGroups.length}
              </span>
              <Button size="sm" onClick={() => setAddStudentModal(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Öğrenci Ekle
              </Button>
            </div>
            {activeStudentGroups.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Bu grupta henüz öğrenci yok.
              </div>
            ) : (
              <table className="min-w-full text-sm divide-y">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Öğrenci</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Katılım Tarihi
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {activeStudentGroups.map((sg) => (
                    <tr key={sg.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {sg.students?.full_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(sg.joined_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveStudent(sg.id)}
                          disabled={removingStudent === sg.id}
                          className="px-2 text-muted-foreground/60 hover:text-red-600"
                          title="Gruptan çıkar"
                        >
                          <UserMinus className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        {/* ── PROGRAM ───────────────────────────────────────────────────────── */}
        <TabsContent value="program">
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/50">
              <span className="text-sm font-medium text-foreground/80">Haftalık Program</span>
              <Button size="sm" onClick={() => setSlotModal(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Slot Ekle
              </Button>
            </div>
            {slots.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Henüz antrenman slotu eklenmedi.
              </div>
            ) : (
              <table className="min-w-full text-sm divide-y">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Gün</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Başlangıç</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Bitiş</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {slots
                    .slice()
                    .sort((a, b) => a.day_of_week - b.day_of_week)
                    .map((slot) => (
                      <tr key={slot.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3 text-foreground">
                          {TR_DAYS[(slot.day_of_week - 1) % 7]}
                        </td>
                        <td className="px-4 py-3 text-foreground/80">
                          {slot.start_time.slice(0, 5)}
                        </td>
                        <td className="px-4 py-3 text-foreground/80">
                          {slot.end_time.slice(0, 5)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveSlot(slot.id)}
                            disabled={removingSlot === slot.id}
                            className="px-2 text-muted-foreground/60 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        {/* ── YOKLAMA GEÇMİŞİ ──────────────────────────────────────────────── */}
        <TabsContent value="yoklama">
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="px-6 py-3 border-b bg-muted/50">
              <span className="text-sm font-medium text-foreground/80">Yoklama Geçmişi</span>
            </div>
            {normalSessions.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Henüz yoklama oturumu yok.
              </div>
            ) : (
              <table className="min-w-full text-sm divide-y">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tarih</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Saat</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Durum</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Not</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {normalSessions.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-foreground">{formatDate(s.session_date)}</td>
                      <td className="px-4 py-3 text-foreground/80">
                        {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            s.status === 'completed'
                              ? 'success'
                              : s.status === 'scheduled'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {SESSION_STATUS_LABEL[s.status ?? ''] ?? s.status ?? '—'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{s.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        {/* ── İPTAL EDİLEN ANTRENMANLAR ─────────────────────────────────────── */}
        <TabsContent value="iptal">
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="px-6 py-3 border-b bg-muted/50">
              <span className="text-sm font-medium text-foreground/80">İptal Edilen Antrenmanlar</span>
            </div>
            {cancelledSessions.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                İptal edilmiş antrenman yok.
              </div>
            ) : (
              <table className="min-w-full text-sm divide-y">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tarih</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Saat</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">İptal Tarihi</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Sebep</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {cancelledSessions.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-foreground">{formatDate(s.session_date)}</td>
                      <td className="px-4 py-3 text-foreground/80">
                        {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(s.cancelled_at)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {s.cancellation_reason ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      <EditGroupModal
        group={group}
        coaches={coaches}
        open={editModal}
        onClose={() => setEditModal(false)}
        onSuccess={(updated) => {
          setGroup((g) => ({ ...g, ...updated }))
          setEditModal(false)
          router.refresh()
        }}
      />

      <AddSlotModal
        groupId={group.id}
        open={slotModal}
        onClose={() => setSlotModal(false)}
        onSuccess={(slot) => {
          setSlots((s) => [...s, slot])
          router.refresh()
        }}
      />

      <AddStudentModal
        groupId={group.id}
        available={availableStudents}
        open={addStudentModal}
        onClose={() => setAddStudentModal(false)}
        onSuccess={(student) => {
          setStudentGroups((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              is_active: true,
              joined_at: new Date().toISOString().split('T')[0],
              students: student,
            },
          ])
        }}
      />
    </>
  )
}
