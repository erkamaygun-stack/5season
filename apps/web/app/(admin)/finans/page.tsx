import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, getMonthName, TR_MONTHS, nMonthsAgo } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import AidatGrid from '@/components/aidat/aidat-grid'
import DekontlarClient from '../dekontlar/dekontlar-client'
import AddExpenseModal from '@/components/giderler/add-expense-modal'
import GiderlerClient from '@/components/giderler/giderler-client'
import FinansTabNav from './tab-nav'

type Tab = 'aidat' | 'dekontlar' | 'giderler' | 'raporlar'

export default async function FinansPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; year?: string }>
}) {
  const supabase = await createClient()
  const { tab: tabParam = 'aidat', year: yearParam } = await searchParams
  const tab = (['aidat', 'dekontlar', 'giderler', 'raporlar'].includes(tabParam) ? tabParam : 'aidat') as Tab

  // Bekleyen dekont sayısı — her tab'da göster
  const { count: pendingCount } = await supabase
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('amount', 0)
    .not('receipt_url', 'is', null)

  // ── Aidat ──────────────────────────────────────────────────────────────────
  let aidatContent = null
  if (tab === 'aidat') {
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
      : { data: [] as any[] }

    type InvoiceRow = { id: string; student_id: string; period_month: number; amount: number; paid_amount: number | null; status: string | null; is_prorated: boolean | null }
    const invoiceMap: Record<string, Record<number, InvoiceRow>> = {}
    ;(invoicesResult.data ?? []).forEach((inv: InvoiceRow) => {
      if (!invoiceMap[inv.student_id]) invoiceMap[inv.student_id] = {}
      invoiceMap[inv.student_id][inv.period_month] = inv
    })

    aidatContent = (
      <AidatGrid students={(students ?? []) as any} invoiceMap={invoiceMap as any} year={year} />
    )
  }

  // ── Dekontlar ──────────────────────────────────────────────────────────────
  let dekontlarContent = null
  if (tab === 'dekontlar') {
    const { data: payments } = await supabase
      .from('payments')
      .select('id, invoice_type, invoice_id, student_id, receipt_url, created_at, students(full_name)')
      .eq('amount', 0)
      .not('receipt_url', 'is', null)
      .order('created_at', { ascending: false })

    if (!payments || payments.length === 0) {
      dekontlarContent = (
        <div className="rounded-lg border bg-card p-12 text-center text-sm text-muted-foreground">
          Onay bekleyen dekont yok.
        </div>
      )
    } else {
      const aidatIds = payments.filter((p) => p.invoice_type === 'aidat').map((p) => p.invoice_id)
      const equipIds = payments.filter((p) => p.invoice_type === 'equipment').map((p) => p.invoice_id)

      const [aidatRes, equipRes] = await Promise.all([
        aidatIds.length > 0
          ? supabase.from('aidat_invoices').select('id, period_year, period_month, amount').in('id', aidatIds)
          : { data: [] },
        equipIds.length > 0
          ? supabase.from('equipment_invoices').select('id, description, amount').in('id', equipIds)
          : { data: [] },
      ])

      const aidatMap = Object.fromEntries((aidatRes.data ?? []).map((i: any) => [i.id, i]))
      const equipMap = Object.fromEntries((equipRes.data ?? []).map((i: any) => [i.id, i]))

      const dekontlar = await Promise.all(
        payments.map(async (p: any) => {
          const { data: urlData } = await supabase.storage
            .from('receipts')
            .createSignedUrl(p.receipt_url, 3600)

          const invoice = p.invoice_type === 'aidat' ? aidatMap[p.invoice_id] : equipMap[p.invoice_id]
          const invoiceLabel =
            p.invoice_type === 'aidat' && invoice
              ? `${getMonthName(invoice.period_month)} ${invoice.period_year} Aidat`
              : (invoice?.description ?? 'Forma + Eşofman')

          return {
            id: p.id,
            studentId: p.student_id,
            studentName: (p.students as any)?.full_name ?? '—',
            invoiceType: p.invoice_type as 'aidat' | 'equipment',
            invoiceId: p.invoice_id,
            invoiceLabel,
            invoiceAmount: Number(invoice?.amount ?? 0),
            signedUrl: urlData?.signedUrl ?? null,
            createdAt: p.created_at,
          }
        })
      )

      dekontlarContent = <DekontlarClient items={dekontlar} />
    }
  }

  // ── Giderler ───────────────────────────────────────────────────────────────
  let giderlerContent = null
  if (tab === 'giderler') {
    const { data: expensesData } = await supabase
      .from('expenses')
      .select('id, expense_date, category, description, amount, paid_to')
      .order('expense_date', { ascending: false })
      .limit(100)
    const expenses = expensesData as Array<{ id: string; expense_date: string | null; category: string; description: string | null; amount: number; paid_to: string | null }> | null
    const total = (expenses ?? []).reduce((sum, e) => sum + (e.amount ?? 0), 0)

    giderlerContent = (
      <>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Toplam: <span className="font-semibold text-foreground">{formatCurrency(total)}</span>
          </span>
          <AddExpenseModal />
        </div>
        <GiderlerClient initialExpenses={expenses ?? []} />
      </>
    )
  }

  // ── Raporlar ───────────────────────────────────────────────────────────────
  let raporlarContent = null
  if (tab === 'raporlar') {
    const twelveMonthsAgo = nMonthsAgo(11)
    const [r1, r2, r3] = await Promise.all([
      supabase.from('payments').select('amount, payment_date').gte('payment_date', twelveMonthsAgo),
      supabase.from('expenses').select('amount, expense_date').gte('expense_date', twelveMonthsAgo),
      supabase.from('aidat_invoices').select('student_id, amount, paid_amount, status').in('status', ['pending', 'partial']),
    ])

    const revenueByMonth: Record<string, number> = {}
    const expenseByMonth: Record<string, number> = {}
    ;(r1.data ?? []).forEach((p: any) => {
      const d = new Date(p.payment_date)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      revenueByMonth[key] = (revenueByMonth[key] ?? 0) + (p.amount ?? 0)
    })
    ;(r2.data ?? []).forEach((e: any) => {
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

    const pendingInvoices = r3.data as Array<{ student_id: string; amount: number; paid_amount: number | null }> | null
    const totalDebt = (pendingInvoices ?? []).reduce((sum, inv) => sum + ((inv.amount ?? 0) - (inv.paid_amount ?? 0)), 0)
    const debtorCount = new Set((pendingInvoices ?? []).map((i) => i.student_id)).size

    raporlarContent = (
      <>
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-sm text-muted-foreground">Toplam Bekleyen Borç</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-500">{formatCurrency(totalDebt)}</p>
              <p className="text-xs text-muted-foreground mt-1">{debtorCount} borçlu öğrenci</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm text-muted-foreground">Bu Ay Net</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{formatCurrency((months[11]?.revenue ?? 0) - (months[11]?.expense ?? 0))}</p>
              <p className="text-xs text-muted-foreground mt-1">Gelir – Gider</p>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="min-w-full text-sm divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ay</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Gelir</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Gider</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {months.map((m) => {
                const net = m.revenue - m.expense
                return (
                  <tr key={m.label} className="hover:bg-muted/50">
                    <td className="px-4 py-2.5 font-medium">{m.label}</td>
                    <td className="px-4 py-2.5 text-right text-green-500">{formatCurrency(m.revenue)}</td>
                    <td className="px-4 py-2.5 text-right text-red-500">{formatCurrency(m.expense)}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${net >= 0 ? 'text-foreground' : 'text-red-500'}`}>{formatCurrency(net)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </>
    )
  }

  return (
    <div className="space-y-4">
      <Suspense fallback={null}>
        <FinansTabNav pendingCount={pendingCount ?? 0} />
      </Suspense>

      <div className="space-y-4">
        {aidatContent}
        {dekontlarContent}
        {giderlerContent}
        {raporlarContent}
      </div>
    </div>
  )
}
