'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

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
