import { createClient } from '@/lib/supabase/server'
import { getMonthName } from '@/lib/utils'
import DekontlarClient from './dekontlar-client'

export default async function DekontlarPage() {
  const supabase = await createClient()

  // Velinin yüklediği, admin onaylamamış ödemeler (amount = 0)
  const { data: payments } = await supabase
    .from('payments')
    .select('id, invoice_type, invoice_id, student_id, receipt_url, created_at, students(full_name)')
    .eq('amount', 0)
    .not('receipt_url', 'is', null)
    .order('created_at', { ascending: false })

  if (!payments || payments.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-gray-900">Bekleyen Dekontlar</h1>
        <div className="rounded-lg border bg-white p-12 text-center text-sm text-gray-500">
          Onay bekleyen dekont yok.
        </div>
      </div>
    )
  }

  // Invoice detaylarını toplu çek
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

  // Signed URL'ler server'dan üretiliyor (bucket private)
  const dekontlar = await Promise.all(
    payments.map(async (p: any) => {
      const { data: urlData } = await supabase.storage
        .from('receipts')
        .createSignedUrl(p.receipt_url, 3600)

      const invoice =
        p.invoice_type === 'aidat' ? aidatMap[p.invoice_id] : equipMap[p.invoice_id]

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

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">
        Bekleyen Dekontlar
        <span className="ml-2 text-sm font-normal text-gray-400">({dekontlar.length} adet)</span>
      </h1>
      <DekontlarClient items={dekontlar} />
    </div>
  )
}
