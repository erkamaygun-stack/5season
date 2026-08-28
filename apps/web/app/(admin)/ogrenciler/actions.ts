'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

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

  const guardianName = data.parent_name?.trim() || null
  const guardianPhone = data.parent_phone?.trim() ? toE164(data.parent_phone) : null
  if ((guardianName === null) !== (guardianPhone === null)) {
    throw new Error('Veli adı ve telefonu birlikte girilmeli')
  }

  const { error } = await (supabase.rpc as any)('create_student_with_guardian', {
    p_full_name: data.full_name.trim(),
    p_birth_date: data.birth_date || null,
    p_gender: data.gender || null,
    p_blood_type: data.blood_type || null,
    p_enrollment_date: data.enrollment_date,
    p_group_id: data.group_id || null,
    p_notes: data.notes || null,
    p_guardian_name: guardianName,
    p_guardian_phone_e164: guardianPhone,
  })
  if (error) throw new Error('Öğrenci eklenemedi: ' + error.message)

  revalidatePath('/ogrenciler')
}

export async function linkGuardianToStudent(data: {
  student_id: string
  full_name: string
  phone: string
  relation: string
  is_primary: boolean
}) {
  const supabase = await createClient()
  const phoneE164 = toE164(data.phone)
  const { data: guardianId, error } = await (supabase.rpc as any)('link_guardian_to_student', {
    p_student_id: data.student_id,
    p_full_name: data.full_name.trim(),
    p_phone_e164: phoneE164,
    p_relation: data.relation.trim() || 'parent',
    p_is_primary: data.is_primary,
  })
  if (error) throw new Error('Veli bağlanamadı: ' + error.message)

  revalidatePath(`/ogrenciler/${data.student_id}`)
  revalidatePath('/ogrenciler')
  return {
    guardian_id: guardianId as string,
    relation: data.relation.trim() || 'parent',
    is_primary: data.is_primary,
    guardians: {
      id: guardianId as string,
      full_name: data.full_name.trim(),
      phone_e164: phoneE164,
      status: 'unverified',
    },
  }
}

export async function updateGuardianContact(data: {
  guardian_id: string
  full_name: string
  phone: string
}) {
  const supabase = await createClient()
  const phoneE164 = toE164(data.phone)
  const { error } = await (supabase as any)
    .from('guardians')
    .update({ full_name: data.full_name.trim(), phone_e164: phoneE164 })
    .eq('id', data.guardian_id)
  if (error) throw new Error('Veli güncellenemedi: ' + error.message)

  revalidatePath('/ogrenciler')
  return { id: data.guardian_id, full_name: data.full_name.trim(), phone_e164: phoneE164 }
}

export async function unlinkGuardianFromStudent(studentId: string, guardianId: string) {
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('guardian_students')
    .delete()
    .eq('guardian_id', guardianId)
    .eq('student_id', studentId)
  if (error) throw new Error('Veli bağlantısı kaldırılamadı: ' + error.message)

  revalidatePath(`/ogrenciler/${studentId}`)
  revalidatePath('/ogrenciler')
}

export async function deleteStudent(studentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Oturum bulunamadı')

  // Gerçek kullanıcı verisini fiziksel olarak silme; ilişki ve finans kayıtları korunur.
  const { error } = await supabase
    .from('students')
    .update({ status: 'left' } as any)
    .eq('id', studentId)
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

export async function createPayment(data: {
  student_id: string
  invoice_type: 'aidat' | 'equipment'
  invoice_id: string
  amount: number
  payment_method: string
  notes?: string
}) {
  if (data.amount <= 0) throw new Error('Tutar sıfırdan büyük olmalı')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Oturum bulunamadı')

  const { data: paymentId, error } = await (supabase.rpc as any)('record_manual_payment', {
    p_student_id: data.student_id,
    p_invoice_type: data.invoice_type,
    p_invoice_id: data.invoice_id,
    p_amount: data.amount,
    p_payment_method: data.payment_method,
    p_notes: data.notes ?? null,
  })
  if (error) throw new Error('Ödeme kaydedilemedi: ' + error.message)

  revalidatePath('/ogrenciler')
  revalidatePath('/aidat')
  revalidatePath('/finans')
  return paymentId as string
}

export async function updatePayment(id: string, data: {
  amount: number
  payment_method?: string
  notes?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Oturum bulunamadı')

  const { error } = await (supabase.rpc as any)('update_manual_payment', {
    p_payment_id: id,
    p_amount: data.amount,
    p_payment_method: data.payment_method || 'other',
    p_notes: data.notes ?? null,
  })
  if (error) throw new Error('Ödeme güncellenemedi: ' + error.message)

  revalidatePath('/ogrenciler')
  revalidatePath('/aidat')
  revalidatePath('/finans')
}

export async function deletePayment(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Oturum bulunamadı')

  const { error } = await (supabase.rpc as any)('void_manual_payment', {
    p_payment_id: id,
    p_reason: 'admin_voided',
  })
  if (error) throw new Error('Ödeme iptal edilemedi: ' + error.message)

  revalidatePath('/ogrenciler')
  revalidatePath('/aidat')
  revalidatePath('/finans')
}
