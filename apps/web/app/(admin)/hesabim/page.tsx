import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HesabimClient from './hesabim-client'

export default async function HesabimPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, phone, email, role, school_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold text-foreground">Hesabım</h1>
      <HesabimClient profile={profile as any} />
    </div>
  )
}
