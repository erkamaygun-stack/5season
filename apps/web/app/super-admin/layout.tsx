import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SuperAdminSidebar from '@/components/layout/super-admin-sidebar'
import SuperAdminTopbar from '@/components/layout/super-admin-topbar'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  const profile = profileData as { full_name: string; role: string } | null

  if (profile?.role !== 'super_admin') redirect('/')

  const userName = profile?.full_name ?? user.email ?? 'Kullanıcı'

  return (
    <div className="min-h-screen bg-gray-50">
      <SuperAdminSidebar />
      <SuperAdminTopbar userName={userName} />
      <main className="ml-60 pt-14 min-h-screen">
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
