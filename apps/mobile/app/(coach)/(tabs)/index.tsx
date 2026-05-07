import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../lib/auth-context';
import { MOCK_TODAY_GROUPS } from '../../../lib/mock-data';

const TR_DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

function todayLabel() {
  const d = new Date();
  return `${TR_DAYS[d.getDay()]}, ${d.getDate()} ${TR_MONTHS[d.getMonth()]}`;
}

export default function CoachHomeScreen() {
  const router = useRouter();
  const { name } = useAuth();
  const groups = MOCK_TODAY_GROUPS;
  const firstName = name ? name.split(' ')[0] : 'Antrenör';

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

        {groups.length === 0 ? (
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
