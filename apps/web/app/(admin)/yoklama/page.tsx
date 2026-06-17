import { createClient } from '@/lib/supabase/server'
import { today } from '@/lib/utils'
import YoklamaClient from './yoklama-client'
import LeaveRequestsSection from './leave-requests-section'

export default async function YoklamaPage() {
  const supabase = await createClient()
  const todayStr = today()

  const [sessionsRes, leaveRes] = await Promise.all([
    supabase
      .from('attendance_sessions')
      .select(`
        id, start_time, end_time, status, group_id,
        groups(name),
        attendance_records(id, status, student_id, students(full_name))
      `)
      .eq('session_date', todayStr)
      .order('start_time'),

    // Önümüzdeki 14 günü kapsayan, henüz 'applied' olmayan izin talepleri
    supabase
      .from('leave_requests')
      .select(`
        id, session_date, reason, status,
        students(full_name)
      `)
      .in('status', ['submitted', 'seen'])
      .gte('session_date', todayStr)
      .order('session_date'),
  ])

  const sessions = sessionsRes.data
  const leaveRequests = leaveRes.data ?? []

  // Her grup için aktif öğrencileri çek
  const groupIds = Array.from(new Set((sessions ?? []).map((s: any) => s.group_id).filter(Boolean)))
  const { data: studentGroups } = groupIds.length > 0
    ? await supabase
        .from('student_groups')
        .select('group_id, student_id, students(id, full_name)')
        .in('group_id', groupIds)
        .eq('is_active', true)
    : { data: [] }

  const groupStudentMap: Record<string, { id: string; full_name: string }[]> = {}
  for (const sg of studentGroups ?? []) {
    const s = (sg as any).students
    if (!s) continue
    if (!groupStudentMap[sg.group_id]) groupStudentMap[sg.group_id] = []
    groupStudentMap[sg.group_id].push({ id: s.id, full_name: s.full_name })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-gray-900">Yoklama — Bugün</h1>
        {!sessions || sessions.length === 0 ? (
          <div className="rounded-lg border bg-white p-12 text-center text-sm text-gray-500">
            Bugün planlanmış antrenman yok.
          </div>
        ) : (
          <YoklamaClient sessions={sessions as any} groupStudentMap={groupStudentMap} />
        )}
      </div>

      <LeaveRequestsSection items={leaveRequests as any} />
    </div>
  )
}
