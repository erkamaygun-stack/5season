import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function handleNotificationNavigation(response: Notifications.NotificationResponse) {
  const data = (response.notification.request.content.data ?? {}) as Record<string, string>;
  const type = data.template_code ?? '';
  const studentId = data.student_id ?? '';

  if ((type === 'aidat_reminder' || type === 'attendance_update') && studentId) {
    router.push(`/(parent)/cocuk/${studentId}` as never);
  } else if (type === 'session_cancelled') {
    router.replace('/(parent)' as never);
  }
}

export async function registerForPushNotifications(userId: string): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Bildirimler',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#dc2626',
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  const { status } = existing === 'granted'
    ? { status: existing }
    : await Notifications.requestPermissionsAsync();

  if (status !== 'granted') return;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync();
    await supabase.from('profiles').update({ push_token: token }).eq('id', userId);
  } catch {
    // Simulator'da veya dev build olmadan token alınamaz; sessizce geç
  }
}

export function setupNotificationHandlers(): () => void {
  // Bildirime tıklayınca ilgili ekrana yönlendir (app foreground / background)
  const responseSub = Notifications.addNotificationResponseReceivedListener(handleNotificationNavigation);

  // Soğuk başlatma: uygulama kapalıyken tıklanan bildirimi işle
  Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response) handleNotificationNavigation(response);
  });

  return () => { responseSub.remove(); };
}
