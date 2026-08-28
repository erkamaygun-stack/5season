'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { assertOutboundSystemEnabled } from '@/lib/safety/outbound-policy'

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

export async function notifyAbsenceParent(recordId: string) {
  // Varsayılan kapalı dış gönderim kilidini herhangi bir veli verisi okunmadan önce uygula.
  assertOutboundSystemEnabled()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Oturum bulunamadı')

  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id')
    .eq('id', user.id)
    .single()
  if (!profile?.school_id) throw new Error('Okul bulunamadı')

  const { data: record, error: recordError } = await supabase
    .from('attendance_records')
    .select('id, student_id, students(full_name)')
    .eq('id', recordId)
    .single()
  if (recordError || !record) throw new Error('Devamsızlık kaydı bulunamadı')

  const { data: parentLink } = await supabase
    .from('parent_student')
    .select('parent_profile_id, profiles(full_name, phone)')
    .eq('student_id', (record as any).student_id)
    .eq('is_primary', true)
    .maybeSingle()

  if (!parentLink) throw new Error('Bu öğrenciye tanımlı veli yok')

  const studentName = (record as any).students?.full_name ?? 'Öğrenci'
  const parentPhone = (parentLink as any).profiles?.phone ?? null

  const { error: insertError } = await supabase.from('notification_log').insert({
    school_id: profile.school_id,
    recipient_profile_id: parentLink.parent_profile_id,
    recipient_phone: parentPhone,
    channel: 'whatsapp',
    template_code: 'absence_notice',
    body_rendered: `${studentName} bugünkü antrenmana katılmadı.`,
    status: 'queued',
    related_entity_type: 'attendance_record',
    related_entity_id: recordId,
  } as any)
  if (insertError) throw new Error(insertError.message)

  const { error: notifiedError } = await supabase
    .from('attendance_records')
    .update({ notified_at: new Date().toISOString() } as any)
    .eq('id', recordId)
  if (notifiedError) throw new Error(notifiedError.message)

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
