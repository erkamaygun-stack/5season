'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// database.types.ts henüz `generate_sessions_for_range` RPC'sini içermiyor
// (migration sonrası `supabase gen types` yeniden çalıştırılınca `any` kaldırılabilir).
// Gece job'u sadece ertesi günün oturumunu ürettiği için, ileri tarihli iptallerden
// önce ilgili aralığın attendance_sessions satırlarının var olduğunu garanti eder.
async function ensureSessionsGenerated(
  supabase: Awaited<ReturnType<typeof createClient>>,
  startDate: string,
  endDate: string,
) {
  await (supabase.rpc as any)('generate_sessions_for_range', {
    p_start_date: startDate,
    p_end_date: endDate,
  })
}

export async function acknowledgeCancelledSession(sessionId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('attendance_sessions')
    .update({ acknowledged_at: new Date().toISOString() } as any)
    .eq('id', sessionId)
  if (error) throw new Error(error.message)
  revalidatePath('/')
}

export async function dismissAbsence(recordId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('attendance_records')
    .update({ dismissed_at: new Date().toISOString() } as any)
    .eq('id', recordId)
  if (error) throw new Error(error.message)
  revalidatePath('/')
}

export async function cancelWeekSessions(
  weekStart: string,
  weekEnd: string,
  reason: string,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  await ensureSessionsGenerated(supabase, weekStart, weekEnd)
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
  revalidatePath('/')
}

export async function cancelDaySessions(date: string, reason: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  await ensureSessionsGenerated(supabase, date, date)
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
  revalidatePath('/')
}

// Tek bir antrenmanı (belirli grup + tarih + saat) iptal eder
export async function cancelSpecificSession(
  groupId: string,
  date: string,
  startTime: string,
  reason: string,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  await ensureSessionsGenerated(supabase, date, date)
  const { error } = await supabase
    .from('attendance_sessions')
    .update({
      status: 'cancelled',
      cancellation_reason: reason || null,
      cancelled_by: user?.id ?? null,
      cancelled_at: new Date().toISOString(),
    } as any)
    .eq('group_id', groupId)
    .eq('session_date', date)
    .eq('start_time', startTime)
    .eq('status', 'scheduled')
  if (error) throw new Error(error.message)
  revalidatePath('/')
}
