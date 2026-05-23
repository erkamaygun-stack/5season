import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface Payment {
  id: string
  amount: number
  payment_date: string | null
  invoice_type: string
  students: { full_name: string } | null
}

const INVOICE_TYPE_LABELS: Record<string, string> = {
  aidat: 'Aidat',
  equipment: 'Forma',
}

export default function RecentPayments({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Son Ödemeler</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Henüz ödeme kaydı yok.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Son Ödemeler</CardTitle>
        <Link href="/aidat" className="text-xs text-primary hover:underline">Tümünü gör</Link>
      </CardHeader>
      <CardContent className="space-y-0">
        {payments.map((p) => (
          <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{p.students?.full_name ?? '—'}</p>
              <p className="text-xs text-gray-500">{formatDate(p.payment_date)}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant="secondary" className="text-xs">
                {INVOICE_TYPE_LABELS[p.invoice_type] ?? p.invoice_type}
              </Badge>
              <span className="text-sm font-semibold text-green-700">{formatCurrency(p.amount)}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
