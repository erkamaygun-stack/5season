import { createClient } from '@/lib/supabase/server'
import { formatCurrency, TR_MONTHS, nMonthsAgo } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function RaporlarPage() {
  const supabase = await createClient()
  const twelveMonthsAgo = nMonthsAgo(11)

  const [r1, r2, r3, r4] = await Promise.all([
    supabase.from('payments').select('amount, payment_date').gte('payment_date', twelveMonthsAgo),
    supabase.from('expenses').select('amount, expense_date').gte('expense_date', twelveMonthsAgo),
    supabase.from('aidat_invoices').select('student_id, amount, paid_amount, status').in('status', ['pending', 'partial']),
    supabase.from('groups').select('id, name, capacity, student_groups(is_active)'),
  ])
  const payments = r1.data as Array<{ amount: number; payment_date: string }> | null
  const expenses = r2.data as Array<{ amount: number; expense_date: string | null }> | null
  const pendingInvoices = r3.data as Array<{ student_id: string; amount: number; paid_amount: number | null; status: string | null }> | null
  const groups = r4.data

  // Revenue by month
  const revenueByMonth: Record<string, number> = {}
  const expenseByMonth: Record<string, number> = {}

  ;(payments ?? []).forEach((p) => {
    const d = new Date(p.payment_date)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    revenueByMonth[key] = (revenueByMonth[key] ?? 0) + (p.amount ?? 0)
  })
  ;(expenses ?? []).forEach((e) => {
    if (!e.expense_date) return
    const d = new Date(e.expense_date)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    expenseByMonth[key] = (expenseByMonth[key] ?? 0) + (e.amount ?? 0)
  })

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (11 - i))
    const key = `${d.getFullYear()}-${d.getMonth()}`
    return {
      label: `${TR_MONTHS[d.getMonth()].slice(0, 3)} ${String(d.getFullYear()).slice(2)}`,
      revenue: revenueByMonth[key] ?? 0,
      expense: expenseByMonth[key] ?? 0,
    }
  })

  const totalDebt = (pendingInvoices ?? []).reduce((sum, inv) => sum + ((inv.amount ?? 0) - (inv.paid_amount ?? 0)), 0)
  const debtorCount = new Set((pendingInvoices ?? []).map((i) => i.student_id)).size

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Raporlar</h1>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm text-gray-500">Toplam Bekleyen Borç</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-600">{formatCurrency(totalDebt)}</p><p className="text-xs text-gray-500 mt-1">{debtorCount} borçlu öğrenci</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-gray-500">Bu Ay Net</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency((months[11]?.revenue ?? 0) - (months[11]?.expense ?? 0))}</p>
            <p className="text-xs text-gray-500 mt-1">Gelir – Gider</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="min-w-full text-sm divide-y">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Ay</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Gelir</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Gider</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Net</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {months.map((m) => {
              const net = m.revenue - m.expense
              return (
                <tr key={m.label} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium">{m.label}</td>
                  <td className="px-4 py-2.5 text-right text-green-700">{formatCurrency(m.revenue)}</td>
                  <td className="px-4 py-2.5 text-right text-red-600">{formatCurrency(m.expense)}</td>
                  <td className={`px-4 py-2.5 text-right font-semibold ${net >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{formatCurrency(net)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Doluluk</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {(groups ?? []).map((g: any) => {
            const active = (g.student_groups ?? []).filter((sg: any) => sg.is_active).length
            const pct = g.capacity ? Math.round((active / g.capacity) * 100) : 0
            return (
              <div key={g.id} className="rounded-lg border bg-white p-4">
                <p className="text-sm font-medium text-gray-900">{g.name}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <span className="text-xs text-gray-500">{active}/{g.capacity ?? '?'}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
