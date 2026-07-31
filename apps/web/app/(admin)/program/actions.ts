'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function cancelWeekSessions(
  weekStart: string,
  weekEnd: string,
  reason: string,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('attendance_sessions')
    .update({
      status: 'cancelled',
      cancellation_reason: reason || null,
      cancelled_by: user?.id ?? null,
      cancelled_at: new Date().toISOString(),
    } as any)
    .gte('session_date', weekStart)
    .lte('session_date', weekEnd)
    .eq('status', 'scheduled')
  if (error) throw new Error(error.message)
  revalidatePath('/program')
  revalidatePath('/')
}

export async function cancelDaySessions(date: string, reason: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('attendance_sessions')
    .update({
      status: 'cancelled',
      cancellation_reason: reason || null,
      cancelled_by: user?.id ?? null,
      cancelled_at: new Date().toISOString(),
    } as any)
    .eq('session_date', date)
    .eq('status', 'scheduled')
  if (error) throw new Error(error.message)
  revalidatePath('/program')
  revalidatePath('/')
}
