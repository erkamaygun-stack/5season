import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../lib/auth-context';
import {
  getTodaysSessions,
  getWeeklySchedule,
  cancelSession,
  type SessionGroup,
  type WeekSlot,
} from '../../../lib/services/coach.service';

const TR_DAYS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cte'];
const TR_DAYS_FULL = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const TR_MONTHS_FULL = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

function todayLabel() {
  const d = new Date();
  return `${TR_DAYS_FULL[d.getDay()]}, ${d.getDate()} ${TR_MONTHS_FULL[d.getMonth()]}`;
}

function slotDateLabel(dateISO: string, isToday: boolean): string {
  const d = new Date(dateISO + 'T00:00:00');
  const dayStr = `${TR_DAYS[d.getDay()]}, ${d.getDate()} ${TR_MONTHS[d.getMonth()]}`;
  return isToday ? `${dayStr} — Bugün` : dayStr;
}

function groupSlotsByDate(slots: WeekSlot[]): { date: string; isToday: boolean; slots: WeekSlot[] }[] {
  const map = new Map<string, { date: string; isToday: boolean; slots: WeekSlot[] }>();
  for (const slot of slots) {
    if (!map.has(slot.date)) {
      map.set(slot.date, { date: slot.date, isToday: slot.isToday, slots: [] });
    }
    map.get(slot.date)!.slots.push(slot);
  }
  return Array.from(map.values());
}

export default function CoachHomeScreen() {
  const router = useRouter();
  const { name, staffId, userId } = useAuth();
  const qc = useQueryClient();
  const firstName = name ? name.split(' ')[0] : 'Antrenör';

  const { data: groups = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['todaysSessions', staffId],
    queryFn: () => getTodaysSessions(staffId!),
    enabled: !!staffId,
  });

  const { data: weekSlots = [], isLoading: loadingSchedule } = useQuery({
    queryKey: ['weeklySchedule', staffId],
    queryFn: () => getWeeklySchedule(staffId!),
    enabled: !!staffId,
  });

  const cancelMutation = useMutation({
    mutationFn: ({ sessionId, reason }: { sessionId: string; reason: string }) =>
      cancelSession(sessionId, reason, userId!),
    onSuccess: (_, { sessionId }) => {
      qc.setQueryData<SessionGroup[]>(['todaysSessions', staffId], (prev) =>
        (prev ?? []).filter((g) => g.id !== sessionId)
      );
      Alert.alert('İptal Edildi', 'Antrenman iptal edildi.');
    },
    onError: (e: any) => Alert.alert('Hata', e?.message ?? 'Antrenman iptal edilemedi.'),
  });

  function handleCancel(group: SessionGroup) {
    Alert.alert(
      'Antrenmanı İptal Et',
      `"${group.groupName}" antrenmanını iptal etmek istediğinize emin misiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'İptal Et', style: 'destructive', onPress: () => showCancelReasonPicker(group) },
      ]
    );
  }

  function showCancelReasonPicker(group: SessionGroup) {
    Alert.alert(
      'İptal Sebebi',
      'Antrenman neden iptal ediliyor?',
      [
        { text: 'Yağmur / Hava', onPress: () => cancelMutation.mutate({ sessionId: group.id, reason: 'rain' }) },
        { text: 'Resmi Tatil',   onPress: () => cancelMutation.mutate({ sessionId: group.id, reason: 'holiday' }) },
        { text: 'Diğer',         onPress: () => cancelMutation.mutate({ sessionId: group.id, reason: 'other' }) },
        { text: 'Vazgeç', style: 'cancel' },
      ]
    );
  }

  const loading = loadingSessions || loadingSchedule;
  const weekDays = groupSlotsByDate(weekSlots);
  const upcomingDays = weekDays.filter((d) => !d.isToday);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
        <Text className="text-2xl font-bold text-gray-900 mb-0.5">Merhaba, {firstName}.</Text>
        <Text className="text-sm text-gray-500 mb-4">{todayLabel()}</Text>

        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Bugünkü Antrenmanlar
        </Text>

        {loading ? (
          <View className="items-center pt-10 mb-8">
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : groups.length === 0 ? (
          <View
            className="bg-white rounded-2xl p-5 mb-6 items-center"
            style={{ elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 }}
          >
            <Text className="text-3xl mb-2">📅</Text>
            <Text className="text-sm text-gray-500">Bugün antrenman yok.</Text>
          </View>
        ) : (
          <View className="mb-6">
            {groups.map((group) => (
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
                    onPress={() => handleCancel(group)}
                  >
                    <Text className="text-red-600 text-sm font-semibold">İptal</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {!loading && weekSlots.length > 0 && (
          <>
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Haftalık Program
            </Text>

            {weekDays
              .filter((d) => d.isToday)
              .map((day) => (
                <View key={day.date} className="mb-3">
                  <View className="flex-row items-center mb-2 gap-2">
                    <Text className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      {slotDateLabel(day.date, true)}
                    </Text>
                    <View className="bg-coach rounded-full px-2 py-0.5">
                      <Text className="text-white text-xs font-bold">Bugün</Text>
                    </View>
                  </View>
                  {day.slots.map((slot, i) => (
                    <WeekSlotCard key={i} slot={slot} isToday />
                  ))}
                </View>
              ))}

            {upcomingDays.map((day) => (
              <View key={day.date} className="mb-3">
                <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {slotDateLabel(day.date, false)}
                </Text>
                {day.slots.map((slot, i) => (
                  <WeekSlotCard key={i} slot={slot} isToday={false} />
                ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function WeekSlotCard({ slot, isToday }: { slot: WeekSlot; isToday: boolean }) {
  return (
    <View
      className={`rounded-xl p-3 mb-2 flex-row items-center justify-between ${isToday ? 'bg-blue-50 border border-blue-100' : 'bg-white'}`}
      style={isToday ? {} : { elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 }}
    >
      <View className="flex-1">
        <Text className={`text-sm font-semibold mb-0.5 ${isToday ? 'text-blue-700' : 'text-gray-800'}`}>
          {slot.groupName}
        </Text>
        <Text className={`text-xs ${isToday ? 'text-blue-500' : 'text-gray-400'}`}>
          {slot.time} – {slot.endTime}
        </Text>
      </View>
      <View className={`rounded-lg px-2.5 py-1 ${isToday ? 'bg-blue-100' : 'bg-gray-100'}`}>
        <Text className={`text-xs font-semibold ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
          👥 {slot.studentCount}
        </Text>
      </View>
    </View>
  );
}
