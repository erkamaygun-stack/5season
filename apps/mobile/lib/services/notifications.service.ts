import { supabase } from '../supabase';

export type Notification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

// template_code → okunabilir başlık
const TEMPLATE_TITLES: Record<string, string> = {
  aidat_reminder: 'Aidat Hatırlatması',
  attendance_update: 'Yoklama Güncellendi',
  session_cancelled: 'Antrenman İptali',
};

export async function getNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notification_log')
    .select('id, template_code, body_rendered, created_at')
    .eq('recipient_profile_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data) return [];

  return data.map((n): Notification => ({
    id: n.id,
    title: TEMPLATE_TITLES[n.template_code ?? ''] ?? 'Bildirim',
    body: n.body_rendered ?? '',
    createdAt: n.created_at ?? '',
  }));
}
