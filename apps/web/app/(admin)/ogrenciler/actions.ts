'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('90')) return `+${digits}`
  if (digits.startsWith('0')) return `+90${digits.slice(1)}`
  return `+90${digits}`
}

export async function addStudent(data: {
  full_name: string
  birth_date?: string
  gender?: string
  blood_type?: string
  enrollment_date: string
  group_id?: string
  notes?: string
  parent_name?: string
  parent_phone?: string
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

  // Öğrenci ekle
  const { data: student, error } = await supabase
    .from('students')
    .insert({
      school_id: profile.school_id,
      full_name: data.full_name,
      birth_date: data.birth_date || null,
      gender: data.gender || null,
      blood_type: data.blood_type || null,
      enrollment_date: data.enrollment_date,
      notes: data.notes || null,
      status: 'active',
    } as any)
    .select('id')
    .single()

  if (error || !student) throw new Error(error?.message ?? 'Öğrenci eklenemedi')

  // Grup ataması
  if (data.group_id) {
    await supabase.from('student_groups').insert({
      student_id: student.id,
      group_id: data.group_id,
      joined_at: data.enrollment_date,
      is_active: true,
    } as any)
  }

  // Veli oluşturma
  if (data.parent_phone && data.parent_name) {
    const e164 = toE164(data.parent_phone)
    const digits = e164.replace('+90', '')
    const parentEmail = `${digits}@5mevsim.app`

    const admin = createAdminClient()

    // Aynı telefona sahip mevcut veli profili var mı?
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('phone', e164)
      .eq('role', 'parent')
      .maybeSingle()

    let parentProfileId: string

    if (existingProfile) {
      parentProfileId = existingProfile.id
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: parentEmail,
        password: '111111',
        phone: e164,
        phone_confirm: true,
        email_confirm: true,
        user_metadata: { full_name: data.parent_name },
      })
      if (createErr || !created.user) {
        throw new Error(createErr?.message ?? 'Veli hesabı oluşturulamadı')
      }

      await admin.from('profiles').upsert({
        id: created.user.id,
        full_name: data.parent_name,
        phone: e164,
        email: parentEmail,
        role: 'parent',
        school_id: profile.school_id,
      })
      parentProfileId = created.user.id
    }

    await supabase.from('parent_student').insert({
      parent_profile_id: parentProfileId,
      student_id: student.id,
      relation: 'parent',
      is_primary: true,
    } as any)
  }

  revalidatePath('/ogrenciler')
}

export async function deleteStudent(studentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Oturum bulunamadı')

  const { error } = await supabase.from('students').delete().eq('id', studentId)
  if (error) throw new Error(error.message)

  revalidatePath('/ogrenciler')
}
