import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StudentDetailTabs from '@/components/ogrenciler/detail/student-detail-tabs'
import { isReadOnlyRealDataTestMode } from '@/lib/safety/environment'

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const modernStudentResult = await (supabase as any)
    .from('students')
    .select(`
      *,
      student_groups(id, joined_at, left_at, is_active, groups(id, name)),
      guardian_students(guardian_id, relation, is_primary, guardians(id, full_name, phone_e164, status))
    `)
    .eq('id', id)
    .single()

  let student = modernStudentResult.data as any
  if (modernStudentResult.error && isReadOnlyRealDataTestMode()) {
    const legacyStudentResult = await supabase
      .from('students')
      .select(`
        *,
        student_groups(id, joined_at, left_at, is_active, groups(id, name)),
        parent_student(parent_profile_id, relation, is_primary, profiles(id, full_name, phone, email))
      `)
      .eq('id', id)
      .single()

    if (legacyStudentResult.data) {
      const legacyStudent = legacyStudentResult.data as any
      student = {
        ...legacyStudent,
        guardian_students: (legacyStudent.parent_student ?? []).map((link: any) => ({
          guardian_id: link.parent_profile_id,
          relation: link.relation,
          is_primary: link.is_primary,
          guardians: link.profiles
            ? {
                id: link.profiles.id,
                full_name: link.profiles.full_name,
                phone_e164: link.profiles.phone,
                status: 'legacy',
              }
            : null,
        })),
      }
    }
  }

  if (!student) notFound()

  const [
    attendanceResult,
    aidatInvoicesResult,
    equipmentInvoicesResult,
    paymentsResult,
    groupsResult,
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

  let payments = paymentsResult.data
  if (paymentsResult.error && isReadOnlyRealDataTestMode()) {
    const legacyPaymentsResult = await supabase
      .from('payments')
      .select('*')
      .eq('student_id', id)
      .order('payment_date', { ascending: false })
    payments = legacyPaymentsResult.data
  }

  return (
    <div>
      <div className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold text-foreground">{student.full_name}</h1>
        <p className="text-sm text-muted-foreground">Öğrenci Detayı</p>
      </div>
      <StudentDetailTabs
        student={student as any}
        attendance={(attendanceResult.data ?? []) as any}
        aidatInvoices={(aidatInvoicesResult.data ?? []) as any}
        equipmentInvoices={(equipmentInvoicesResult.data ?? []) as any}
        payments={(payments ?? []) as any}
        groups={(groupsResult.data ?? []) as any}
      />
    </div>
  )
}
