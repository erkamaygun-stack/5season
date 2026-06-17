'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function approveReceipt(params: {
  paymentId: string
  amount: number
  paymentMethod: string
  notes?: string
}) {
  if (params.amount <= 0) throw new Error('Tutar sıfırdan büyük olmalı')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Oturum bulunamadı')

  // Mevcut ödeme kaydını al
  const { data: payment, error: fetchError } = await supabase
    .from('payments')
    .select('*')
    .eq('id', params.paymentId)
    .single()

  if (fetchError || !payment) throw new Error('Ödeme kaydı bulunamadı')

  // 0-amount bekleyen kaydı sil
  const { error: deleteError } = await supabase
    .from('payments')
    .delete()
    .eq('id', params.paymentId)

  if (deleteError) throw new Error('Ödeme güncellenemedi: ' + deleteError.message)

  // Gerçek tutarla yeni kayıt insert → DB trigger invoice'ı günceller
  const { error: insertError } = await supabase.from('payments').insert({
    school_id: payment.school_id,
    student_id: payment.student_id,
    invoice_type: payment.invoice_type,
    invoice_id: payment.invoice_id,
    amount: params.amount,
    payment_method: params.paymentMethod,
    payment_date: new Date().toISOString().split('T')[0],
    receipt_url: payment.receipt_url,
    received_by: user.id,
    notes: params.notes ?? null,
  } as any)

  if (insertError) throw new Error('Ödeme kaydedilemedi: ' + insertError.message)

  revalidatePath('/dekontlar')
  revalidatePath('/aidat')
  revalidatePath(`/ogrenciler/${payment.student_id}`)
}

export async function rejectReceipt(paymentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Oturum bulunamadı')

  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', paymentId)
    .eq('amount', 0)

  if (error) throw new Error('Dekont reddedilemedi: ' + error.message)

  revalidatePath('/dekontlar')
}
