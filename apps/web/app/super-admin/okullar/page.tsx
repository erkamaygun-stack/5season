import { createClient } from '@/lib/supabase/server'
import { Building2 } from 'lucide-react'

export default async function OkullarPage() {
  const supabase = await createClient()

  const { data: schools } = await supabase
    .from('schools')
    .select('id, name, logo_url, created_at')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Okullar</h1>
        <p className="text-sm text-gray-500 mt-1">Platforma kayıtlı tüm okullar</p>
      </div>

      {!schools || schools.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Building2 className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-sm">Henüz kayıtlı okul yok.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {schools.map((school) => (
            <div key={school.id} className="bg-white rounded-lg border p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center flex-shrink-0">
                {school.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={school.logo_url} alt={school.name} className="w-10 h-10 rounded-md object-cover" />
                ) : (
                  <Building2 className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{school.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {school.created_at ? new Date(school.created_at).toLocaleDateString('tr-TR') : '-'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
