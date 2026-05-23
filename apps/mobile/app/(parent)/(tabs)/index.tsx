import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../lib/auth-context';
import { getChildren, getWeekTrainingItems, type Child, type WeekTrainingItem } from '../../../lib/services/parent.service';

const DAYS: Record<number, string> = {
  0: 'Paz', 1: 'Pzt', 2: 'Sal', 3: 'Çar', 4: 'Per', 5: 'Cum', 6: 'Cmt',
};

const TR_DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

function todayLabel() {
  const d = new Date();
  return `${TR_DAYS[d.getDay()]}, ${d.getDate()} ${TR_MONTHS[d.getMonth()]}`;
}

function formatCurrency(amount: number) {
  return amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
}

function TrainingStrip({ items }: { items: WeekTrainingItem[] }) {
  if (items.length === 0) return null;
  return (
    <View className="mb-5">
      <Text className="text-sm font-semibold text-gray-700 mb-2">Bu Hafta Antrenmanları</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {items.map((item, i) => (
          <View
            key={i}
            className={`rounded-2xl px-4 py-3 min-w-[110px] ${
              item.isToday ? 'bg-primary' : item.isPast ? 'bg-gray-100' : 'bg-green-50'
            }`}
            style={{ elevation: item.isToday ? 3 : 1 }}
          >
            <Text className={`text-xs font-semibold mb-0.5 ${
              item.isToday ? 'text-white/80' : item.isPast ? 'text-gray-400' : 'text-green-700'
            }`}>
              {item.childName}
            </Text>
            <Text className={`text-sm font-bold ${
              item.isToday ? 'text-white' : item.isPast ? 'text-gray-500' : 'text-green-900'
            }`}>
              {item.startTime}
            </Text>
            <Text className={`text-xs mt-0.5 ${
              item.isToday ? 'text-white/70' : item.isPast ? 'text-gray-400' : 'text-green-600'
            }`}>
              {item.dayLabel.split(',')[0]}
            </Text>
            {item.isToday && (
              <Text className="text-white text-[10px] font-semibold mt-1">Bugün</Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
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
  const router = useRouter();
  const { name, userId, schoolName, logoUrl } = useAuth();

  const { data: children = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['children', userId],
    queryFn: () => getChildren(userId!),
    enabled: !!userId,
  });

  const firstName = name ? name.split(' ')[0] : 'Veli';
  const totalDebt = children.reduce((sum, c) => sum + c.totalDebt, 0);
  const weekItems = getWeekTrainingItems(children);

  if (isLoading) {
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
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor="#dc2626" />
        }
      >
        {/* Header: selam + okul logosu */}
        <View className="flex-row justify-between items-center mb-0.5">
          <Text className="text-2xl font-bold text-gray-900">Merhaba, {firstName}.</Text>
          {logoUrl ? (
            <Image
              source={{ uri: logoUrl }}
              style={{ width: 44, height: 44, borderRadius: 8 }}
              resizeMode="contain"
            />
          ) : (
            <View className="bg-primary/10 px-3 py-1.5 rounded-lg">
              <Text className="text-xs font-semibold text-primary" numberOfLines={1}>{schoolName}</Text>
            </View>
          )}
        </View>
        <Text className="text-sm text-gray-500 mb-4">{todayLabel()}</Text>

        {/* Toplam borç KPI */}
        {totalDebt > 0 && (
          <View
            className="bg-red-50 rounded-2xl p-4 mb-5 flex-row justify-between items-center"
            style={{ elevation: 1, borderWidth: 1, borderColor: '#fee2e2' }}
          >
            <View>
              <Text className="text-xs font-semibold text-red-500 mb-0.5">TOPLAM BAKIYE</Text>
              <Text className="text-2xl font-bold text-red-700">{formatCurrency(totalDebt)}</Text>
            </View>
            <Text className="text-3xl">💳</Text>
          </View>
        )}

        {/* Bu hafta antrenmanları şeridi */}
        <TrainingStrip items={weekItems} />

        {/* Çocuk kartları */}
        {children.length === 0 ? (
          <View className="flex-1 justify-center items-center pt-20">
            <Text className="text-4xl mb-3">⚽</Text>
            <Text className="text-base text-gray-500">Henüz öğrenci eklenmemiş.</Text>
          </View>
        ) : (
          <>
            <Text className="text-sm font-semibold text-gray-700 mb-2">Çocuklarım</Text>
            {children.map((child) => (
              <ChildCard
                key={child.id}
                child={child}
                onPress={() => router.push(`/(parent)/cocuk/${child.id}`)}
              />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
