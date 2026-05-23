'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
    const admin = createAdminClient()
    const { data: created, error } = await admin.auth.admin.createUser({
      phone: data.phone,
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
      role: 'coach',
      school_id: profile.school_id,
    })
    profileId = created.user.id
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

  const { error: expenseError } = await supabase.from('expenses').insert({
    school_id: profile.school_id,
    category: 'salary',
    description: `Maaş - ${data.staff_name}`,
    amount: data.amount,
    expense_date: new Date().toISOString().split('T')[0],
    paid_to: data.staff_name,
    created_by: user.id,
  } as any)

  if (expenseError) throw new Error(expenseError.message)

  revalidatePath(`/personel/${data.staff_id}`)
}
