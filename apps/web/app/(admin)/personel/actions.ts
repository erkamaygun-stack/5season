'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertOutboundDeliveryAllowed, assertOutboundSystemEnabled } from '@/lib/safety/outbound-policy'

function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('90')) return `+${digits}`
  if (digits.startsWith('0')) return `+90${digits.slice(1)}`
  return `+90${digits}`
}

export async function createStaff(data: {
  full_name: string
  staff_type: string
  email?: string
  phone?: string
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

  const normalizedEmail = data.email?.trim().toLowerCase() || null
  if (data.staff_type === 'coach' && (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail))) {
    throw new Error('Antrenör için geçerli bir e-posta adresi gerekli')
  }

  const notes = data.phone ? `Telefon: ${toE164(data.phone)}` : null

  const { error: staffError } = await supabase.from('staff').insert({
    school_id: profile.school_id,
    profile_id: null,
    full_name: data.full_name,
    staff_type: data.staff_type,
    monthly_salary: data.monthly_salary ?? null,
    hire_date: new Date().toISOString().split('T')[0],
    is_active: true,
    notes,
    invitation_email: data.staff_type === 'coach' ? normalizedEmail : null,
    invitation_status: data.staff_type === 'coach' ? 'not_invited' : 'not_applicable',
  } as any)

  if (staffError) throw new Error(staffError.message)

  revalidatePath('/finans')

  return { invitationRequired: data.staff_type === 'coach' }
}

export async function inviteCoach(staffId: string) {
  // Davet e-postası harici iletişimdir; kilit açılmadan personel e-postası dahi okunmaz.
  assertOutboundSystemEnabled()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Oturum bulunamadı')

  const { data: actor } = await supabase
    .from('profiles')
    .select('school_id, role')
    .eq('id', user.id)
    .single()
  if (!actor?.school_id || !['school_admin', 'super_admin'].includes(actor.role)) {
    throw new Error('Bu işlem için yetkiniz yok')
  }

  const { data: staff, error: staffError } = await (supabase.from('staff') as any)
    .select('id, school_id, full_name, staff_type, invitation_email, is_active')
    .eq('id', staffId)
    .eq('school_id', actor.school_id)
    .single()
  if (staffError || !staff || staff.staff_type !== 'coach' || !staff.is_active) {
    throw new Error('Aktif antrenör kaydı bulunamadı')
  }
  if (!staff.invitation_email) throw new Error('Antrenör e-postası bulunamadı')

  const { data: school } = await (supabase.from('schools') as any)
    .select('communications_status')
    .eq('id', actor.school_id)
    .single()

  const route = assertOutboundDeliveryAllowed({
    recipient: staff.invitation_email,
    communicationsStatus: school?.communications_status ?? 'quarantined',
    purposeCode: 'coach_invitation',
    consentOrLegalBasisConfirmed: true,
  })

  if (route === 'sink') {
    await (supabase.from('staff') as any)
      .update({ invitation_status: 'suppressed', invitation_last_error: null })
      .eq('id', staff.id)
      .eq('school_id', actor.school_id)
    return { delivered: false, suppressed: true }
  }

  const redirectTo = process.env.COACH_INVITE_REDIRECT_URL
  if (!redirectTo) throw new Error('coach_invite_redirect_missing')

  const admin = createAdminClient()
  const { data: invitation, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    staff.invitation_email,
    {
      redirectTo,
      data: { full_name: staff.full_name, role: 'coach', school_id: actor.school_id },
    },
  )
  if (inviteError || !invitation.user) {
    await (supabase.from('staff') as any)
      .update({ invitation_status: 'failed', invitation_last_error: 'provider_rejected' })
      .eq('id', staff.id)
      .eq('school_id', actor.school_id)
    throw new Error('Antrenör daveti gönderilemedi')
  }

  const { error: profileError } = await admin.from('profiles').upsert({
    id: invitation.user.id,
    full_name: staff.full_name,
    phone: null,
    email: staff.invitation_email,
    role: 'coach',
    school_id: actor.school_id,
    is_active: true,
  } as any)
  if (profileError) throw new Error('Davet oluşturuldu fakat profil bağlanamadı')

  const { error: linkError } = await (supabase.from('staff') as any)
    .update({
      profile_id: invitation.user.id,
      invitation_status: 'invited',
      invitation_sent_at: new Date().toISOString(),
      invitation_last_error: null,
    })
    .eq('id', staff.id)
    .eq('school_id', actor.school_id)
  if (linkError) throw new Error('Davet oluşturuldu fakat personel hesabı bağlanamadı')

  revalidatePath('/personel')
  revalidatePath(`/personel/${staff.id}`)
  return { delivered: true, suppressed: false }
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

  revalidatePath('/finans')
}

// Prototip: Steam tarzı detay penceresi için personel + gruplar + maaş geçmişini
// tek seferde döner (bkz. StaffDetailWindow). page.tsx'teki mantığın aynısı.
export async function getStaffDetail(staffId: string) {
  const supabase = await createClient()

  const { data: staff } = await supabase
    .from('staff')
    .select('id, full_name, staff_type, monthly_salary, hire_date, is_active, notes, profile_id')
    .eq('id', staffId)
    .single()

  if (!staff) throw new Error('Personel bulunamadı')

  let phone: string | null = null
  if ((staff as any).profile_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', (staff as any).profile_id)
      .single()
    phone = profile?.phone ?? null
  } else if (staff.notes?.startsWith('Telefon:')) {
    phone = staff.notes.replace('Telefon:', '').trim()
  }

  const [{ data: groups }, { data: salaryPayments }] = await Promise.all([
    supabase
      .from('groups')
      .select('id, name, is_active')
      .eq('primary_coach_id', staffId)
      .order('name'),
    supabase
      .from('staff_salary_payments')
      .select('id, period_year, period_month, amount, payment_method, notes, paid_at')
      .eq('staff_id', staffId)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false }),
  ])

  return {
    staff: { ...(staff as any), phone } as {
      id: string
      full_name: string
      staff_type: string
      monthly_salary: number | null
      hire_date: string | null
      is_active: boolean | null
      notes: string | null
      profile_id: string | null
      phone: string | null
    },
    groups: (groups ?? []) as { id: string; name: string; is_active: boolean | null }[],
    salaryPayments: (salaryPayments ?? []) as {
      id: string
      period_year: number
      period_month: number
      amount: number
      payment_method: string | null
      notes: string | null
      paid_at: string | null
    }[],
  }
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
