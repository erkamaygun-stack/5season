'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { GroupCategory } from '@/lib/group-categories'

async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Oturum bulunamadı')
  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id')
    .eq('id', user.id)
    .single()
  if (!profile?.school_id) throw new Error('Okul bilgisi bulunamadı')
  return { supabase, school_id: profile.school_id }
}

export async function createGroup(data: {
  name: string
  monthly_fee?: number | null
  primary_coach_id?: string | null
  category: GroupCategory
  slots: Array<{ day_of_week: number; start_time: string; end_time: string }>
}) {
  const { supabase, school_id } = await getContext()

  const { data: group, error } = await supabase
    .from('groups')
    .insert({
      school_id,
      name: data.name,
      monthly_fee: data.monthly_fee ?? null,
      primary_coach_id: data.primary_coach_id ?? null,
      category: data.category,
      is_active: true,
    } as any)
    .select('id')
    .single()

  if (error || !group) throw new Error(error?.message ?? 'Grup oluşturulamadı')

  if (data.slots.length > 0) {
    const { error: slotError } = await supabase.from('group_schedule_slots').insert(
      data.slots.map((s) => ({ group_id: group.id, ...s })) as any
    )
    if (slotError) throw new Error(slotError.message)
  }

  revalidatePath('/gruplar')
  revalidatePath('/')
}

export async function updateGroup(
  id: string,
  data: {
    name: string
    monthly_fee?: number | null
    primary_coach_id?: string | null
    category: GroupCategory
    is_active: boolean
  }
) {
  const { supabase } = await getContext()

  const { error } = await supabase
    .from('groups')
    .update({
      name: data.name,
      monthly_fee: data.monthly_fee ?? null,
      primary_coach_id: data.primary_coach_id ?? null,
      category: data.category,
      is_active: data.is_active,
    } as any)
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath(`/gruplar/${id}`)
  revalidatePath('/gruplar')
  revalidatePath('/')
}

export async function updateGroupColor(id: string, color: string) {
  const { supabase } = await getContext()

  const { error } = await supabase
    .from('groups')
    .update({ color } as any)
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath(`/gruplar/${id}`)
  revalidatePath('/')
}

export async function addSlot(
  groupId: string,
  data: { day_of_week: number; start_time: string; end_time: string }
) {
  const { supabase } = await getContext()

  const { error } = await supabase.from('group_schedule_slots').insert({
    group_id: groupId,
    ...data,
  } as any)

  if (error) throw new Error(error.message)

  revalidatePath(`/gruplar/${groupId}`)
}

export async function removeSlot(slotId: string, groupId: string) {
  const { supabase } = await getContext()

  const { error } = await supabase
    .from('group_schedule_slots')
    .delete()
    .eq('id', slotId)

  if (error) throw new Error(error.message)

  revalidatePath(`/gruplar/${groupId}`)
}

export async function addStudentToGroup(groupId: string, studentId: string) {
  const { supabase } = await getContext()

  const { error } = await supabase.from('student_groups').insert({
    student_id: studentId,
    group_id: groupId,
    joined_at: new Date().toISOString().split('T')[0],
    is_active: true,
  } as any)

  if (error) throw new Error(error.message)

  revalidatePath(`/gruplar/${groupId}`)
}

export async function removeStudentFromGroup(studentGroupId: string, groupId: string) {
  const { supabase } = await getContext()

  const { error } = await supabase
    .from('student_groups')
    .update({
      is_active: false,
      left_at: new Date().toISOString().split('T')[0],
    } as any)
    .eq('id', studentGroupId)

  if (error) throw new Error(error.message)

  revalidatePath(`/gruplar/${groupId}`)
}

export async function deleteGroup(id: string) {
  const { supabase } = await getContext()

  const { error } = await supabase.from('groups').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/gruplar')
  revalidatePath('/')
}
