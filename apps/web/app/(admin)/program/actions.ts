'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function cancelWeekSessions(
  weekStart: string,
  weekEnd: string,
  reason: string,
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('attendance_sessions')
    .update({ status: 'cancelled', notes: reason || null })
    .gte('session_date', weekStart)
    .lte('session_date', weekEnd)
    .eq('status', 'scheduled')
  if (error) throw new Error(error.message)
  revalidatePath('/program')
}

export async function cancelDaySessions(date: string, reason: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('attendance_sessions')
    .update({ status: 'cancelled', notes: reason || null })
    .eq('session_date', date)
    .eq('status', 'scheduled')
  if (error) throw new Error(error.message)
  revalidatePath('/program')
}
