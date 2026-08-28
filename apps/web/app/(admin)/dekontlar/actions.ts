'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function approveReceipt(params: {
  submissionId: string
  amount: number
  paymentMethod: string
  notes?: string
}) {
  if (params.amount <= 0) throw new Error('Tutar sıfırdan büyük olmalı')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Oturum bulunamadı')

  const { error } = await (supabase.rpc as any)('review_receipt_submission', {
    p_submission_id: params.submissionId,
    p_decision: 'approved',
    p_amount: params.amount,
    p_payment_method: params.paymentMethod,
    p_reason: params.notes ?? null,
  })
  if (error) throw new Error('Dekont onaylanamadı: ' + error.message)

  revalidatePath('/finans')
  revalidatePath('/dekontlar')
  revalidatePath('/aidat')
}

export async function rejectReceipt(submissionId: string, reason = 'admin_rejected') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Oturum bulunamadı')

  const { error } = await (supabase.rpc as any)('review_receipt_submission', {
    p_submission_id: submissionId,
    p_decision: 'rejected',
    p_amount: null,
    p_payment_method: 'transfer',
    p_reason: reason,
  })
  if (error) throw new Error('Dekont reddedilemedi: ' + error.message)

  revalidatePath('/finans')
  revalidatePath('/dekontlar')
}
