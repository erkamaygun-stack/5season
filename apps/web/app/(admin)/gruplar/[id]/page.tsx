import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { today } from '@/lib/utils'
import GrupDetailTabs from '@/components/gruplar/grup-detail-tabs'

export default async function GrupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const todayStr = today()

  const [{ data: group }, { data: sessions }, { data: coaches }, { data: allStudents }, { data: todaySessionsRaw }] =
    await Promise.all([
      supabase
        .from('groups')
        .select(`
          id, name, monthly_fee, is_active, primary_coach_id, color, category,
          staff(id, full_name),
          group_schedule_slots(id, day_of_week, start_time, end_time),
          student_groups(id, is_active, joined_at, left_at, students(id, full_name, status))
        `)
        .eq('id', id)
        .single(),
      supabase
        .from('attendance_sessions')
        .select('id, session_date, start_time, end_time, status, cancellation_reason, cancelled_at, notes')
        .eq('group_id', id)
        .order('session_date', { ascending: false })
        .limit(100),
      supabase
        .from('staff')
        .select('id, full_name')
        .eq('staff_type', 'coach')
        .eq('is_active', true)
        .order('full_name'),
      supabase
        .from('students')
        .select('id, full_name, status')
        .eq('status', 'active')
        .order('full_name'),
      supabase
        .from('attendance_sessions')
        .select(
          'id, start_time, end_time, status, group_id, groups(name), attendance_records(id, status, student_id, students(full_name))',
        )
        .eq('group_id', id)
        .eq('session_date', todayStr)
        .order('start_time'),
    ])

  if (!group) notFound()

  const activeStudentGroups = ((group as any).student_groups ?? []).filter(
    (sg: any) => sg.is_active && sg.students,
  )
  const groupStudentMap: Record<string, { id: string; full_name: string }[]> = {
    [id]: activeStudentGroups.map((sg: any) => ({ id: sg.students.id, full_name: sg.students.full_name })),
  }

  const activeStudentIds = activeStudentGroups.map((sg: any) => sg.students.id)
  const { data: leaveRequestsRaw } = activeStudentIds.length
    ? await supabase
        .from('leave_requests')
        .select('id, session_date, reason, status, students(full_name)')
        .in('student_id', activeStudentIds)
        .in('status', ['submitted', 'seen'])
        .gte('session_date', todayStr)
        .order('session_date')
    : { data: [] as any[] }

  return (
    <div>
      <div className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold text-foreground">{(group as any).name}</h1>
        <p className="text-sm text-muted-foreground">Grup Detayı</p>
      </div>
      <GrupDetailTabs
        group={group as any}
        sessions={sessions ?? []}
        coaches={coaches ?? []}
        allStudents={allStudents ?? []}
        todaySessions={(todaySessionsRaw ?? []) as any}
        groupStudentMap={groupStudentMap}
        leaveRequests={(leaveRequestsRaw ?? []) as any}
      />
    </div>
  )
}
