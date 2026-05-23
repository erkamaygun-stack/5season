import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'

const CATEGORY_LABELS: Record<string, string> = {
  rent: 'Kira', salary: 'Maaş', utility: 'Fatura',
  equipment: 'Malzeme', other: 'Diğer',
}

export default async function GiderlerPage() {
  const supabase = await createClient()

  const { data: expensesData } = await supabase
    .from('expenses')
    .select('id, expense_date, category, description, amount, paid_to')
    .order('expense_date', { ascending: false })
    .limit(100)
  const expenses = expensesData as Array<{ id: string; expense_date: string | null; category: string; description: string | null; amount: number; paid_to: string | null }> | null

  const total = (expenses ?? []).reduce((sum, e) => sum + (e.amount ?? 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Giderler</h1>
        <span className="text-sm text-gray-500">Toplam: <span className="font-semibold text-gray-900">{formatCurrency(total)}</span></span>
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="min-w-full text-sm divide-y">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Tarih</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Kategori</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Açıklama</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Tutar</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(expenses ?? []).map((e) => (
              <tr key={e.id} className={`hover:bg-gray-50 ${e.category === 'salary' ? 'bg-gray-50/50' : ''}`}>
                <td className="px-4 py-3 text-gray-600">{formatDate(e.expense_date)}</td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">{CATEGORY_LABELS[e.category] ?? e.category}</Badge>
                </td>
                <td className="px-4 py-3 text-gray-900">{e.description ?? '-'}</td>
                <td className="px-4 py-3 text-right font-medium">{formatCurrency(e.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
