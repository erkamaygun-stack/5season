import { createClient } from '@/lib/supabase/server'
import OkulForm from './okul-form'

export default async function OkulPage() {
  const supabase = await createClient()

  const { data: school } = await supabase
    .from('schools')
    .select('id, name, address, contact_phone, logo_url, default_aidat_amount, default_uniform_amount, collection_day')
    .limit(1)
    .single()

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold text-foreground">Okul</h1>
      <OkulForm school={school as any} />
    </div>
  )
}
