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

export async function createStaff(data: {
  full_name: string
  staff_type: string
  phone: string
  monthly_salary?: number
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

  let profileId: string | null = null

  if (data.staff_type === 'coach' && data.phone) {
    const e164 = toE164(data.phone)
    const admin = createAdminClient()

    // Aynı telefona sahip mevcut profil var mı?
    const { data: existing } = await admin
      .from('profiles')
      .select('id')
      .eq('phone', e164)
      .eq('role', 'coach')
      .maybeSingle()

    if (existing) {
      profileId = existing.id
    } else {
      const { data: created, error } = await admin.auth.admin.createUser({
        phone: e164,
        phone_confirm: true,
        user_metadata: { full_name: data.full_name },
      })
      if (error || !created.user) {
        throw new Error(error?.message ?? 'Kullanıcı oluşturulamadı')
      }
      await admin.from('profiles').upsert({
        id: created.user.id,
        full_name: data.full_name,
        phone: e164,
        role: 'coach',
        school_id: profile.school_id,
        is_active: true,
      })
      profileId = created.user.id
    }
  }

  const notes =
    data.staff_type !== 'coach' && data.phone ? `Telefon: ${data.phone}` : null

  const { error: staffError } = await supabase.from('staff').insert({
    school_id: profile.school_id,
    profile_id: profileId,
    full_name: data.full_name,
    staff_type: data.staff_type,
    monthly_salary: data.monthly_salary ?? null,
    hire_date: new Date().toISOString().split('T')[0],
    is_active: true,
    notes,
  } as any)

  if (staffError) throw new Error(staffError.message)

  revalidatePath('/personel')
}

export async function updateStaff(staffId: string, data: {
  full_name: string
  staff_type: string
  monthly_salary: number | null
  is_active: boolean
  phone?: string
  profile_id?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Oturum bulunamadı')

  const { error } = await supabase
    .from('staff')
    .update({ full_name: data.full_name, staff_type: data.staff_type, monthly_salary: data.monthly_salary, is_active: data.is_active } as any)
    .eq('id', staffId)
  if (error) throw new Error(error.message)

  if (data.profile_id && data.phone !== undefined) {
    const e164 = data.phone ? toE164(data.phone) : null
    await supabase.from('profiles').update({ full_name: data.full_name, phone: e164, is_active: data.is_active } as any).eq('id', data.profile_id)
  }

  revalidatePath(`/personel/${staffId}`)
}

export async function deleteStaff(staffId: string, profileId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Oturum bulunamadı')

  // Önce staff kaydını sil (FK çakışması olmaması için)
  const { error } = await supabase.from('staff').delete().eq('id', staffId)
  if (error) throw new Error(error.message)

  // Sonra auth kullanıcısını sil (profiles cascade ile silinir)
  if (profileId) {
    const admin = createAdminClient()
    const { error: authError } = await admin.auth.admin.deleteUser(profileId)
    if (authError) throw new Error('Kayıt silindi fakat hesap silinemedi: ' + authError.message)
  }

  revalidatePath('/personel')
}

export async function paySalary(data: {
  staff_id: string
  staff_name: string
  period_year: number
  period_month: number
  amount: number
  payment_method: string
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

  const { error: salaryError } = await supabase.from('staff_salary_payments').insert({
    school_id: profile.school_id,
    staff_id: data.staff_id,
    period_year: data.period_year,
    period_month: data.period_month,
    amount: data.amount,
    payment_method: data.payment_method,
    notes: data.notes ?? null,
    paid_at: new Date().toISOString(),
  } as any)

  if (salaryError) throw new Error(salaryError.message)

  // DB trigger (salary_creates_expense) gider kaydını otomatik oluşturuyor.

  revalidatePath(`/personel/${data.staff_id}`)
}
