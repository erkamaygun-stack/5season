import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GrupDetailTabs from '@/components/gruplar/grup-detail-tabs'

export default async function GrupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: group }, { data: sessions }, { data: coaches }, { data: allStudents }] =
    await Promise.all([
      supabase
        .from('groups')
        .select(`
          id, name, age_min, age_max, capacity, monthly_fee, is_active, primary_coach_id,
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
    ])

  if (!group) notFound()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">{(group as any).name}</h1>
        <p className="text-sm text-gray-500 mt-0.5">Grup Detayı</p>
      </div>
      <GrupDetailTabs
        group={group as any}
        sessions={sessions ?? []}
        coaches={coaches ?? []}
        allStudents={allStudents ?? []}
      />
    </div>
  )
}
