'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function createParent(data: {
  full_name: string
  phone: string
  email?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Oturum bulunamadı')

  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id')
    .eq('id', user.id)
    .single()

  if (!profile?.school_id) throw new Error('Okul bilgisi bulunamadı')

  const admin = createAdminClient()

  const { data: created, error } = await admin.auth.admin.createUser({
    phone: data.phone,
    email: data.email || undefined,
    phone_confirm: true,
    user_metadata: { full_name: data.full_name },
  })

  if (error || !created.user) {
    throw new Error(error?.message ?? 'Kullanıcı oluşturulamadı')
  }

  await admin.from('profiles').upsert({
    id: created.user.id,
    full_name: data.full_name,
    phone: data.phone,
    email: data.email ?? null,
    role: 'parent',
    school_id: profile.school_id,
  })

  revalidatePath('/veliler')
}
