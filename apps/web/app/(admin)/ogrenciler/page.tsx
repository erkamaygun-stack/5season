import { createClient } from '@/lib/supabase/server'
import StudentTable from '@/components/ogrenciler/student-table'
import KanbanBoard from '@/components/basvurular/kanban-board'
import GroupFilterChips from '@/components/ogrenciler/group-filter-chips'
import UyelerTabNav from './tab-nav'

const KANBAN_COLUMNS = [
  { status: 'new', label: 'Yeni' },
  { status: 'contacted', label: 'İletişimde' },
  { status: 'trial_scheduled', label: 'Deneme Planlandı' },
  { status: 'trial_done', label: 'Deneme Yapıldı' },
  { status: 'enrolled', label: 'Kayıt Oldu' },
  { status: 'dropped', label: 'Vazgeçildi' },
]

export default async function OgrencilerPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; group_id?: string }>
}) {
  const { tab: rawTab, group_id: groupId } = await searchParams

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
      .select('id, name')
      .order('name')
    groups = groupsData ?? []

    const { data: students } = await supabase
      .from('students')
      .select(
        `id, full_name, birth_date, status, has_received_uniform,
        student_groups(is_active, groups(id, name)),
        parent_student(is_primary, relation, profiles(id, full_name, phone))`,
      )
      .order('full_name')

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
        debtMap[inv.student_id] =
          (debtMap[inv.student_id] ?? 0) + Math.max(0, remaining)
      }
    }

    studentsWithDebt = (students ?? []).map((s) => ({
      ...s,
      debt: debtMap[s.id] ?? 0,
    }))

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
