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
import WeekGrid, {
  type SlotRow,
  type SessionRow,
  type WeekDay,
  SLOT_COLORS,
} from '@/components/program/week-grid'
import { cancelWeekSessions, cancelDaySessions } from './actions'

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

export default function TakvimClient({
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

  const sortedGroupIds = Array.from(new Set(slots.map((s) => s.group_id))).sort(
    (a, b) => {
      const na = slots.find((s) => s.group_id === a)?.groups.name ?? ''
      const nb = slots.find((s) => s.group_id === b)?.groups.name ?? ''
      return na.localeCompare(nb, 'tr')
    },
  )

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
        <div className="flex flex-wrap items-center gap-2">
          {/* Week nav */}
          <div className="flex items-center gap-1">
            <a
              href={`/?week=${weekOffset - 1}`}
              className="rounded border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted transition-colors"
            >
              ← Önceki
            </a>
            <a
              href="/"
              className="rounded border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted transition-colors"
            >
              Bugün
            </a>
            <a
              href={`/?week=${weekOffset + 1}`}
              className="rounded border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted transition-colors"
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
      <WeekGrid slots={slots} sessions={sessions} weekDays={weekDays} todayStr={todayStr} rowH={64} />

      {/* ── Legend ── */}
      {sortedGroupIds.length > 0 && (
        <div className="flex flex-wrap gap-4">
          {sortedGroupIds.map((gid) => {
            const slot = slots.find((s) => s.group_id === gid)
            if (!slot) return null
            const idx = sortedGroupIds.indexOf(gid)
            const color = SLOT_COLORS[idx % SLOT_COLORS.length]
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
                <span className="text-xs font-medium text-foreground">
                  {slot.groups.name}
                </span>
                {slot.groups.coachName && (
                  <span className="text-xs text-muted-foreground">
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
        <div className="rounded-lg border bg-card p-16 text-center text-sm text-muted-foreground">
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

          <p className="text-sm text-muted-foreground">
            {cancelMode === 'week'
              ? `${weekStart} – ${weekEnd} arasındaki tüm planlanmış antrenmanlar iptal edilecek.`
              : `${todayStr} tarihindeki tüm planlanmış antrenmanlar iptal edilecek.`}
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
