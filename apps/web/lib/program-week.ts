import type { createClient } from '@/lib/supabase/server'
import { TR_DAYS, toLocalDateString, today } from '@/lib/utils'
import type { SlotRow, SessionRow, WeekDay } from '@/components/program/week-grid'

export type WeekData = {
  slots: SlotRow[]
  sessions: SessionRow[]
  weekDays: WeekDay[]
  weekOffset: number
  todayStr: string
  weekStart: string
  weekEnd: string
}

export function getWeekBounds(weekOffset: number) {
  const now = new Date()
  const displayDow = now.getDay() === 0 ? 6 : now.getDay() - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - displayDow + weekOffset * 7)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    start: toLocalDateString(monday),
    end: toLocalDateString(sunday),
    monday,
  }
}

export async function getWeekData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  weekOffset: number,
): Promise<WeekData> {
  const { start, end, monday } = getWeekBounds(weekOffset)

  const { data: slotsRaw } = await supabase
    .from('group_schedule_slots')
    .select(
      'id, day_of_week, start_time, end_time, group_id, groups!inner(id, name, is_active, primary_coach_id, color)',
    )
    .order('start_time')

  const activeSlots = (slotsRaw ?? []).filter(
    (s: any) => s.groups?.is_active === true,
  )
  const coachIds = Array.from(
    new Set(
      activeSlots
        .map((s: any) => s.groups?.primary_coach_id as string | null)
        .filter(Boolean),
    ),
  ) as string[]

  const staffMap: Record<string, string> = {}
  if (coachIds.length > 0) {
    const { data: staffData } = await supabase
      .from('staff')
      .select('id, full_name')
      .in('id', coachIds)
    ;(staffData ?? []).forEach((s: any) => {
      staffMap[s.id] = s.full_name
    })
  }

  const slots: SlotRow[] = activeSlots.map((s: any) => ({
    id: s.id,
    day_of_week: s.day_of_week,
    start_time: s.start_time,
    end_time: s.end_time,
    group_id: s.group_id,
    groups: {
      id: s.groups.id,
      name: s.groups.name,
      primary_coach_id: s.groups.primary_coach_id ?? null,
      coachName: s.groups.primary_coach_id
        ? (staffMap[s.groups.primary_coach_id] ?? null)
        : null,
      color: s.groups.color ?? null,
    },
  }))

  const { data: sessionsRaw } = await supabase
    .from('attendance_sessions')
    .select('id, group_id, session_date, start_time, status')
    .gte('session_date', start)
    .lte('session_date', end)

  const sessions: SessionRow[] = (sessionsRaw ?? []).map((s: any) => ({
    id: s.id,
    group_id: s.group_id,
    session_date: s.session_date,
    start_time: s.start_time,
    status: s.status,
  }))

  const weekDays: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return {
      date: toLocalDateString(d),
      label: d.getDate().toString(),
      dayName: TR_DAYS[i],
    }
  })

  return {
    slots,
    sessions,
    weekDays,
    weekOffset,
    todayStr: today(),
    weekStart: start,
    weekEnd: end,
  }
}
