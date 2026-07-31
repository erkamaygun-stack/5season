'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function markLeaveRequestSeen(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('leave_requests')
    .update({ status: 'seen' } as any)
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/gruplar/[id]', 'page')
}

export async function upsertAttendance(
  sessionId: string,
  studentId: string,
  status: 'present' | 'absent' | 'late' | 'excused'
) {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('attendance_records')
    .select('id')
    .eq('session_id', sessionId)
    .eq('student_id', studentId)
    .single()

  if (existing) {
    await supabase
      .from('attendance_records')
      .update({ status } as any)
      .eq('id', existing.id)
  } else {
    await supabase
      .from('attendance_records')
      .insert({ session_id: sessionId, student_id: studentId, status } as any)
  }

  revalidatePath('/yoklama')
}
