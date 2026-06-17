import { createClient } from '@/lib/supabase/server'
import { TR_DAYS } from '@/lib/utils'
import ProgramClient, { type SlotRow, type SessionRow } from './ProgramClient'

// ─── Week bounds (Mon–Sun) ────────────────────────────────────────────────────

function getWeekBounds(weekOffset: number) {
  const now = new Date()
  // JS getDay(): 0=Sun … 6=Sat → convert to display index 0=Mon
  const displayDow = now.getDay() === 0 ? 6 : now.getDay() - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - displayDow + weekOffset * 7)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
    monday,
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProgramPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const supabase = await createClient()
  const { week } = await searchParams
  const weekOffset = Number(week ?? 0)
  const { start, end, monday } = getWeekBounds(weekOffset)

  // 1. Recurring weekly schedule slots + group info
  const { data: slotsRaw } = await supabase
    .from('group_schedule_slots')
    .select(
      'id, day_of_week, start_time, end_time, group_id, groups!inner(id, name, is_active, primary_coach_id)',
    )
    .order('start_time')

  // 2. Staff names for coaches referenced in those groups
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

  // 3. Enrich slots → SlotRow[]
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
    },
  }))

  // 4. Attendance sessions for current week (to show cancellation status)
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

  // 5. Build weekDays array (Mon–Sun, display index 0–6)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return {
      date: d.toISOString().split('T')[0],
      label: d.getDate().toString(),
      dayName: TR_DAYS[i],
    }
  })

  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <ProgramClient
      slots={slots}
      sessions={sessions}
      weekDays={weekDays}
      weekOffset={weekOffset}
      todayStr={todayStr}
      weekStart={start}
      weekEnd={end}
    />
  )
}
