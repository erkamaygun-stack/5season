import { createClient } from '@/lib/supabase/server'
import AyarlarForm from './ayarlar-form'

export default async function AyarlarPage() {
  const supabase = await createClient()

  const { data: school } = await supabase
    .from('schools')
    .select('id, name, address, contact_phone, logo_url, default_aidat_amount, default_uniform_amount')
    .limit(1)
    .single()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Ayarlar</h1>
      <AyarlarForm school={school as any} />
    </div>
  )
}
