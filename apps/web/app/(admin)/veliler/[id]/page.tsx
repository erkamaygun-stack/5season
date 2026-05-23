import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ParentDetailTabs from '@/components/veliler/parent-detail-tabs'

export default async function ParentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: parent } = await supabase
    .from('profiles')
    .select(`
      id, full_name, phone, email, created_at,
      parent_student(
        relation, is_primary,
        students(
          id, full_name, birth_date, status, has_received_uniform,
          student_groups(is_active, groups(id, name))
        )
      )
    `)
    .eq('id', id)
    .eq('role', 'parent')
    .single()

  if (!parent) notFound()

  const studentIds = (parent.parent_student ?? [])
    .map((ps: any) => ps.students?.id)
    .filter(Boolean) as string[]

  const debtByStudent: Record<string, any[]> = {}
  if (studentIds.length > 0) {
    const { data: invoices } = await supabase
      .from('aidat_invoices')
      .select('id, student_id, period_year, period_month, amount, paid_amount, status')
      .in('student_id', studentIds)
      .in('status', ['pending', 'partial'])
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })

    for (const inv of invoices ?? []) {
      if (!debtByStudent[inv.student_id]) debtByStudent[inv.student_id] = []
      debtByStudent[inv.student_id].push(inv)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">{parent.full_name}</h1>
        <p className="text-sm text-gray-500 mt-0.5">Veli Detayı</p>
      </div>
      <ParentDetailTabs parent={parent as any} debtByStudent={debtByStudent} />
    </div>
  )
}
