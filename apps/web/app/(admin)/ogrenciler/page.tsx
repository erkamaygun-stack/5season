import { createClient } from '@/lib/supabase/server'
import StudentTable from '@/components/ogrenciler/student-table'
import KanbanBoard from '@/components/basvurular/kanban-board'
import GroupFilterChips from '@/components/ogrenciler/group-filter-chips'
import StudentFilters from '@/components/ogrenciler/student-filters'
import UyelerTabNav from './tab-nav'
import { isReadOnlyRealDataTestMode } from '@/lib/safety/environment'
import { calculateAge } from '@/lib/utils'

const KANBAN_COLUMNS = [
  { status: 'new', label: 'Yeni' },
  { status: 'contacted', label: 'İletişimde' },
  { status: 'trial_scheduled', label: 'Deneme Planlandı' },
  { status: 'trialed', label: 'Deneme Yapıldı' },
  { status: 'enrolled', label: 'Kayıt Oldu' },
  { status: 'rejected', label: 'Vazgeçildi' },
  { status: 'no_show', label: 'Gelmedi' },
]

export default async function OgrencilerPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string
    group_id?: string
    search?: string
    phone?: string
    status?: string
    age_min?: string
    age_max?: string
    uniform?: string
  }>
}) {
  const {
    tab: rawTab,
    group_id: groupId,
    search,
    phone,
    status,
    age_min: ageMinValue,
    age_max: ageMaxValue,
    uniform,
  } = await searchParams

  const tab = rawTab === 'basvurular' ? 'basvurular' : 'uyeler'
  const supabase = await createClient()

  // ─── Başvurular sekmesi ───────────────────────────────────────────────────
  let applications: any[] = []
  if (tab === 'basvurular') {
    const { data } = await supabase
      .from('applications')
      .select(
        'id, applicant_full_name, parent_phone, birth_date, status, created_at, notes',
      )
      .order('created_at', { ascending: false })
    applications = data ?? []
  }

  // ─── Üyeler sekmesi ───────────────────────────────────────────────────────
  let studentsWithDebt: any[] = []
  let groups: any[] = []

  if (tab === 'uyeler') {
    const { data: groupsData } = await supabase
      .from('groups')
      .select('id, name, category')
      .order('name')
    groups = groupsData ?? []

    const modernStudentsResult = await (supabase as any)
      .from('students')
      .select(
        `id, full_name, birth_date, status, has_received_uniform,
        student_groups(is_active, groups(id, name)),
        guardian_students(is_primary, relation, guardians(id, full_name, phone_e164, status))`,
      )
      .order('full_name')

    let students = modernStudentsResult.data as any[] | null
    if (modernStudentsResult.error && isReadOnlyRealDataTestMode()) {
      const legacyStudentsResult = await supabase
        .from('students')
        .select(
          `id, full_name, birth_date, status, has_received_uniform,
          student_groups(is_active, groups(id, name)),
          parent_student(is_primary, relation, profiles(id, full_name, phone))`,
        )
        .order('full_name')

      students = (legacyStudentsResult.data ?? []).map((student: any) => ({
        ...student,
        guardian_students: (student.parent_student ?? []).map((link: any) => ({
          is_primary: link.is_primary,
          relation: link.relation,
          guardians: link.profiles
            ? {
                id: link.profiles.id,
                full_name: link.profiles.full_name,
                phone_e164: link.profiles.phone,
                status: 'legacy',
              }
            : null,
        })),
      }))
    }

    const studentIds = students?.map((s: any) => s.id) ?? []
    const debtMap: Record<string, number> = {}
    if (studentIds.length > 0) {
      const { data: invoices } = await supabase
        .from('aidat_invoices')
        .select('student_id, amount, paid_amount')
        .in('student_id', studentIds)
        .in('status', ['pending', 'partial'])
      for (const inv of invoices ?? []) {
        const remaining = (inv.amount ?? 0) - (inv.paid_amount ?? 0)
        debtMap[inv.student_id] =
          (debtMap[inv.student_id] ?? 0) + Math.max(0, remaining)
      }
    }

    studentsWithDebt = (students ?? []).map((s) => ({
      ...s,
      debt: debtMap[s.id] ?? 0,
    }))

    const normalizedSearch = search?.trim().toLocaleLowerCase('tr-TR')
    const normalizedPhone = phone?.replace(/\D/g, '')
    const ageMin = ageMinValue ? Number(ageMinValue) : null
    const ageMax = ageMaxValue ? Number(ageMaxValue) : null
    const validStatus = ['active', 'trial', 'passive', 'left'].includes(status ?? '') ? status : null

    studentsWithDebt = studentsWithDebt.filter((student) => {
      if (normalizedSearch && !student.full_name.toLocaleLowerCase('tr-TR').includes(normalizedSearch)) return false
      if (validStatus && student.status !== validStatus) return false
      if (uniform === 'received' && !student.has_received_uniform) return false
      if (uniform === 'not_received' && student.has_received_uniform) return false
      if (normalizedPhone) {
        const hasPhone = (student.guardian_students ?? []).some((link: any) =>
          link.guardians?.phone_e164?.replace(/\D/g, '').includes(normalizedPhone),
        )
        if (!hasPhone) return false
      }
      const age = calculateAge(student.birth_date)
      if (Number.isFinite(ageMin) && age !== null && age < Number(ageMin)) return false
      if (Number.isFinite(ageMax) && age !== null && age > Number(ageMax)) return false
      if ((Number.isFinite(ageMin) || Number.isFinite(ageMax)) && age === null) return false
      return true
    })

    if (groupId) {
      studentsWithDebt = studentsWithDebt.filter((s) =>
        (s.student_groups ?? []).some(
          (sg: any) => sg.is_active && sg.groups?.id === groupId,
        ),
      )
    }
  }

  return (
    <div className="space-y-4">
      <UyelerTabNav />

      {tab === 'uyeler' && <StudentFilters groups={groups} />}

      {tab === 'uyeler' && <GroupFilterChips groups={groups} />}

      {tab === 'uyeler' && (
        <StudentTable students={studentsWithDebt as any} groups={groups} />
      )}

      {tab === 'basvurular' && (
        <KanbanBoard
          applications={applications as any}
          columns={KANBAN_COLUMNS}
        />
      )}
    </div>
  )
}
