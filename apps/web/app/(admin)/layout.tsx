import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/sidebar'
import Topbar from '@/components/layout/topbar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase.from('profiles').select('full_name, school_id, role').eq('id', user.id).single()
  const profile = profileData as { full_name: string; school_id: string | null; role: string } | null

  if (profile?.role === 'super_admin') redirect('/super-admin')

  const { data: schoolData } = await supabase
    .from('schools')
    .select('name, logo_url')
    .eq('id', profile?.school_id ?? '')
    .single()

  const school = schoolData as { name: string; logo_url: string | null } | null

  const userName = profile?.full_name ?? user.email ?? 'Kullanıcı'
  const schoolName = school?.name ?? '5mevsim'
  const logoUrl = school?.logo_url ?? undefined

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar schoolName={schoolName} logoUrl={logoUrl} />
      <Topbar schoolName={schoolName} userName={userName} />
      <main className="ml-60 pt-14 min-h-screen">
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
