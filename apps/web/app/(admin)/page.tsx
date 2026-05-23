import { createClient } from '@/lib/supabase/server'
import KpiCards from '@/components/dashboard/kpi-cards'
import TodaySessions from '@/components/dashboard/today-sessions'
import RevenueChart from '@/components/dashboard/revenue-chart'
import RecentPayments from '@/components/dashboard/recent-payments'
import AttendanceTrend from '@/components/dashboard/attendance-trend'
import GroupDistribution from '@/components/dashboard/group-distribution'
import TopAbsentStudents from '@/components/dashboard/top-absent-students'
import { today, nDaysAgo, startOfMonth, startOfYear, TR_MONTHS } from '@/lib/utils'

export default async function DashboardPage() {
  const supabase = await createClient()
  const todayStr = today()
  const monthStart = startOfMonth()
  const yearStart = startOfYear()
  const thirtyDaysAgo = nDaysAgo(29)
  const currentYear = new Date().getFullYear()

  const [r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14] = await Promise.all([
    // 1. Active students count
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'active'),

    // 2. This month's aidat payments
    supabase.from('payments').select('amount').eq('invoice_type', 'aidat').gte('payment_date', monthStart),

    // 3. Pending aidat invoices (borç)
    supabase.from('aidat_invoices').select('amount, paid_amount').in('status', ['pending', 'partial']),

    // 4. Today's sessions with group name
    supabase
      .from('attendance_sessions')
      .select('id, start_time, end_time, status, groups(name)')
      .eq('session_date', todayStr)
      .order('start_time'),

    // 5. Pending applications count
    supabase.from('applications').select('*', { count: 'exact', head: true }).in('status', ['new', 'contacted']),

    // 6. This year's aidat payments (for collection rate numerator)
    supabase.from('payments').select('amount').eq('invoice_type', 'aidat').gte('payment_date', yearStart),

    // 7. This year's aidat invoices total (for collection rate denominator)
    supabase.from('aidat_invoices').select('amount').eq('period_year', currentYear),

    // 8. Last 5 payments with student name
    supabase
      .from('payments')
      .select('id, amount, payment_date, invoice_type, students(full_name)')
      .order('created_at', { ascending: false })
      .limit(5),

    // 9. Last 30 days absent records with session dates (used for trend)
    supabase
      .from('attendance_records')
      .select('student_id, students(full_name), attendance_sessions!inner(session_date)')
      .eq('status', 'absent')
      .gte('attendance_sessions.session_date', thirtyDaysAgo),

    // 10. This year payments by month (for chart)
    supabase.from('payments').select('amount, payment_date').gte('payment_date', yearStart),

    // 11. This year expenses by month (for chart)
    supabase.from('expenses').select('amount, expense_date').gte('expense_date', yearStart),

    // 12. Active student_groups with group names (for donut)
    supabase.from('student_groups').select('group_id, groups(name)').eq('is_active', true),

    // 13. All-time absent records with student names (for top 5)
    supabase.from('attendance_records').select('student_id, students(full_name)').eq('status', 'absent'),

    // 14. Active groups count (KPI)
    supabase.from('groups').select('*', { count: 'exact', head: true }).eq('is_active', true),
  ])

  // ── KPI computations ──────────────────────────────────────────────────────
  const activeStudents = r1.count ?? 0

  const monthAidatRevenue = (r2.data ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0)

  const pendingDebt = (r3.data ?? []).reduce(
    (sum, inv) => sum + ((inv.amount ?? 0) - (inv.paid_amount ?? 0)),
    0
  )

  const todaySessions = (r4.data ?? []) as Array<{
    id: string; start_time: string; end_time: string; status: string; groups: { name: string } | null
  }>

  const pendingApplications = r5.count ?? 0
  const activeGroups = r14.count ?? 0

  const yearAidatPaid = (r6.data ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0)
  const yearAidatTotal = (r7.data ?? []).reduce((sum, inv) => sum + (inv.amount ?? 0), 0)
  const collectionRate = yearAidatTotal > 0 ? Math.round((yearAidatPaid / yearAidatTotal) * 100) : 0

  const recentPayments = (r8.data ?? []) as unknown as Array<{
    id: string; amount: number; payment_date: string | null; invoice_type: string
    students: { full_name: string } | null
  }>

  // Derive today's absent + trend from r9
  const absentRecords30d = (r9.data ?? []) as Array<{
    student_id: string
    students: { full_name: string } | null
    attendance_sessions: { session_date: string } | null
  }>

  const todayAbsent = absentRecords30d.filter(
    (rec) => rec.attendance_sessions?.session_date === todayStr
  ).length

  const absentByDate: Record<string, number> = {}
  absentRecords30d.forEach((rec) => {
    const d = rec.attendance_sessions?.session_date
    if (d) absentByDate[d] = (absentByDate[d] ?? 0) + 1
  })
  const trendData = Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    const dateStr = d.toISOString().split('T')[0]
    return {
      date: `${d.getDate()}/${d.getMonth() + 1}`,
      absent: absentByDate[dateStr] ?? 0,
    }
  })

  // ── Annual revenue vs expense chart ────────────────────────────────────────
  const revenueByMonth: Record<number, number> = {}
  ;(r10.data ?? []).forEach((p: any) => {
    const m = new Date(p.payment_date).getMonth()
    revenueByMonth[m] = (revenueByMonth[m] ?? 0) + (p.amount ?? 0)
  })
  const expenseByMonth: Record<number, number> = {}
  ;(r11.data ?? []).forEach((e: any) => {
    const m = new Date(e.expense_date).getMonth()
    expenseByMonth[m] = (expenseByMonth[m] ?? 0) + (e.amount ?? 0)
  })
  const annualChartData = TR_MONTHS.map((month, i) => ({
    month: month.slice(0, 3),
    gelir: revenueByMonth[i] ?? 0,
    gider: expenseByMonth[i] ?? 0,
  }))

  // ── Group distribution ─────────────────────────────────────────────────────
  const groupCounts: Record<string, { name: string; count: number }> = {}
  ;(r12.data ?? []).forEach((sg: any) => {
    const gid = sg.group_id
    const gname = sg.groups?.name ?? 'Bilinmiyor'
    if (!groupCounts[gid]) groupCounts[gid] = { name: gname, count: 0 }
    groupCounts[gid].count++
  })
  const groupDistribution = Object.values(groupCounts).sort((a, b) => b.count - a.count)

  // ── Top 5 absent students (all-time) ──────────────────────────────────────
  const studentAbsences: Record<string, { name: string; count: number }> = {}
  ;(r13.data ?? []).forEach((rec: any) => {
    const sid = rec.student_id
    const sname = rec.students?.full_name ?? 'Bilinmiyor'
    if (!studentAbsences[sid]) studentAbsences[sid] = { name: sname, count: 0 }
    studentAbsences[sid].count++
  })
  const topAbsentStudents = Object.entries(studentAbsences)
    .map(([id, { name, count }]) => ({ id, name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Row 1 — KPI Cards */}
      <KpiCards
        activeStudents={activeStudents}
        activeGroups={activeGroups}
        pendingApplications={pendingApplications}
        monthAidatRevenue={monthAidatRevenue}
        pendingDebt={pendingDebt}
        collectionRate={collectionRate}
      />

      {/* Row 2 — Schedule, Payments, Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TodaySessions sessions={todaySessions as any} />
        <RecentPayments payments={recentPayments} />
        <AttendanceTrend data={trendData} />
        <RevenueChart data={annualChartData} />
      </div>

      {/* Row 3 — Group Donut + Top Absent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GroupDistribution data={groupDistribution} />
        <TopAbsentStudents students={topAbsentStudents} />
      </div>
    </div>
  )
}
