import { createClient } from '@/lib/supabase/server'
import { BellRing } from 'lucide-react'

export default async function BildirimSablonlariPage() {
  const supabase = await createClient()

  const { data: templates } = await supabase
    .from('notification_templates')
    .select('id, name, body, trigger_event, created_at')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bildirim Şablonları</h1>
        <p className="text-sm text-gray-500 mt-1">Platform genelinde kullanılan bildirim şablonları</p>
      </div>

      {!templates || templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <BellRing className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-sm">Henüz bildirim şablonu yok.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.id} className="bg-white rounded-lg border p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900">{t.name}</p>
                  {t.trigger_event && (
                    <span className="inline-block mt-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {t.trigger_event}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 flex-shrink-0">
                  {new Date(t.created_at).toLocaleDateString('tr-TR')}
                </p>
              </div>
              {t.body && (
                <p className="mt-3 text-sm text-gray-600 leading-relaxed">{t.body}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
