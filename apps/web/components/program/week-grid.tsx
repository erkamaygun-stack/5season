// Program takvimi ızgarası — hem /program sayfasında hem anasayfadaki mini
// takvimde kullanılır; veri çekmez, saf props alır.

import { getGroupColor, hexToRgba, lightenHex, darkenHex, isLightColor } from '@/lib/group-colors'
import { compareGroupNames } from '@/lib/utils'

export type SlotRow = {
  id: string
  day_of_week: number // Postgres DOW: 0=Sun, 1=Mon … 6=Sat
  start_time: string  // "HH:MM:SS"
  end_time: string
  group_id: string
  groups: {
    id: string
    name: string
    primary_coach_id: string | null
    coachName: string | null
    color: string | null
  }
}

export type SessionRow = {
  id: string
  group_id: string
  session_date: string // "YYYY-MM-DD"
  start_time: string
  status: string
}

export type WeekDay = {
  date: string    // "YYYY-MM-DD"
  label: string   // "19"
  dayName: string // "Pazartesi"
}

// Görüntü sütunları 0–6 = Pzt–Paz; Postgres DOW'a eşle
// Pzt→1, Sal→2, Çar→3, Per→4, Cum→5, Cmt→6, Paz→0
export const DISPLAY_TO_DOW = [1, 2, 3, 4, 5, 6, 0]

export const CANCELLED_COLOR = { bg: '#450a0a', border: '#ef4444', text: '#fca5a5' }

// Grubun atanmış rengine göre takvim slotu rengi üretir
export function getSlotColor(colorKey: string | null | undefined, fallbackIndex: number) {
  const c = getGroupColor(colorKey, fallbackIndex)
  // Beyaz/açık renkler kart zemininde görünmez olur (ör. "U13" beyaza denk gelirse
  // kaybolur) — bu durumda kenarlık/metni koyulaştırıp görünür tutuyoruz
  const light = isLightColor(c.hex)
  return {
    bg: hexToRgba(c.hex, light ? 0.35 : 0.18),
    border: light ? darkenHex(c.hex, 0.35) : c.hex,
    text: light ? darkenHex(c.hex, 0.55) : lightenHex(c.hex, 0.55),
  }
}

