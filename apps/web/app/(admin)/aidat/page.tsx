import { createClient } from '@/lib/supabase/server'
import AidatGrid from '@/components/aidat/aidat-grid'

export default async function AidatPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const supabase = await createClient()
  const { year: yearParam } = await searchParams
  const year = Number(yearParam ?? new Date().getFullYear())

  const { data: students } = await supabase
    .from('students')
    .select('id, full_name')
    .in('status', ['active', 'trial'])
    .order('full_name')

  const studentIds = (students ?? []).map((s) => s.id)

  const invoicesResult = studentIds.length
    ? await supabase
        .from('aidat_invoices')
        .select('id, student_id, period_month, amount, paid_amount, status, is_prorated')
        .eq('period_year', year)
        .in('student_id', studentIds)
    : { data: [] as Array<{ id: string; student_id: string; period_month: number; amount: number; paid_amount: number | null; status: string | null; is_prorated: boolean | null }> }
  const invoices = invoicesResult.data

  type InvoiceRow = { id: string; student_id: string; period_month: number; amount: number; paid_amount: number | null; status: string | null; is_prorated: boolean | null }
  const invoiceMap: Record<string, Record<number, InvoiceRow>> = {}
  ;(invoices ?? []).forEach((inv) => {
    if (!invoiceMap[inv.student_id]) invoiceMap[inv.student_id] = {}
    invoiceMap[inv.student_id][inv.period_month] = inv
  })

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Aidat</h1>
      <AidatGrid students={(students ?? []) as any} invoiceMap={invoiceMap as any} year={year} />
    </div>
  )
}
