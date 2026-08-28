'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import WeekGrid, {
  type SlotRow,
  type SessionRow,
  type WeekDay,
  getSlotColor,
  DISPLAY_TO_DOW,
} from '@/components/program/week-grid'
import { cancelWeekSessions, cancelDaySessions, cancelSpecificSession } from './actions'
import { compareGroupNames } from '@/lib/utils'

export type { SlotRow, SessionRow, WeekDay }

type Props = {
  slots: SlotRow[]
  sessions: SessionRow[]
  weekDays: WeekDay[]
  weekOffset: number
  todayStr: string
  weekStart: string
  weekEnd: string
}

type CancelMode = 'session' | 'day' | 'week'

export default function TakvimClient({
  slots,
  sessions,
  weekDays,
  todayStr,
  weekStart,
  weekEnd,
}: Props) {
  const router = useRouter()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelMode, setCancelMode] = useState<CancelMode>('day')
  const [selectedSessionKey, setSelectedSessionKey] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(todayStr)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const sortedGroupIds = Array.from(new Set(slots.map((s) => s.group_id))).sort(
    (a, b) => {
      const na = slots.find((s) => s.group_id === a)?.groups.name ?? ''
      const nb = slots.find((s) => s.group_id === b)?.groups.name ?? ''
      return compareGroupNames(na, nb)
    },
  )

  // Bu haftanın her slotunu gerçek tarihiyle eşleştirir ("belirli antrenman" seçimi için)
  const weekSlotOptions = useMemo(() => {
    return slots
      .map((slot) => {
        const displayIdx = DISPLAY_TO_DOW.indexOf(slot.day_of_week)
        const date = displayIdx >= 0 ? weekDays[displayIdx]?.date : undefined
        const dayName = displayIdx >= 0 ? weekDays[displayIdx]?.dayName : undefined
        return date ? { slot, date, dayName: dayName ?? '' } : null
      })
      .filter((x): x is { slot: SlotRow; date: string; dayName: string } => x !== null)
      .sort((a, b) => a.date.localeCompare(b.date) || a.slot.start_time.localeCompare(b.slot.start_time))
  }, [slots, weekDays])

  const sessionKeyOf = (slot: SlotRow, date: string) => `${slot.group_id}|${date}|${slot.start_time}`
  const sessionLabel = (opt: { slot: SlotRow; dayName: string }) =>
    `${opt.slot.groups.name} · ${opt.dayName} ${opt.slot.start_time.slice(0, 5)}`
  const dayLabel = (d: WeekDay) => `${d.dayName} (${d.date})`

  // Dialogu belirli bir moda önceden doldurulmuş şekilde açar
  function openCancel(mode: CancelMode) {
    setCancelMode(mode)
    setSelectedDate(todayStr)
    setSelectedSessionKey(weekSlotOptions[0] ? sessionKeyOf(weekSlotOptions[0].slot, weekSlotOptions[0].date) : '')
    setReason('')
    setCancelOpen(true)
  }

  async function handleCancel() {
    setLoading(true)
    try {
      if (cancelMode === 'week') {
        await cancelWeekSessions(weekStart, weekEnd, reason)
      } else if (cancelMode === 'day') {
        await cancelDaySessions(selectedDate, reason)
      } else if (cancelMode === 'session') {
        const found = weekSlotOptions.find(
          (opt) => sessionKeyOf(opt.slot, opt.date) === selectedSessionKey,
        )
        if (found) {
          await cancelSpecificSession(found.slot.group_id, found.date, found.slot.start_time, reason)
        }
      }
    } finally {
      setLoading(false)
      setCancelOpen(false)
      setReason('')
      router.refresh()
    }
  }

  const selectedSlotOption = weekSlotOptions.find(
    (opt) => sessionKeyOf(opt.slot, opt.date) === selectedSessionKey,
  )

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ── Calendar grid ── */}
      <WeekGrid slots={slots} sessions={sessions} weekDays={weekDays} todayStr={todayStr} rowH={64} minHour={9} maxHour={21} />

      {/* ── Legend + iptal tuşu ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-4">
          {sortedGroupIds.map((gid) => {
            const slot = slots.find((s) => s.group_id === gid)
            if (!slot) return null
            const idx = sortedGroupIds.indexOf(gid)
            const color = getSlotColor(slot.groups.color, idx)
            return (
              <a
                key={gid}
                href={`/gruplar/${slot.groups.id}`}
                className="flex items-center gap-1.5 hover:opacity-75"
              >
                <span
                  className="inline-block h-3 w-3 rounded-sm border border-border/50"
                  style={{ backgroundColor: color.border }}
                />
                <span className="text-xs font-medium text-foreground">
                  {slot.groups.name}
                </span>
              </a>
            )
          })}
        </div>

        <Button size="sm" variant="outline" onClick={() => openCancel('day')}>
          Antrenman İptal Et
        </Button>
      </div>

      {/* ── Empty state ── */}
      {slots.length === 0 && (
        <div className="rounded-lg border bg-card p-16 text-center text-sm text-muted-foreground">
          Henüz program tanımlanmamış. Gruplar sayfasından slot ekleyebilirsiniz.
        </div>
      )}

      {/* ── Cancel Dialog ── */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Antrenman İptal Et</DialogTitle>
          </DialogHeader>

          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant={cancelMode === 'session' ? 'default' : 'outline'}
              onClick={() => setCancelMode('session')}
            >
              Belirli Antrenman
            </Button>
            <Button
              size="sm"
              variant={cancelMode === 'day' ? 'default' : 'outline'}
              onClick={() => setCancelMode('day')}
            >
              Belirli Gün
            </Button>
            <Button
              size="sm"
              variant={cancelMode === 'week' ? 'default' : 'outline'}
              onClick={() => setCancelMode('week')}
            >
              Bütün Hafta
            </Button>
          </div>

          {cancelMode === 'session' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Antrenman</label>
              {weekSlotOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Bu hafta planlanmış antrenman yok.</p>
              ) : (
                <Select value={selectedSessionKey} onValueChange={setSelectedSessionKey}>
                  <SelectTrigger className="w-full">
                    {/* Öğe listesi henüz hiç açılmadıysa base-ui seçili değeri ham
                        string olarak gösterebiliyor — etiketi burada kendimiz üretiyoruz */}
                    <SelectValue placeholder="Antrenman seçin">
                      {() => (selectedSlotOption ? sessionLabel(selectedSlotOption) : 'Antrenman seçin')}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {weekSlotOptions.map((opt) => (
                      <SelectItem
                        key={sessionKeyOf(opt.slot, opt.date)}
                        value={sessionKeyOf(opt.slot, opt.date)}
                      >
                        {sessionLabel(opt)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {cancelMode === 'day' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Gün</label>
              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Gün seçin">
                    {() => {
                      const d = weekDays.find((wd) => wd.date === selectedDate)
                      return d ? dayLabel(d) : 'Gün seçin'
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {weekDays.map((d) => (
                    <SelectItem key={d.date} value={d.date}>
                      {dayLabel(d)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            {cancelMode === 'week' &&
              `${weekStart} – ${weekEnd} arasındaki tüm planlanmış antrenmanlar iptal edilecek.`}
            {cancelMode === 'day' && `${selectedDate} tarihindeki tüm planlanmış antrenmanlar iptal edilecek.`}
            {cancelMode === 'session' &&
              selectedSlotOption &&
              `${selectedSlotOption.slot.groups.name} grubunun ${selectedSlotOption.dayName} ${selectedSlotOption.slot.start_time.slice(0, 5)} antrenmanı iptal edilecek.`}
          </p>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              İptal sebebi{' '}
              <span className="font-normal text-muted-foreground">(opsiyonel)</span>
            </label>
            <textarea
              className="w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3}
              placeholder="Örn: Resmi tatil, yağmur nedeniyle saha kapalı..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              onClick={() => {
                setCancelOpen(false)
                setReason('')
              }}
            >
              Vazgeç
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={loading || (cancelMode === 'session' && !selectedSlotOption)}
            >
              {loading ? 'İptal ediliyor...' : 'Evet, İptal Et'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
