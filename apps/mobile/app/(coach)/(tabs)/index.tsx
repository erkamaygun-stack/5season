import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../lib/auth-context';
// import { supabase } from '../../../lib/supabase';

const TR_DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

function todayLabel() {
  const d = new Date();
  return `${TR_DAYS[d.getDay()]}, ${d.getDate()} ${TR_MONTHS[d.getMonth()]}`;
}

type SessionGroup = {
  id: string;
  groupId: string;
  groupName: string;
  time: string;
  studentCount: number;
};

export default function CoachHomeScreen() {
  const router = useRouter();
  const { name, userId } = useAuth();
  const [groups, setGroups] = useState<SessionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const firstName = name ? name.split(' ')[0] : 'Antrenör';

  useEffect(() => {
    loadTodaySessions();
  }, [userId]);

  async function loadTodaySessions() {
    setLoading(true);
    // TODO: Supabase tabloları hazır olduğunda aşağıdaki sorguyu aktif et
    // const today = new Date().toISOString().split('T')[0];
    // const { data, error } = await supabase
    //   .from('attendance_sessions')
    //   .select(`
    //     id,
    //     scheduled_at,
    //     groups ( id, name ),
    //     attendance_records ( count )
    //   `)
    //   .eq('date', today)
    //   .eq('groups.coach_id', userId)
    //   .neq('status', 'cancelled')
    //   .order('scheduled_at');
    // if (!error && data) {
    //   setGroups(data.map((s) => ({
    //     id: s.id,
    //     groupId: s.groups.id,
    //     groupName: s.groups.name,
    //     time: s.scheduled_at.slice(11, 16),
    //     studentCount: s.attendance_records[0]?.count ?? 0,
    //   })));
    // }
    setGroups([]);
    setLoading(false);
  }

  function handleCancel(groupName: string) {
    Alert.alert(
      'Antrenmanı İptal Et',
      `"${groupName}" antrenmanını iptal etmek istediğinize emin misiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'İptal Et',
          style: 'destructive',
          onPress: () => Alert.alert('İptal Edildi', 'Antrenman iptal edildi. Velilere bildirim gönderilecek.'),
        },
      ]
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
        <Text className="text-2xl font-bold text-gray-900 mb-0.5">Merhaba, {firstName}.</Text>
        <Text className="text-sm text-gray-500 mb-1">{todayLabel()}</Text>
        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-5">Bugünkü Antrenmanlar</Text>

        {loading ? (
          <View className="items-center pt-16">
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : groups.length === 0 ? (
          <View className="items-center pt-16">
            <Text className="text-4xl mb-3">📅</Text>
            <Text className="text-base text-gray-500">Bugün antrenman yok.</Text>
          </View>
        ) : (
          groups.map((group) => (
            <View
              key={group.id}
              className="bg-white rounded-2xl p-4 mb-3"
              style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 }}
            >
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900 mb-0.5">{group.groupName}</Text>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm text-gray-500">🕐 {group.time}</Text>
                    <Text className="text-sm text-gray-500">👥 {group.studentCount} öğrenci</Text>
                  </View>
                </View>
              </View>

              <View className="flex-row gap-2">
                <TouchableOpacity
                  className="flex-1 bg-coach rounded-xl py-2.5 items-center"
                  activeOpacity={0.85}
                  onPress={() => router.push(`/(coach)/yoklama/${group.id}`)}
                >
                  <Text className="text-white text-sm font-semibold">Yoklama Al</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="px-4 bg-red-50 rounded-xl py-2.5 items-center"
                  activeOpacity={0.85}
                  onPress={() => handleCancel(group.groupName)}
                >
                  <Text className="text-red-600 text-sm font-semibold">İptal</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
