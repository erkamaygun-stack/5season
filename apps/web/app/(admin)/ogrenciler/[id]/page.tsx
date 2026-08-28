import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StudentDetailTabs from '@/components/ogrenciler/detail/student-detail-tabs'

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: student } = await supabase
    .from('students')
    .select(`
      *,
      student_groups(id, joined_at, left_at, is_active, groups(id, name)),
      guardian_students(guardian_id, relation, is_primary, guardians(id, full_name, phone_e164, status))
    `)
    .eq('id', id)
    .single()

  if (!student) notFound()

  const [
    { data: attendance },
    { data: aidatInvoices },
    { data: equipmentInvoices },
    { data: payments },
    { data: groups },
  ] = await Promise.all([
    supabase
      .from('attendance_records')
      .select('id, status, attendance_sessions(session_date, groups(name))')
      .eq('student_id', id)
      .gte('attendance_sessions.session_date', new Date(Date.now() - 90 * 864e5).toISOString().split('T')[0])
      .order('attendance_sessions(session_date)', { ascending: false }),
    supabase
      .from('aidat_invoices')
      .select('*')
      .eq('student_id', id)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false }),
    supabase
      .from('equipment_invoices')
      .select('*')
      .eq('student_id', id)
      .order('created_at', { ascending: false }),
    (supabase as any)
      .from('payments')
      .select('*')
      .eq('student_id', id)
      .eq('status', 'active')
      .order('payment_date', { ascending: false }),
    supabase.from('groups').select('id, name').order('name'),
  ])

  return (
    <div>
      <div className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold text-foreground">{student.full_name}</h1>
        <p className="text-sm text-muted-foreground">Öğrenci Detayı</p>
      </div>
      <StudentDetailTabs
        student={student as any}
        attendance={(attendance ?? []) as any}
        aidatInvoices={(aidatInvoices ?? []) as any}
        equipmentInvoices={(equipmentInvoices ?? []) as any}
        payments={(payments ?? []) as any}
        groups={(groups ?? []) as any}
      />
    </div>
  )
}
