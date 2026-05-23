import { createClient } from '@/lib/supabase/server'
import StudentTable from '@/components/ogrenciler/student-table'
import StudentFilters from '@/components/ogrenciler/student-filters'
import AddStudentModal from '@/components/ogrenciler/add-student-modal'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'

export default async function OgrencilerPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string
    search?: string
    phone?: string
    group_id?: string
    age_min?: string
    age_max?: string
    uniform?: string
  }>
}) {
  const supabase = await createClient()
  const { status, search, phone, group_id, age_min, age_max, uniform } = await searchParams

  const { data: groups } = await supabase.from('groups').select('id, name').order('name')

  // Pre-filter by group: find student IDs with active membership in the given group
  let filteredByGroup: string[] | null = null
  if (group_id) {
    const { data: sg } = await supabase
      .from('student_groups')
      .select('student_id')
      .eq('group_id', group_id)
      .eq('is_active', true)
    filteredByGroup = sg?.map((r) => r.student_id) ?? []
  }

  // Pre-filter by parent phone: find student IDs whose parent matches the phone
  let filteredByPhone: string[] | null = null
  if (phone) {
    const { data: parentProfiles } = await supabase
      .from('profiles')
      .select('id')
      .ilike('phone', `%${phone}%`)
    const parentIds = parentProfiles?.map((p) => p.id) ?? []
    if (parentIds.length > 0) {
      const { data: ps } = await supabase
        .from('parent_student')
        .select('student_id')
        .in('parent_profile_id', parentIds)
      filteredByPhone = ps?.map((r) => r.student_id) ?? []
    } else {
      filteredByPhone = []
    }
  }

  let query = supabase
    .from('students')
    .select(`
      id, full_name, birth_date, status, enrollment_date, has_received_uniform,
      student_groups(is_active, groups(id, name)),
      parent_student(is_primary, relation, profiles(id, full_name, phone))
    `)
    .order('full_name')

  if (status) query = query.eq('status', status)
  if (search) query = query.ilike('full_name', `%${search}%`)
  if (uniform === 'received') query = query.eq('has_received_uniform', true)
  if (uniform === 'not_received') query = query.or('has_received_uniform.is.null,has_received_uniform.eq.false')

  // Age range: age N means born ≤ N years ago (older than min, younger than max)
  const today = new Date()
  if (age_min) {
    const cutoff = new Date(today.getFullYear() - parseInt(age_min), today.getMonth(), today.getDate())
    query = query.lte('birth_date', cutoff.toISOString().split('T')[0])
  }
  if (age_max) {
    const cutoff = new Date(today.getFullYear() - parseInt(age_max) - 1, today.getMonth(), today.getDate())
    query = query.gte('birth_date', cutoff.toISOString().split('T')[0])
  }

  // Apply ID-based pre-filters (intersection if multiple)
  const idSets = [filteredByGroup, filteredByPhone].filter((s): s is string[] => s !== null)
  if (idSets.length > 0) {
    const intersection = idSets.reduce((a, b) => a.filter((id) => b.includes(id)))
    query = intersection.length > 0
      ? query.in('id', intersection)
      : query.eq('id', '00000000-0000-0000-0000-000000000000')
  }

  const { data: students } = await query

  // Compute outstanding debt per student (pending + partial aidat)
  const studentIds = students?.map((s) => s.id) ?? []
  const debtMap: Record<string, number> = {}
  if (studentIds.length > 0) {
    const { data: invoices } = await supabase
      .from('aidat_invoices')
      .select('student_id, amount, paid_amount')
      .in('student_id', studentIds)
      .in('status', ['pending', 'partial'])
    for (const inv of invoices ?? []) {
      const remaining = (inv.amount ?? 0) - (inv.paid_amount ?? 0)
      debtMap[inv.student_id] = (debtMap[inv.student_id] ?? 0) + Math.max(0, remaining)
    }
  }

  const studentsWithDebt = (students ?? []).map((s) => ({ ...s, debt: debtMap[s.id] ?? 0 }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Öğrenciler</h1>
          <p className="text-sm text-gray-500 mt-0.5">{students?.length ?? 0} öğrenci</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled title="V1.1'de eklenecek">
            <Upload className="w-4 h-4 mr-1.5" />
            Excel Import
          </Button>
          <AddStudentModal groups={groups ?? []} />
        </div>
      </div>
      <StudentFilters groups={groups ?? []} />
      <StudentTable students={studentsWithDebt as any} />
    </div>
  )
}
