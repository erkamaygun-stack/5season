import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OkulForm from './okul-form'
import HesabimClient from './hesabim-client'
import AyarlarTabNav from './tab-nav'

type Tab = 'okul' | 'hesabim'

export default async function AyarlarPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab: tabParam } = await searchParams
  const tab: Tab = tabParam === 'hesabim' ? 'hesabim' : 'okul'
  const supabase = await createClient()

  let okulContent = null
  if (tab === 'okul') {
    const { data: school } = await supabase
      .from('schools')
      .select('id, name, address, contact_phone, logo_url, default_aidat_amount, default_uniform_amount, collection_day')
      .limit(1)
      .single()
    okulContent = <OkulForm school={school as any} />
  }

  let hesabimContent = null
  if (tab === 'hesabim') {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, phone, email, role, school_id')
      .eq('id', user.id)
      .single()

    if (!profile) redirect('/login')
    hesabimContent = <HesabimClient profile={profile as any} />
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold text-foreground">Ayarlar</h1>
      <AyarlarTabNav />
      {okulContent}
      {hesabimContent}
    </div>
  )
}