export function toMins(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function dateToDow(dateStr: string): number {
  // Postgres-uyumlu DOW döndürür (0=Paz … 6=Cmt), zaman dilimi güvenli
  const [y, mo, d] = dateStr.split('-').map(Number)
  return new Date(y, mo - 1, d).getDay()
}

const TIME_W = 52 // px, sol saat etiketi sütunu

type WeekGridProps = {
  slots: SlotRow[]
  sessions: SessionRow[]
  weekDays: WeekDay[]
  todayStr: string
  rowH?: number
  minHour?: number
  maxHour?: number
  showCoach?: boolean
  href?: (slot: SlotRow) => string | null
}

export default function WeekGrid({
  slots,
  sessions,
  weekDays,
  todayStr,
  rowH = 64,
  minHour,
  maxHour,
  showCoach = true,
  href = (slot) => `/gruplar/${slot.groups.id}`,
}: WeekGridProps) {
  // Saat aralığı verilmezse slotlardan otomatik hesaplanır
  const computedMin = slots.length
    ? Math.floor(Math.min(...slots.map((s) => toMins(s.start_time))) / 60)
    : 8
  const computedMax = slots.length
    ? Math.ceil(Math.max(...slots.map((s) => toMins(s.end_time))) / 60)
    : 22
  const MIN_HOUR = minHour ?? computedMin
  const MAX_HOUR = maxHour ?? computedMax

  // Gruba göre stabil renk ata (isme göre sıralı)
  const sortedGroupIds = Array.from(new Set(slots.map((s) => s.group_id))).sort(
    (a, b) => {
      const na = slots.find((s) => s.group_id === a)?.groups.name ?? ''
      const nb = slots.find((s) => s.group_id === b)?.groups.name ?? ''
      return compareGroupNames(na, nb)
    },
  )
  // Oturumları "dow-groupId-HH:MM" ile hızlı erişim için indeksle
  const sessionKey = (dow: number, groupId: string, startTime: string) =>
    `${dow}-${groupId}-${startTime.slice(0, 5)}`

  const sessionMap: Record<string, SessionRow> = {}
  for (const s of sessions) {
    const dow = dateToDow(s.session_date)
    sessionMap[sessionKey(dow, s.group_id, s.start_time)] = s
  }

  const hours = Array.from(
    { length: MAX_HOUR - MIN_HOUR },
    (_, i) => MIN_HOUR + i,
  )
  const totalH = (MAX_HOUR - MIN_HOUR) * rowH

  return (
    <div className="overflow-auto rounded-lg border bg-card shadow-sm">
      {/* Gün başlık satırı */}
      <div
        className="sticky top-0 z-20 flex border-b bg-card"
        style={{ paddingLeft: TIME_W }}
      >
        {weekDays.map(({ date, label, dayName }) => {
          const isToday = date === todayStr
          return (
            <div
              key={date}
              className={`min-w-[110px] flex-1 border-l px-2 py-2 text-center ${
                isToday ? 'bg-primary/10' : ''
              }`}
            >
              <p
                className={`text-xs font-medium ${
                  isToday ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {dayName}
              </p>
              <p
                className={`text-lg font-semibold leading-tight ${
                  isToday ? 'text-primary' : 'text-foreground'
                }`}
              >
                {label}
              </p>
            </div>
          )
        })}
      </div>

      {/* Gövde: saat sütunu + gün sütunları */}
      <div className="flex" style={{ height: totalH }}>
        {/* Saat etiketleri */}
        <div className="relative shrink-0 border-r" style={{ width: TIME_W }}>
          {hours.map((h) => (
            <div
              key={h}
              className="absolute w-full"
              style={{ top: (h - MIN_HOUR) * rowH - 8 }}
            >
              <span className="block px-1.5 text-right text-xs text-muted-foreground/60">
                {String(h).padStart(2, '0')}:00
              </span>
            </div>
          ))}
        </div>

        {/* Gün sütunları */}
        {weekDays.map(({ date }, displayIdx) => {
          const dow = DISPLAY_TO_DOW[displayIdx]
          const isToday = date === todayStr
          const daySlots = slots.filter((s) => s.day_of_week === dow)

          return (
            <div
              key={date}
              className={`relative min-w-[110px] flex-1 border-l ${
                isToday ? 'bg-primary/5' : ''
              }`}
            >
              {/* Saat çizgileri */}
              {hours.map((h) => (
                <div
                  key={h}
                  className="pointer-events-none absolute w-full border-t border-border/40"
                  style={{ top: (h - MIN_HOUR) * rowH }}
                />
              ))}

              {/* Slot kartları */}
              {daySlots.map((slot) => {
                const startMins = toMins(slot.start_time)
                const endMins = toMins(slot.end_time)
                const top = ((startMins - MIN_HOUR * 60) / 60) * rowH
                const height = Math.max(
                  ((endMins - startMins) / 60) * rowH - 2,
                  20,
                )

                const sk = sessionKey(dow, slot.group_id, slot.start_time)
                const session = sessionMap[sk]
                const isCancelled = session?.status === 'cancelled'
                const color = isCancelled
                  ? CANCELLED_COLOR
                  : getSlotColor(slot.groups.color, sortedGroupIds.indexOf(slot.group_id))

                const linkHref = href(slot)

                const content = (
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
                        {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                      </p>
                    )}
                    {showCoach && height > 52 && slot.groups.coachName && (
                      <p
                        className="truncate text-xs leading-snug"
                        style={{ color: color.text, opacity: 0.55 }}
                      >
                        {slot.groups.coachName}
                      </p>
                    )}
                  </div>
                )

                const style = {
                  top: top + 1,
                  height,
                  backgroundColor: color.bg,
                  borderLeft: `3px solid ${color.border}`,
                }

                return linkHref ? (
                  <a
                    key={slot.id}
                    href={linkHref}
                    title={`${slot.groups.name}${slot.groups.coachName ? ` · ${slot.groups.coachName}` : ''}`}
                    className="absolute left-0.5 right-0.5 overflow-hidden rounded transition-opacity hover:opacity-75"
                    style={style}
                  >
                    {content}
                  </a>
                ) : (
                  <div
                    key={slot.id}
                    title={`${slot.groups.name}${slot.groups.coachName ? ` · ${slot.groups.coachName}` : ''}`}
                    className="absolute left-0.5 right-0.5 overflow-hidden rounded"
                    style={style}
                  >
                    {content}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
