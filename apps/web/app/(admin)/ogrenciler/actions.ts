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

export async function createAidatInvoice(data: {
  student_id: string
  period_year: number
  period_month: number
  amount: number
  due_date?: string
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

  const { error } = await supabase.from('aidat_invoices').insert({
    school_id: profile.school_id,
    student_id: data.student_id,
    period_year: data.period_year,
    period_month: data.period_month,
    amount: data.amount,
    paid_amount: 0,
    status: 'pending',
    due_date: data.due_date || null,
    is_prorated: false,
  } as any)

  if (error) throw new Error(error.message)
  revalidatePath('/ogrenciler')
}

export async function updateAidatInvoice(id: string, data: {
  amount: number
  due_date?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Oturum bulunamadı')

  const { error } = await supabase
    .from('aidat_invoices')
    .update({ amount: data.amount, due_date: data.due_date || null } as any)
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/ogrenciler')
}

export async function deleteAidatInvoice(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Oturum bulunamadı')

  const { error } = await supabase.from('aidat_invoices').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/ogrenciler')
}

export async function updatePayment(id: string, data: {
  amount: number
  payment_method?: string
  notes?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Oturum bulunamadı')

  // Önce mevcut ödemeyi al (hangi invoice'a ait olduğunu bulmak için)
  const { data: payment, error: fetchErr } = await supabase
    .from('payments')
    .select('invoice_id, invoice_type')
    .eq('id', id)
    .single()
  if (fetchErr || !payment) throw new Error('Ödeme bulunamadı')

  const { error } = await supabase
    .from('payments')
    .update({
      amount: data.amount,
      payment_method: data.payment_method || null,
      notes: data.notes || null,
    } as any)
    .eq('id', id)
  if (error) throw new Error(error.message)

  // Trigger sadece INSERT'te çalıştığı için paid_amount'u manuel güncelle
  if (payment.invoice_type === 'aidat') {
    const { data: allPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('invoice_id', payment.invoice_id)
      .eq('invoice_type', 'aidat')

    const totalPaid = (allPayments ?? []).reduce((sum: number, p: any) => sum + (p.amount ?? 0), 0)

    const { data: inv } = await supabase
      .from('aidat_invoices')
      .select('amount')
      .eq('id', payment.invoice_id)
      .single()

    const invAmount = inv?.amount ?? 0
    const status = totalPaid <= 0 ? 'pending' : totalPaid >= invAmount ? 'paid' : 'partial'

    await supabase
      .from('aidat_invoices')
      .update({ paid_amount: totalPaid, status } as any)
      .eq('id', payment.invoice_id)
  }

  revalidatePath('/ogrenciler')
}

export async function deletePayment(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Oturum bulunamadı')

  const { data: payment, error: fetchErr } = await supabase
    .from('payments')
    .select('invoice_id, invoice_type, amount')
    .eq('id', id)
    .single()
  if (fetchErr || !payment) throw new Error('Ödeme bulunamadı')

  const { error } = await supabase.from('payments').delete().eq('id', id)
  if (error) throw new Error(error.message)

  // Trigger sadece INSERT'te çalıştığı için paid_amount'u manuel yeniden hesapla
  if (payment.invoice_type === 'aidat') {
    const { data: remaining } = await supabase
      .from('payments')
      .select('amount')
      .eq('invoice_id', payment.invoice_id)
      .eq('invoice_type', 'aidat')

    const totalPaid = (remaining ?? []).reduce((sum: number, p: any) => sum + (p.amount ?? 0), 0)

    const { data: inv } = await supabase
      .from('aidat_invoices')
      .select('amount')
      .eq('id', payment.invoice_id)
      .single()

    const invAmount = inv?.amount ?? 0
    const status = totalPaid <= 0 ? 'pending' : totalPaid >= invAmount ? 'paid' : 'partial'

    await supabase
      .from('aidat_invoices')
      .update({ paid_amount: totalPaid, status } as any)
      .eq('id', payment.invoice_id)
  }

  revalidatePath('/ogrenciler')
}
