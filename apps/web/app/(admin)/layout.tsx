import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminShell from '@/components/layout/admin-shell'
import { canAccessWebPanel } from '@/lib/auth/panel-access'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Profil + okul tek sorguda join ile alınır (önceki 2 ayrı sorguydu)
  const { data: profileData } = await supabase
    .from('profiles')
    .select('role, is_active, schools(name, logo_url)')
    .eq('id', user.id)
    .single()

  const profile = profileData as {
    role: string
    is_active: boolean | null
    schools: { name: string; logo_url: string | null } | null
  } | null

  if (profile?.role === 'super_admin') redirect('/super-admin')
  if (!canAccessWebPanel(profile) || profile?.role !== 'school_admin') {
    redirect('/login?error=no_access')
  }

  const schoolName = profile?.schools?.name ?? '5mevsim'
  const logoUrl = profile?.schools?.logo_url ?? undefined

  return (
    <AdminShell schoolName={schoolName} logoUrl={logoUrl}>
      {children}
    </AdminShell>
  )
}
