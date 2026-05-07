import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../lib/auth-context';
import { MOCK_CHILDREN } from '../../../lib/mock-data';

const DAYS: Record<number, string> = {
  0: 'Paz', 1: 'Pzt', 2: 'Sal', 3: 'Çar', 4: 'Per', 5: 'Cum', 6: 'Cmt',
};

const TR_DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

function todayLabel() {
  const d = new Date();
  return `${TR_DAYS[d.getDay()]}, ${d.getDate()} ${TR_MONTHS[d.getMonth()]}`;
}

type ScheduleSlot = { day_of_week: number; start_time: string };
type Group = { id: string; name: string; group_schedule_slots: ScheduleSlot[] };
type Child = { id: string; full_name: string; group: Group | null; totalDebt: number };

function formatCurrency(amount: number) {
  return amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
}

function ChildCard({ child, onPress }: { child: Child; onPress: () => void }) {
  const hasDebt = child.totalDebt > 0;
  const slots = [...(child.group?.group_schedule_slots ?? [])].sort((a, b) => a.day_of_week - b.day_of_week);

  return (
    <TouchableOpacity
      className="bg-white rounded-2xl p-4 mb-3 shadow-sm"
      style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 }}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View className="flex-row justify-between items-center mb-1">
        <Text className="text-base font-semibold text-gray-900">{child.full_name}</Text>
        <View className={`px-2.5 py-0.5 rounded-full ${hasDebt ? 'bg-red-100' : 'bg-green-100'}`}>
          <Text className={`text-xs font-semibold ${hasDebt ? 'text-red-600' : 'text-green-600'}`}>
            {hasDebt ? formatCurrency(child.totalDebt) : 'Borç yok'}
          </Text>
        </View>
      </View>

      <Text className="text-sm text-gray-500 mb-2.5">
        {child.group ? child.group.name : 'Grup atanmamış'}
      </Text>

      {slots.length > 0 && (
        <View className="flex-row flex-wrap gap-1.5">
          {slots.map((slot, i) => (
            <View key={i} className="bg-gray-100 rounded-lg px-2.5 py-1 items-center">
              <Text className="text-xs font-semibold text-gray-700">{DAYS[slot.day_of_week] ?? '?'}</Text>
              <Text className="text-xs text-gray-500">{slot.start_time.slice(0, 5)}</Text>
            </View>
          ))}
        </View>
      )}

      <Text className="text-xs text-gray-400 mt-2 text-right">Detay için dokun →</Text>
    </TouchableOpacity>
  );
}

export default function ParentHomeScreen() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { name } = useAuth();

  function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setChildren(MOCK_CHILDREN as Child[]);
    if (isRefresh) setRefreshing(false);
    else setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const firstName = name ? name.split(' ')[0] : 'Veli';

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-gray-50" edges={['top']}>
        <ActivityIndicator size="large" color="#dc2626" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#dc2626" />
        }
      >
        <Text className="text-2xl font-bold text-gray-900 mb-0.5">Merhaba, {firstName}.</Text>
        <Text className="text-sm text-gray-500 mb-5">{todayLabel()}</Text>

        {children.length === 0 ? (
          <View className="flex-1 justify-center items-center pt-20">
            <Text className="text-base text-gray-500">Henüz öğrenci eklenmemiş.</Text>
          </View>
        ) : (
          children.map((child) => (
            <ChildCard
              key={child.id}
              child={child}
              onPress={() => router.push(`/(parent)/cocuk/${child.id}`)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
