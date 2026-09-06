'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertOutboundDeliveryAllowed, assertOutboundSystemEnabled } from '@/lib/safety/outbound-policy'
import { today } from '@/lib/utils'

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
    hire_date: today(),
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
    .select('id, school_id, full_name, staff_type, invitation_email, invitation_status, profile_id, is_active')
    .eq('id', staffId)
    .eq('school_id', actor.school_id)
    .single()
  if (staffError || !staff || staff.staff_type !== 'coach' || !staff.is_active) {
    throw new Error('Aktif antrenör kaydı bulunamadı')
  }
  if (!staff.invitation_email) throw new Error('Antrenör e-postası bulunamadı')

  const normalizedEmail = staff.invitation_email.trim().toLowerCase()

  // Aynı okuldaki mevcut yönetici/antrenör hesabını e-posta göndermeden bağla.
  // Bu yol özellikle yöneticinin aynı hesapla mobil uygulamayı kullanmasını sağlar.
  if (!staff.profile_id) {
    const { data: matchingProfiles, error: matchingProfileError } = await supabase
      .from('profiles')
      .select('id, role, is_active')
      .eq('school_id', actor.school_id)
      .ilike('email', normalizedEmail)
      .limit(2)

    if (matchingProfileError) throw new Error('Mevcut hesap kontrol edilemedi')
    if ((matchingProfiles?.length ?? 0) > 1) throw new Error('Bu e-posta birden fazla hesaba bağlı')

    const matchingProfile = matchingProfiles?.[0]
    if (matchingProfile) {
      if (matchingProfile.is_active === false || !['coach', 'school_admin'].includes(matchingProfile.role)) {
        throw new Error('Mevcut hesap antrenör uygulamasına bağlanamaz')
      }

      const { data: otherCoach } = await (supabase.from('staff') as any)
        .select('id')
        .eq('profile_id', matchingProfile.id)
        .eq('staff_type', 'coach')
        .eq('is_active', true)
        .neq('id', staff.id)
        .limit(1)
        .maybeSingle()
      if (otherCoach) throw new Error('Bu hesap zaten aktif bir antrenör kaydına bağlı')

      const { error: linkExistingError } = await (supabase.from('staff') as any)
        .update({
          profile_id: matchingProfile.id,
          invitation_email: normalizedEmail,
          invitation_status: 'accepted',
          invitation_accepted_at: new Date().toISOString(),
          invitation_last_error: null,
        })
        .eq('id', staff.id)
        .eq('school_id', actor.school_id)
      if (linkExistingError) throw new Error('Mevcut hesap antrenör kaydına bağlanamadı')

      revalidatePath('/personel')
      revalidatePath(`/personel/${staff.id}`)
      return { delivered: false, suppressed: false, linkedExisting: true }
    }
  }

  // Buradan sonrası gerçekten e-posta gönderir; güvenlik kilitleri açık olmalıdır.
  assertOutboundSystemEnabled()

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
    return { delivered: false, suppressed: true, linkedExisting: false }
  }

  const redirectTo = process.env.COACH_INVITE_REDIRECT_URL
  if (!redirectTo) throw new Error('coach_invite_redirect_missing')

  const admin = createAdminClient()
  if (staff.profile_id) {
    const { error: resetError } = await admin.auth.resetPasswordForEmail(staff.invitation_email, { redirectTo })
    if (resetError) {
      await (supabase.from('staff') as any)
        .update({ invitation_status: 'failed', invitation_last_error: 'provider_rejected' })
        .eq('id', staff.id)
        .eq('school_id', actor.school_id)
      throw new Error('Antrenör daveti yeniden gönderilemedi')
    }
    await (supabase.from('staff') as any)
      .update({ invitation_status: 'invited', invitation_sent_at: new Date().toISOString(), invitation_last_error: null })
      .eq('id', staff.id)
      .eq('school_id', actor.school_id)
    revalidatePath('/personel')
    revalidatePath(`/personel/${staff.id}`)
    return { delivered: true, suppressed: false, linkedExisting: false }
  }

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
  if (profileError) {
    await admin.auth.admin.deleteUser(invitation.user.id)
    throw new Error('Davet oluşturuldu fakat profil bağlanamadı')
  }

  const { error: linkError } = await (supabase.from('staff') as any)
    .update({
      profile_id: invitation.user.id,
      invitation_status: 'invited',
      invitation_sent_at: new Date().toISOString(),
      invitation_last_error: null,
    })
    .eq('id', staff.id)
    .eq('school_id', actor.school_id)
  if (linkError) {
    // Yalnızca bu davet çağrısında yeni oluşturulan kullanıcıyı telafi et.
    await admin.from('profiles').delete().eq('id', invitation.user.id)
    await admin.auth.admin.deleteUser(invitation.user.id)
    throw new Error('Davet oluşturuldu fakat personel hesabı bağlanamadı')
  }

  revalidatePath('/personel')
  revalidatePath(`/personel/${staff.id}`)
  return { delivered: true, suppressed: false, linkedExisting: false }
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

  const e164 = data.phone ? toE164(data.phone) : null
  const { error } = await (supabase.rpc as any)('update_staff_record', {
    p_staff_id: staffId,
    p_full_name: data.full_name,
    p_staff_type: data.staff_type,
    p_monthly_salary: data.monthly_salary,
    p_is_active: data.is_active,
    p_phone_e164: e164,
  })
  if (error) throw new Error(error.message)

  revalidatePath(`/personel/${staffId}`)
}

export async function deleteStaff(staffId: string, _profileId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Oturum bulunamadı')

  const { error } = await (supabase.rpc as any)('archive_staff_record', { p_staff_id: staffId })
  if (error) throw new Error(error.message)

  revalidatePath('/finans')
}

// Prototip: Steam tarzı detay penceresi için personel + gruplar + maaş geçmişini
// tek seferde döner (bkz. StaffDetailWindow). page.tsx'teki mantığın aynısı.
export async function getStaffDetail(staffId: string) {
  const supabase = await createClient()

  const { data: staff } = await (supabase.from('staff') as any)
    .select('id, full_name, staff_type, monthly_salary, hire_date, is_active, notes, profile_id, invitation_email, invitation_status')
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
      invitation_email: string | null
      invitation_status: string | null
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
