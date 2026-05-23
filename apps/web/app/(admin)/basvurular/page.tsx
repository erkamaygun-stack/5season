import { createClient } from '@/lib/supabase/server'
import KanbanBoard from '@/components/basvurular/kanban-board'

const COLUMNS = [
  { status: 'new', label: 'Yeni' },
  { status: 'contacted', label: 'İletişimde' },
  { status: 'trial_scheduled', label: 'Deneme Planlandı' },
  { status: 'trial_done', label: 'Deneme Yapıldı' },
  { status: 'enrolled', label: 'Kayıt Oldu' },
  { status: 'dropped', label: 'Vazgeçildi' },
]

export default async function BasvurularPage() {
  const supabase = await createClient()

  const { data: applications } = await supabase
    .from('applications')
    .select('id, applicant_full_name, parent_phone, birth_date, status, created_at, notes')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Başvurular</h1>
      <KanbanBoard applications={(applications ?? []) as any} columns={COLUMNS} />
    </div>
  )
}
