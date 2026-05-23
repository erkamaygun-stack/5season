import { createClient } from '@/lib/supabase/server'
import ParentTable from '@/components/veliler/parent-table'
import ParentFilters from '@/components/veliler/parent-filters'
import AddParentModal from '@/components/veliler/add-parent-modal'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'

export default async function VelilerPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; phone?: string }>
}) {
  const supabase = await createClient()
  const { search, phone } = await searchParams

  let query = supabase
    .from('profiles')
    .select(`id, full_name, phone, email, parent_student(student_id)`)
    .eq('role', 'parent')
    .order('full_name')

  if (search) query = query.ilike('full_name', `%${search}%`)
  if (phone) query = query.ilike('phone', `%${phone}%`)

  const { data: parentsData } = await query
  const parents = parentsData ?? []

  const allStudentIds = parents
    .flatMap((p) => (p.parent_student ?? []).map((ps: any) => ps.student_id))
    .filter(Boolean)

  const debtMap: Record<string, number> = {}
  if (allStudentIds.length > 0) {
    const { data: invoices } = await supabase
      .from('aidat_invoices')
      .select('student_id, amount, paid_amount')
      .in('student_id', allStudentIds)
      .in('status', ['pending', 'partial'])
    for (const inv of invoices ?? []) {
      const remaining = (inv.amount ?? 0) - (inv.paid_amount ?? 0)
      debtMap[inv.student_id] = (debtMap[inv.student_id] ?? 0) + Math.max(0, remaining)
    }
  }

  const parentsWithStats = parents.map((p) => {
    const children = (p.parent_student ?? []) as Array<{ student_id: string }>
    const totalDebt = children.reduce((sum, ps) => sum + (debtMap[ps.student_id] ?? 0), 0)
    return { ...p, childCount: children.length, totalDebt }
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Veliler</h1>
          <p className="text-sm text-gray-500 mt-0.5">{parents.length} veli</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled title="V1.1'de eklenecek">
            <Upload className="w-4 h-4 mr-1.5" />
            Excel Import
          </Button>
          <AddParentModal />
        </div>
      </div>
      <ParentFilters />
      <ParentTable parents={parentsWithStats as any} />
    </div>
  )
}
