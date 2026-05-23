import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'
import AddStaffModal from '@/components/personel/add-staff-modal'
import StaffTable from '@/components/personel/staff-table'
import StaffFilters from '@/components/personel/staff-filters'

export default async function PersonelPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; type?: string; active?: string }>
}) {
  const supabase = await createClient()
  const { search, type, active } = await searchParams

  let query = supabase
    .from('staff')
    .select('id, full_name, staff_type, monthly_salary, is_active')
    .order('full_name')

  if (search) query = query.ilike('full_name', `%${search}%`)
  if (type) query = query.eq('staff_type', type)
  if (active === 'active') query = query.eq('is_active', true)
  if (active === 'inactive') query = query.eq('is_active', false)

  const { data: staff } = await query

  const { data: groups } = await supabase
    .from('groups')
    .select('id, name, primary_coach_id')
    .eq('is_active', true)

  const staffGroups: Record<string, string[]> = {}
  for (const g of groups ?? []) {
    if ((g as any).primary_coach_id) {
      const coachId = (g as any).primary_coach_id as string
      if (!staffGroups[coachId]) staffGroups[coachId] = []
      staffGroups[coachId].push(g.name)
    }
  }

  const staffWithGroups = (staff ?? []).map((s) => ({
    ...s,
    groups: staffGroups[s.id] ?? [],
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Personel</h1>
          <p className="text-sm text-gray-500 mt-0.5">{staff?.length ?? 0} personel</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled title="V1.1'de eklenecek">
            <Upload className="w-4 h-4 mr-1.5" />
            Excel Import
          </Button>
          <AddStaffModal />
        </div>
      </div>
      <StaffFilters />
      <StaffTable staff={staffWithGroups} />
    </div>
  )
}
