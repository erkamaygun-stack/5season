import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// import { supabase } from '../../../lib/supabase';
// import { useAuth } from '../../../lib/auth-context';

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
}

const ICONS: Record<string, string> = {
  'Aidat Hatırlatması': '💳',
  'Antrenman İptali': '❌',
  'Yoklama Güncellendi': '✅',
};

type Notification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

export default function BildirimlerScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  // const { userId } = useAuth();

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    setLoading(true);
    // TODO: Supabase tabloları hazır olduğunda aşağıdaki sorguyu aktif et
    // const { data, error } = await supabase
    //   .from('notification_log')
    //   .select('id, title, body, created_at')
    //   .eq('recipient_user_id', userId)
    //   .order('created_at', { ascending: false })
    //   .limit(50);
    // if (!error && data) {
    //   setNotifications(data.map((n) => ({
    //     id: n.id,
    //     title: n.title,
    //     body: n.body,
    //     createdAt: n.created_at,
    //   })));
    // }
    setNotifications([]);
    setLoading(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
        <Text className="text-xl font-bold text-gray-900 mb-4">Bildirimler</Text>

        {loading ? (
          <View className="items-center pt-16">
            <ActivityIndicator size="large" color="#dc2626" />
          </View>
        ) : notifications.length === 0 ? (
          <View className="flex-1 justify-center items-center pt-20">
            <Text className="text-4xl mb-3">🔔</Text>
            <Text className="text-base text-gray-500">Henüz bildirim yok.</Text>
          </View>
        ) : (
          notifications.map((notif) => (
            <TouchableOpacity
              key={notif.id}
              className="bg-white rounded-2xl p-4 mb-3 flex-row items-start"
              style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 }}
              activeOpacity={0.8}
            >
              <Text className="text-2xl mr-3 mt-0.5">{ICONS[notif.title] ?? '🔔'}</Text>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-gray-900 mb-0.5">{notif.title}</Text>
                <Text className="text-sm text-gray-600 mb-1">{notif.body}</Text>
                <Text className="text-xs text-gray-400">{formatDate(notif.createdAt)}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
