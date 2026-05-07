import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../lib/auth-context';
import { MOCK_SCHOOL_NAME } from '../../../lib/mock-data';

export default function ParentProfilScreen() {
  const { phone, name, logout } = useAuth();

  function handleLogout() {
    Alert.alert('Çıkış Yap', 'Hesabınızdan çıkmak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Çıkış Yap', style: 'destructive', onPress: logout },
    ]);
  }

  const initial = name ? name[0] : 'V';

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <View className="bg-white mx-4 mt-6 rounded-2xl p-5"
        style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 }}>
        <View className="items-center mb-5">
          <View className="w-16 h-16 rounded-full bg-red-100 items-center justify-center mb-3">
            <Text className="text-2xl font-bold text-red-600">{initial}</Text>
          </View>
          <Text className="text-base font-semibold text-gray-900">{name ?? 'Veli'}</Text>
          <Text className="text-sm text-gray-500">{phone ?? '-'}</Text>
        </View>

        <View className="border-t border-gray-100 pt-4">
          <Row label="Telefon" value={phone ?? '-'} />
          <Row label="Rol" value="Veli" />
          <Row label="Okul" value={MOCK_SCHOOL_NAME} />
        </View>
      </View>

      <TouchableOpacity
        className="mx-4 mt-4 bg-red-50 rounded-2xl p-4 items-center"
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <Text className="text-sm font-semibold text-red-600">Çıkış Yap</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between items-center py-2.5">
      <Text className="text-sm text-gray-500">{label}</Text>
      <Text className="text-sm font-medium text-gray-900">{value}</Text>
    </View>
  );
}
