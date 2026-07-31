import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StaffDetailTabs from '@/components/personel/staff-detail-tabs'

export default async function PersonelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: staff } = await supabase
    .from('staff')
    .select('id, full_name, staff_type, monthly_salary, hire_date, is_active, notes, profile_id')
    .eq('id', id)
    .single()

  if (!staff) notFound()

  let phone: string | null = null
  if ((staff as any).profile_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', (staff as any).profile_id)
      .single()
    phone = profile?.phone ?? null
  } else if (staff.notes?.startsWith('Telefon:')) {
    phone = staff.notes.replace('Telefon:', '').trim()
  }

  const [{ data: groups }, { data: salaryPayments }] = await Promise.all([
    supabase
      .from('groups')
      .select('id, name, is_active')
      .eq('primary_coach_id', id)
      .order('name'),
    supabase
      .from('staff_salary_payments')
      .select('id, period_year, period_month, amount, payment_method, notes, paid_at')
      .eq('staff_id', id)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false }),
  ])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">{staff.full_name}</h1>
        <p className="text-sm text-gray-500 mt-0.5">Personel Detayı</p>
      </div>
      <StaffDetailTabs
        staff={{ ...(staff as any), phone }}
        groups={groups ?? []}
        salaryPayments={salaryPayments ?? []}
      />
    </div>
  )
}
