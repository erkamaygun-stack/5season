'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addExpense(data: {
  category: string
  amount: number
  expense_date: string
  description?: string
  paid_to?: string
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

  const { error } = await supabase.from('expenses').insert({
    school_id: profile.school_id,
    category: data.category,
    amount: data.amount,
    expense_date: data.expense_date,
    description: data.description || null,
    paid_to: data.paid_to || null,
    created_by: user.id,
  } as any)

  if (error) throw new Error(error.message)
  revalidatePath('/giderler')
  revalidatePath('/finans')
}

export async function updateExpense(id: string, data: {
  category: string
  amount: number
  expense_date: string
  description?: string
  paid_to?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Oturum bulunamadı')

  const { error } = await supabase
    .from('expenses')
    .update({
      category: data.category,
      amount: data.amount,
      expense_date: data.expense_date,
      description: data.description || null,
      paid_to: data.paid_to || null,
    } as any)
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/finans')
}

export async function deleteExpense(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Oturum bulunamadı')

  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/finans')
}
