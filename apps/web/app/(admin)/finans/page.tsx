import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatCurrency, getMonthName, TR_MONTHS, nMonthsAgo } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'
import AidatGrid from '@/components/aidat/aidat-grid'
import DekontlarClient from '../dekontlar/dekontlar-client'
import AddExpenseModal from '@/components/giderler/add-expense-modal'
import GiderlerClient from '@/components/giderler/giderler-client'
import AddStaffModal from '@/components/personel/add-staff-modal'
import StaffTable from '@/components/personel/staff-table'
import StaffFilters from '@/components/personel/staff-filters'
import FinansTabNav from './tab-nav'
import { isReadOnlyRealDataTestMode } from '@/lib/safety/environment'

type Tab = 'aidat' | 'dekontlar' | 'giderler' | 'raporlar'

function maskPhone(value: string | null | undefined): string {
  if (!value) return '—'
  const digits = value.replace(/\D/g, '')
  if (digits.length < 6) return '***'
  return `+${digits.slice(0, 2)} *** *** ${digits.slice(-2)}`
}

export default async function FinansPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; year?: string; search?: string; type?: string; active?: string }>
}) {
  const supabase = await createClient()
  const isReadOnlyRealDataTest = isReadOnlyRealDataTestMode()
  const { tab: tabParam = 'aidat', year: yearParam, search, type, active } = await searchParams
  const tab = (['aidat', 'dekontlar', 'giderler', 'raporlar'].includes(tabParam) ? tabParam : 'aidat') as Tab

  // Bekleyen dekont sayısı — her tab'da göster
  const pendingReceiptResult = await (supabase as any)
    .from('receipt_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending_review')

  let pendingCount = pendingReceiptResult.count as number | null
  if (pendingReceiptResult.error && isReadOnlyRealDataTest) {
    const legacyPendingResult = await supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('amount', 0)
      .not('receipt_url', 'is', null)
    pendingCount = legacyPendingResult.count
  }

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
    const modernSubmissionsResult = await (supabase as any)
      .from('receipt_submissions')
      .select('id, invoice_type, invoice_id, student_id, storage_bucket, storage_path, created_at, students(full_name), guardians(full_name, phone_e164)')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: false })

    let submissions = modernSubmissionsResult.data as any[] | null
    let usingLegacyReceipts = false
    if (modernSubmissionsResult.error && isReadOnlyRealDataTest) {
      usingLegacyReceipts = true
      const legacySubmissionsResult = await supabase
        .from('payments')
        .select('id, invoice_type, invoice_id, student_id, receipt_url, created_at, students(full_name, parent_student(is_primary, profiles(full_name, phone)))')
        .eq('amount', 0)
        .not('receipt_url', 'is', null)
        .order('created_at', { ascending: false })

      submissions = (legacySubmissionsResult.data ?? []).map((payment: any) => {
        const parentLink = payment.students?.parent_student?.find((link: any) => link.is_primary)
          ?? payment.students?.parent_student?.[0]
        return {
          id: payment.id,
          invoice_type: payment.invoice_type,
          invoice_id: payment.invoice_id,
          student_id: payment.student_id,
          storage_bucket: 'receipts',
          storage_path: payment.receipt_url,
          created_at: payment.created_at,
          students: { full_name: payment.students?.full_name },
          guardians: parentLink?.profiles
            ? { full_name: parentLink.profiles.full_name, phone_e164: parentLink.profiles.phone }
            : null,
        }
      })
    }

    if (modernSubmissionsResult.error && !isReadOnlyRealDataTest) {
      throw new Error('Dekont kuyruğu yüklenemedi')
    }

    submissions = submissions ?? []
    let attentionRows: any[] = []
    let cleanupRows: any[] = []
    let openAidatRows: any[] = []
    let openEquipmentRows: any[] = []

    if (!usingLegacyReceipts) {
      const [attentionResult, cleanupResult, openAidatResult, openEquipmentResult] = await Promise.all([
        (supabase as any)
          .from('receipt_submissions')
          .select('id, status, decision_reason, storage_bucket, storage_path, created_at, guardians(full_name)')
          .in('status', ['identifying', 'awaiting_selection', 'failed'])
          .is('decision', null)
          .order('created_at', { ascending: false }),
        (supabase as any)
          .from('receipt_submissions')
          .select('id, decision, cleanup_last_error, cleanup_attempts')
          .eq('status', 'failed')
          .not('decision', 'is', null)
          .not('storage_path', 'is', null)
          .order('updated_at', { ascending: false }),
        supabase
          .from('aidat_invoices')
          .select('id, amount, paid_amount, period_year, period_month, students(full_name)')
          .in('status', ['pending', 'partial'])
          .order('due_date'),
        supabase
          .from('equipment_invoices')
          .select('id, amount, paid_amount, description, students(full_name)')
          .in('status', ['pending', 'partial'])
          .order('created_at'),
      ])
      attentionRows = attentionResult.data ?? []
      cleanupRows = cleanupResult.data ?? []
      openAidatRows = openAidatResult.data ?? []
      openEquipmentRows = openEquipmentResult.data ?? []
    }

    if (submissions.length === 0 && attentionRows.length === 0 && cleanupRows.length === 0) {
      dekontlarContent = (
        <div className="rounded-lg border bg-card p-12 text-center text-sm text-muted-foreground">
          Bekleyen veya müdahale gerektiren dekont yok.
        </div>
      )
    } else {
      const aidatIds = submissions.filter((p: any) => p.invoice_type === 'aidat').map((p: any) => p.invoice_id)
      const equipIds = submissions.filter((p: any) => p.invoice_type === 'equipment').map((p: any) => p.invoice_id)

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
      const storageClient = usingLegacyReceipts ? supabase : createAdminClient()

      const dekontlar = await Promise.all(
        submissions.map(async (p: any) => {
          const urlResult = p.storage_path
            ? await storageClient.storage
                .from(p.storage_bucket || 'whatsapp-receipts')
                .createSignedUrl(p.storage_path, 300)
            : { data: null }

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
            signedUrl: urlResult.data?.signedUrl ?? null,
            createdAt: p.created_at,
            guardianName: p.guardians?.full_name ?? 'Eşleşmemiş veli',
            guardianPhoneMasked: maskPhone(p.guardians?.phone_e164),
          }
        })
      )

      const attentionItems = await Promise.all(attentionRows.map(async (row) => {
        const urlResult = row.storage_path
          ? await storageClient.storage.from(row.storage_bucket || 'whatsapp-receipts').createSignedUrl(row.storage_path, 300)
          : { data: null }
        return {
          id: row.id,
          status: row.status,
          reason: row.decision_reason,
          guardianName: row.guardians?.full_name ?? 'Eşleşmemiş numara',
          signedUrl: urlResult.data?.signedUrl ?? null,
          createdAt: row.created_at,
        }
      }))

      const invoiceOptions = [
        ...openAidatRows.map((invoice) => ({
          id: invoice.id,
          invoiceType: 'aidat' as const,
          label: `${getMonthName(invoice.period_month)} ${invoice.period_year} Aidat`,
          studentName: invoice.students?.full_name ?? '—',
          remainingAmount: Number(invoice.amount) - Number(invoice.paid_amount ?? 0),
        })),
        ...openEquipmentRows.map((invoice) => ({
          id: invoice.id,
          invoiceType: 'equipment' as const,
          label: invoice.description ?? 'Ekipman',
          studentName: invoice.students?.full_name ?? '—',
          remainingAmount: Number(invoice.amount) - Number(invoice.paid_amount ?? 0),
        })),
      ]

      dekontlarContent = (
        <DekontlarClient
          items={dekontlar}
          attentionItems={attentionItems}
          cleanupItems={cleanupRows.map((row) => ({
            id: row.id,
            decision: row.decision,
            error: row.cleanup_last_error,
            attempts: row.cleanup_attempts,
          }))}
          invoiceOptions={invoiceOptions}
        />
      )
    }
  }

  // ── Personel (Giderler sekmesi içinde) ────────────────────────────────────
  let personelContent = null
  if (tab === 'giderler') {
    let staffQuery = supabase
      .from('staff')
      .select('id, full_name, staff_type, monthly_salary, is_active')
      .order('full_name')

    if (search) staffQuery = staffQuery.ilike('full_name', `%${search}%`)
    if (type) staffQuery = staffQuery.eq('staff_type', type)
    if (active === 'active') staffQuery = staffQuery.eq('is_active', true)
    if (active === 'inactive') staffQuery = staffQuery.eq('is_active', false)

    const { data: staffData } = await staffQuery
    const { data: staffGroupsData } = await supabase
      .from('groups')
      .select('id, name, primary_coach_id')
      .eq('is_active', true)

    const staffGroups: Record<string, string[]> = {}
    for (const g of staffGroupsData ?? []) {
      if ((g as any).primary_coach_id) {
        const coachId = (g as any).primary_coach_id as string
        if (!staffGroups[coachId]) staffGroups[coachId] = []
        staffGroups[coachId].push(g.name)
      }
    }

    const personelData = (staffData ?? []).map((s) => ({
      ...s,
      groups: staffGroups[s.id] ?? [],
    }))

    personelContent = (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Personel <span className="font-normal text-muted-foreground text-sm">({personelData.length})</span>
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled title="V1.1'de eklenecek">
              <Upload className="w-4 h-4 mr-1.5" />
              Excel Import
            </Button>
            <AddStaffModal />
          </div>
        </div>
        <StaffFilters />
        <StaffTable staff={personelData} />
      </div>
    )
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
        <h2 className="text-lg font-semibold text-foreground">Giderler</h2>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Toplam: <span className="font-semibold text-foreground">{formatCurrency(total)}</span>
          </span>
          <AddExpenseModal />
        </div>
        <GiderlerClient
          key={(expenses ?? []).map((expense) => expense.id).join(':')}
          initialExpenses={expenses ?? []}
        />
      </>
    )
  }

  // ── Raporlar ───────────────────────────────────────────────────────────────
  let raporlarContent = null
  if (tab === 'raporlar') {
    const twelveMonthsAgo = nMonthsAgo(11)
    const [paymentReportResult, r2, r3] = await Promise.all([
      (supabase as any).from('payments').select('amount, payment_date').eq('status', 'active').gte('payment_date', twelveMonthsAgo),
      supabase.from('expenses').select('amount, expense_date').gte('expense_date', twelveMonthsAgo),
      supabase.from('aidat_invoices').select('student_id, amount, paid_amount, status').in('status', ['pending', 'partial']),
    ])

    let paymentRows = paymentReportResult.data as any[] | null
    if (paymentReportResult.error && isReadOnlyRealDataTest) {
      const legacyPaymentReportResult = await supabase
        .from('payments')
        .select('amount, payment_date')
        .gte('payment_date', twelveMonthsAgo)
      paymentRows = legacyPaymentReportResult.data
    }

    const revenueByMonth: Record<string, number> = {}
    const expenseByMonth: Record<string, number> = {}
    ;(paymentRows ?? []).forEach((p: any) => {
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
        {personelContent}
        {giderlerContent}
        {raporlarContent}
      </div>
    </div>
  )
}
