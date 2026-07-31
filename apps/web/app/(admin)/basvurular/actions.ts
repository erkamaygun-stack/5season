'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createApplication(data: {
  applicant_full_name: string
  birth_date?: string
  parent_full_name: string
  parent_phone: string
  source?: string
  notes?: string
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

  const { data: inserted, error } = await supabase
    .from('applications')
    .insert({
      school_id: profile.school_id,
      applicant_full_name: data.applicant_full_name.trim(),
      birth_date: data.birth_date || null,
      parent_full_name: data.parent_full_name.trim(),
      parent_phone: data.parent_phone.trim(),
      source: data.source?.trim() || null,
      notes: data.notes?.trim() || null,
      status: 'new',
    } as any)
    .select('id, applicant_full_name, parent_phone, birth_date, status, created_at, notes')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/basvurular')
  return inserted
}

export async function deleteApplication(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Oturum bulunamadı')

  const { error } = await supabase.from('applications').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/basvurular')
}
