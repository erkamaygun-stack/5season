import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

const statusLabel: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' }> = {
  sent: { label: 'Gönderildi', variant: 'success' },
  queued: { label: 'Kuyrukta', variant: 'warning' },
  failed: { label: 'Başarısız', variant: 'destructive' },
}

export default async function BildirimlerPage() {
  const supabase = await createClient()

  const { data: logsData } = await supabase.from('notification_log').select('id, channel, status, recipient_phone, template_code, created_at').order('created_at', { ascending: false }).limit(50)
  const { data: templatesData } = await supabase.from('notification_templates').select('id, code, channel, body_template').order('code')
  const logs = logsData as Array<{ id: string; channel: string; status: string | null; recipient_phone: string | null; template_code: string | null; created_at: string | null }> | null
  const templates = templatesData as Array<{ id: string; code: string; channel: string; body_template: string }> | null

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Bildirimler</h1>

      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Gönderim Logu</h2>
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="min-w-full text-sm divide-y">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Tarih</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Kanal</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Alıcı</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Konu</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(logs ?? []).map((l) => {
                const s = statusLabel[l.status ?? ''] ?? { label: l.status ?? '-', variant: 'secondary' as const }
                return (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-500">{formatDate(l.created_at)}</td>
                    <td className="px-4 py-2.5 text-gray-600">{l.channel}</td>
                    <td className="px-4 py-2.5 text-gray-600 font-mono text-xs">{l.recipient_phone ?? '-'}</td>
                    <td className="px-4 py-2.5 text-gray-900">{l.template_code ?? '-'}</td>
                    <td className="px-4 py-2.5"><Badge variant={s.variant}>{s.label}</Badge></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Şablonlar</h2>
        <div className="space-y-3">
          {(templates ?? []).map((t) => (
            <div key={t.id} className="rounded-lg border bg-white p-4">
              <div className="flex items-center gap-2 mb-2">
                <p className="font-medium text-gray-900">{t.code}</p>
                <Badge variant="secondary">{t.channel}</Badge>
              </div>
              <pre className="text-xs text-gray-600 bg-gray-50 rounded p-2 whitespace-pre-wrap">{t.body_template}</pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
