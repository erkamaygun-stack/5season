'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cancelWeekSessions, cancelDaySessions } from './actions'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SlotRow = {
  id: string
  day_of_week: number   // Postgres DOW: 0=Sun, 1=Mon … 6=Sat
  start_time: string    // "HH:MM:SS"
  end_time: string
  group_id: string
  groups: {
    id: string
    name: string
    primary_coach_id: string | null
    coachName: string | null
  }
}

export type SessionRow = {
  id: string
  group_id: string
  session_date: string  // "YYYY-MM-DD"
  start_time: string
  status: string
}

export type WeekDay = {
  date: string      // "YYYY-MM-DD"
  label: string     // "19"
  dayName: string   // "Pazartesi"
}

type Props = {
  slots: SlotRow[]
  sessions: SessionRow[]
  weekDays: WeekDay[]
  weekOffset: number
  todayStr: string
  weekStart: string
  weekEnd: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Display columns 0–6 = Mon–Sun; map to Postgres DOW
// Mon→1, Tue→2, Wed→3, Thu→4, Fri→5, Sat→6, Sun→0
const DISPLAY_TO_DOW = [1, 2, 3, 4, 5, 6, 0]

const MIN_HOUR = 8
const MAX_HOUR = 22
const ROW_H = 64        // px per hour
const TIME_W = 52       // px, left time-label column

const SLOT_COLORS = [
  { bg: '#dbeafe', border: '#3b82f6', text: '#1d4ed8' },  // blue
  { bg: '#d1fae5', border: '#10b981', text: '#065f46' },  // emerald
  { bg: '#ede9fe', border: '#8b5cf6', text: '#5b21b6' },  // violet
  { bg: '#ffedd5', border: '#f97316', text: '#9a3412' },  // orange
  { bg: '#fce7f3', border: '#ec4899', text: '#9d174d' },  // pink
  { bg: '#cffafe', border: '#06b6d4', text: '#155e75' },  // cyan
  { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },  // amber
  { bg: '#f0fdf4', border: '#22c55e', text: '#15803d' },  // green
]

const CANCELLED_COLOR = { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toMins(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function dateToDow(dateStr: string): number {
  // Returns Postgres-compatible DOW (0=Sun … 6=Sat), timezone-safe
  const [y, mo, d] = dateStr.split('-').map(Number)
  return new Date(y, mo - 1, d).getDay()
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProgramClient({
  slots,
  sessions,
  weekDays,
  weekOffset,
  todayStr,
  weekStart,
  weekEnd,
}: Props) {
  const router = useRouter()
  const [cancelMode, setCancelMode] = useState<'week' | 'day' | null>(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  // Assign a stable color per group (sorted by name)
  const sortedGroupIds = Array.from(new Set(slots.map((s) => s.group_id))).sort(
    (a, b) => {
      const na = slots.find((s) => s.group_id === a)?.groups.name ?? ''
      const nb = slots.find((s) => s.group_id === b)?.groups.name ?? ''
      return na.localeCompare(nb, 'tr')
    },
  )
  const groupColor = (gid: string) =>
    SLOT_COLORS[sortedGroupIds.indexOf(gid) % SLOT_COLORS.length] ??
    SLOT_COLORS[0]

  // Sessions keyed by "dow-groupId-HH:MM" for fast lookup
  const sessionKey = (dow: number, groupId: string, startTime: string) =>
    `${dow}-${groupId}-${startTime.slice(0, 5)}`

  const sessionMap: Record<string, SessionRow> = {}
  for (const s of sessions) {
    const dow = dateToDow(s.session_date)
    sessionMap[sessionKey(dow, s.group_id, s.start_time)] = s
  }

  // Time-axis rows
  const hours = Array.from(
    { length: MAX_HOUR - MIN_HOUR },
    (_, i) => MIN_HOUR + i,
  )
  const totalH = (MAX_HOUR - MIN_HOUR) * ROW_H

  // Cancel handler
  async function handleCancel() {
    setLoading(true)
    try {
      if (cancelMode === 'week') {
        await cancelWeekSessions(weekStart, weekEnd, reason)
      } else if (cancelMode === 'day') {
        await cancelDaySessions(todayStr, reason)
      }
    } finally {
      setLoading(false)
      setCancelMode(null)
      setReason('')
      router.refresh()
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Program</h1>

        <div className="flex flex-wrap items-center gap-2">
          {/* Week nav */}
          <div className="flex items-center gap-1">
            <a
              href={`/program?week=${weekOffset - 1}`}
              className="rounded border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              ← Önceki
            </a>
            <a
              href="/program"
              className="rounded border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Bugün
            </a>
            <a
              href={`/program?week=${weekOffset + 1}`}
              className="rounded border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Sonraki →
            </a>
          </div>

          {/* Cancel buttons */}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCancelMode('day')}
            >
              Bugünü İptal Et
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setCancelMode('week')}
            >
              Bu Haftayı İptal Et
            </Button>
          </div>
        </div>
      </div>

      {/* ── Calendar grid ── */}
      <div className="overflow-auto rounded-lg border bg-white shadow-sm">
        {/* Day header row */}
        <div
          className="sticky top-0 z-20 flex border-b bg-white"
          style={{ paddingLeft: TIME_W }}
        >
          {weekDays.map(({ date, label, dayName }) => {
            const isToday = date === todayStr
            return (
              <div
                key={date}
                className={`min-w-[110px] flex-1 border-l px-2 py-2 text-center ${
                  isToday ? 'bg-red-50' : ''
                }`}
              >
                <p
                  className={`text-xs font-medium ${
                    isToday ? 'text-primary' : 'text-gray-500'
                  }`}
                >
                  {dayName}
                </p>
                <p
                  className={`text-lg font-semibold leading-tight ${
                    isToday ? 'text-primary' : 'text-gray-900'
                  }`}
                >
                  {label}
                </p>
              </div>
            )
          })}
        </div>

        {/* Body: time column + day columns */}
        <div className="flex" style={{ height: totalH }}>
          {/* Time labels */}
          <div
            className="relative shrink-0 border-r"
            style={{ width: TIME_W }}
          >
            {hours.map((h) => (
              <div
                key={h}
                className="absolute w-full"
                style={{ top: (h - MIN_HOUR) * ROW_H - 8 }}
              >
                <span className="block px-1.5 text-right text-xs text-gray-400">
                  {String(h).padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map(({ date }, displayIdx) => {
            const dow = DISPLAY_TO_DOW[displayIdx]
            const isToday = date === todayStr
            const daySlots = slots.filter((s) => s.day_of_week === dow)

            return (
              <div
                key={date}
                className={`relative min-w-[110px] flex-1 border-l ${
                  isToday ? 'bg-red-50/40' : ''
                }`}
              >
                {/* Hour grid lines */}
                {hours.map((h) => (
                  <div
                    key={h}
                    className="pointer-events-none absolute w-full border-t border-gray-100"
                    style={{ top: (h - MIN_HOUR) * ROW_H }}
                  />
                ))}

                {/* Slot cards */}
                {daySlots.map((slot) => {
                  const startMins = toMins(slot.start_time)
                  const endMins = toMins(slot.end_time)
                  const top =
                    ((startMins - MIN_HOUR * 60) / 60) * ROW_H
                  const height = Math.max(
                    ((endMins - startMins) / 60) * ROW_H - 2,
                    20,
                  )

                  const sk = sessionKey(dow, slot.group_id, slot.start_time)
                  const session = sessionMap[sk]
                  const isCancelled = session?.status === 'cancelled'
                  const color = isCancelled
                    ? CANCELLED_COLOR
                    : groupColor(slot.group_id)

                  return (
                    <a
                      key={slot.id}
                      href={`/gruplar/${slot.groups.id}`}
                      title={`${slot.groups.name}${slot.groups.coachName ? ` · ${slot.groups.coachName}` : ''}`}
                      className="absolute left-0.5 right-0.5 overflow-hidden rounded transition-opacity hover:opacity-75"
                      style={{
                        top: top + 1,
                        height,
                        backgroundColor: color.bg,
                        borderLeft: `3px solid ${color.border}`,
                      }}
                    >
                      <div className="px-1.5 py-0.5">
                        <p
                          className={`truncate text-xs font-semibold leading-snug ${
                            isCancelled ? 'line-through opacity-60' : ''
                          }`}
                          style={{ color: color.text }}
                        >
                          {slot.groups.name}
                          {isCancelled && (
                            <span className="ml-1 font-normal">(İptal)</span>
                          )}
                        </p>
                        {height > 34 && (
                          <p
                            className="truncate text-xs leading-snug"
                            style={{ color: color.text, opacity: 0.7 }}
                          >
                            {slot.start_time.slice(0, 5)}–
                            {slot.end_time.slice(0, 5)}
                          </p>
                        )}
                        {height > 52 && slot.groups.coachName && (
                          <p
                            className="truncate text-xs leading-snug"
                            style={{ color: color.text, opacity: 0.55 }}
                          >
                            {slot.groups.coachName}
                          </p>
                        )}
                      </div>
                    </a>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Legend ── */}
      {sortedGroupIds.length > 0 && (
        <div className="flex flex-wrap gap-4">
          {sortedGroupIds.map((gid) => {
            const slot = slots.find((s) => s.group_id === gid)
            if (!slot) return null
            const color = groupColor(gid)
            return (
              <a
                key={gid}
                href={`/gruplar/${slot.groups.id}`}
                className="flex items-center gap-1.5 hover:opacity-75"
              >
                <span
                  className="inline-block h-3 w-3 rounded-sm"
                  style={{ backgroundColor: color.border }}
                />
                <span className="text-xs font-medium text-gray-700">
                  {slot.groups.name}
                </span>
                {slot.groups.coachName && (
                  <span className="text-xs text-gray-400">
                    ({slot.groups.coachName})
                  </span>
                )}
              </a>
            )
          })}
        </div>
      )}

      {/* ── Empty state ── */}
      {slots.length === 0 && (
        <div className="rounded-lg border bg-white p-16 text-center text-sm text-gray-400">
          Henüz program tanımlanmamış. Gruplar sayfasından slot ekleyebilirsiniz.
        </div>
      )}

      {/* ── Cancel Dialog ── */}
      <Dialog
        open={cancelMode !== null}
        onOpenChange={(open) => !open && setCancelMode(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {cancelMode === 'week'
                ? 'Bu Haftayı İptal Et'
                : 'Bugünü İptal Et'}
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-gray-500">
            {cancelMode === 'week'
              ? `${weekStart} – ${weekEnd} arasındaki tüm planlanmış antrenmanlar iptal edilecek.`
              : `${todayStr} tarihindeki tüm planlanmış antrenmanlar iptal edilecek.`}
          </p>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              İptal sebebi{' '}
              <span className="font-normal text-gray-400">(opsiyonel)</span>
            </label>
            <textarea
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
                setCancelMode(null)
                setReason('')
              }}
            >
              Vazgeç
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={loading}
            >
              {loading ? 'İptal ediliyor...' : 'Evet, İptal Et'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
  )
}
