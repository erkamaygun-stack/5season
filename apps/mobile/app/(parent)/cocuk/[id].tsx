import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, SafeAreaView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { type AttendanceStatus } from '../../../lib/mock-data';
// import { supabase } from '../../../lib/supabase';

const DAYS: Record<number, string> = {
  0: 'Pazar', 1: 'Pazartesi', 2: 'Salı', 3: 'Çarşamba', 4: 'Perşembe', 5: 'Cuma', 6: 'Cumartesi',
};

const STATUS_CONFIG = {
  present:  { label: 'Geldi',   emoji: '✅', bg: 'bg-green-50',  text: 'text-green-700' },
  absent:   { label: 'Gelmedi', emoji: '❌', bg: 'bg-red-50',    text: 'text-red-700' },
  late:     { label: 'Geç',     emoji: '⏱',  bg: 'bg-yellow-50', text: 'text-yellow-700' },
  excused:  { label: 'İzinli',  emoji: '📋', bg: 'bg-blue-50',   text: 'text-blue-700' },
};

type Tab = 'program' | 'yoklama' | 'borc' | 'izin';

const TABS: { key: Tab; label: string }[] = [
  { key: 'program', label: 'Program' },
  { key: 'yoklama', label: 'Yoklama' },
  { key: 'borc', label: 'Borç' },
  { key: 'izin', label: 'İzin Bildir' },
];

type ScheduleSlot = { day_of_week: number; start_time: string };
type Group = { id: string; name: string; slots: ScheduleSlot[] };
type AttendanceRecord = { date: string; status: AttendanceStatus };
type Invoice = { id: string; month: string; amount: number; paidAmount: number; status: string };

type ChildDetail = {
  id: string;
  fullName: string;
  group: Group | null;
  attendance: AttendanceRecord[];
  invoices: Invoice[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatCurrency(n: number) {
  return n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
}

function ProgramTab({ child }: { child: ChildDetail }) {
  if (!child.group) {
    return <Text className="text-gray-500 mt-4 text-center">Grup atanmamış.</Text>;
  }
  return (
    <View>
      <View className="bg-green-50 rounded-2xl p-4 mb-4">
        <Text className="text-xs text-green-700 font-semibold mb-1">AKTİF GRUP</Text>
        <Text className="text-lg font-bold text-green-900">{child.group.name}</Text>
      </View>
      <Text className="text-sm font-semibold text-gray-700 mb-2">Haftalık Program</Text>
      {child.group.slots.map((slot, i) => (
        <View key={i} className="bg-white rounded-xl px-4 py-3 mb-2 flex-row justify-between items-center"
          style={{ elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 }}>
          <Text className="text-sm font-medium text-gray-800">{DAYS[slot.day_of_week]}</Text>
          <Text className="text-sm text-gray-500">{slot.start_time}</Text>
        </View>
      ))}
    </View>
  );
}

function YoklamaTab({ child }: { child: ChildDetail }) {
  if (child.attendance.length === 0) {
    return (
      <View className="items-center pt-12">
        <Text className="text-4xl mb-3">📋</Text>
        <Text className="text-base text-gray-500">Yoklama kaydı yok.</Text>
      </View>
    );
  }
  return (
    <View>
      <Text className="text-sm font-semibold text-gray-700 mb-2">Son Devamsızlık Kayıtları</Text>
      {child.attendance.map((record, i) => {
        const cfg = STATUS_CONFIG[record.status ?? 'absent'] ?? STATUS_CONFIG.absent;
        return (
          <View key={i} className={`rounded-xl px-4 py-3 mb-2 flex-row justify-between items-center ${cfg.bg}`}>
            <Text className="text-sm font-medium text-gray-800">{formatDate(record.date)}</Text>
            <View className="flex-row items-center gap-1">
              <Text className="text-base">{cfg.emoji}</Text>
              <Text className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function BorcTab({ child }: { child: ChildDetail }) {
  const pending = child.invoices.filter((inv) => inv.status === 'pending');
  const total = pending.reduce((s, inv) => s + (inv.amount - inv.paidAmount), 0);

  if (child.invoices.length === 0) {
    return (
      <View className="items-center pt-12">
        <Text className="text-4xl mb-3">✅</Text>
        <Text className="text-base text-gray-500">Fatura kaydı yok.</Text>
      </View>
    );
  }

  return (
    <View>
      {total > 0 && (
        <View className="bg-red-50 rounded-2xl p-4 mb-4 flex-row justify-between items-center">
          <Text className="text-sm font-semibold text-red-700">Toplam Borç</Text>
          <Text className="text-lg font-bold text-red-700">{formatCurrency(total)}</Text>
        </View>
      )}
      {child.invoices.map((inv) => {
        const remaining = inv.amount - inv.paidAmount;
        const isPaid = inv.status === 'paid';
        return (
          <View key={inv.id} className="bg-white rounded-xl p-4 mb-2"
            style={{ elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 }}>
            <View className="flex-row justify-between items-center mb-1">
              <Text className="text-sm font-semibold text-gray-800">{inv.month}</Text>
              <View className={`px-2 py-0.5 rounded-full ${isPaid ? 'bg-green-100' : 'bg-red-100'}`}>
                <Text className={`text-xs font-semibold ${isPaid ? 'text-green-700' : 'text-red-700'}`}>
                  {isPaid ? 'Ödendi' : 'Bekliyor'}
                </Text>
              </View>
            </View>
            <Text className="text-xs text-gray-500">
              {formatCurrency(inv.paidAmount)} / {formatCurrency(inv.amount)} ödendi
            </Text>
            {!isPaid && remaining > 0 && (
              <TouchableOpacity
                className="mt-3 bg-primary rounded-lg py-2 items-center"
                activeOpacity={0.85}
                onPress={() => Alert.alert('Dekont Yükle', 'Bu özellik yakında aktif olacak.')}
              >
                <Text className="text-white text-xs font-semibold">Dekont Yükle</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </View>
  );
}

function IzinTab({ studentId }: { studentId: string }) {
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSend() {
    if (!note.trim()) return;
    // TODO: Supabase tabloları hazır olduğunda aşağıdaki sorguyu aktif et
    // const { error } = await supabase
    //   .from('leave_requests')
    //   .insert({ student_id: studentId, note: note.trim() });
    // if (error) { Alert.alert('Hata', error.message); return; }
    setSent(true);
    Alert.alert('İzin Bildirimi', 'İzin talebiniz iletildi.');
  }

  if (sent) {
    return (
      <View className="items-center pt-12">
        <Text className="text-4xl mb-3">✅</Text>
        <Text className="text-base font-semibold text-gray-800">İzin bildirimi gönderildi</Text>
        <TouchableOpacity className="mt-4" onPress={() => setSent(false)}>
          <Text className="text-sm text-primary">Yeni İzin Bildir</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      <Text className="text-sm font-semibold text-gray-700 mb-2">Mazeret / Açıklama</Text>
      <TextInput
        className="bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-800 min-h-[100px]"
        placeholder="Çocuğunuzun neden katılamayacağını kısaca açıklayın..."
        multiline
        textAlignVertical="top"
        value={note}
        onChangeText={setNote}
      />
      <TouchableOpacity
        className={`mt-4 rounded-xl py-3.5 items-center ${note.trim() ? 'bg-primary' : 'bg-gray-200'}`}
        onPress={handleSend}
        disabled={!note.trim()}
        activeOpacity={0.85}
      >
        <Text className={`text-sm font-semibold ${note.trim() ? 'text-white' : 'text-gray-400'}`}>
          İzin Bildir
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function CocukDetayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('program');
  const [child, setChild] = useState<ChildDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChild();
  }, [id]);

  async function loadChild() {
    setLoading(true);
    // TODO: Supabase tabloları hazır olduğunda aşağıdaki sorguyu aktif et
    // const { data, error } = await supabase
    //   .from('students')
    //   .select(`
    //     id,
    //     full_name,
    //     student_groups (
    //       groups ( id, name, group_schedule_slots ( day_of_week, start_time ) )
    //     ),
    //     attendance_records (
    //       attendance_sessions ( date ),
    //       status
    //     ),
    //     aidat_invoices ( id, month, amount, paid_amount, status )
    //   `)
    //   .eq('id', id)
    //   .single();
    // if (!error && data) {
    //   const activeGroup = data.student_groups?.[0]?.groups ?? null;
    //   setChild({
    //     id: data.id,
    //     fullName: data.full_name,
    //     group: activeGroup ? {
    //       id: activeGroup.id,
    //       name: activeGroup.name,
    //       slots: activeGroup.group_schedule_slots ?? [],
    //     } : null,
    //     attendance: (data.attendance_records ?? []).map((r) => ({
    //       date: r.attendance_sessions.date,
    //       status: r.status as AttendanceStatus,
    //     })),
    //     invoices: (data.aidat_invoices ?? []).map((inv) => ({
    //       id: inv.id,
    //       month: inv.month,
    //       amount: inv.amount,
    //       paidAmount: inv.paid_amount ?? 0,
    //       status: inv.status,
    //     })),
    //   });
    // }
    setChild(null);
    setLoading(false);
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#dc2626" />
      </SafeAreaView>
    );
  }

  if (!child) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-row items-center px-4 pt-4 pb-3 bg-white border-b border-gray-100">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
            <Text className="text-xl text-gray-700">‹</Text>
          </TouchableOpacity>
          <Text className="text-base font-bold text-gray-900">Öğrenci</Text>
        </View>
        <View className="flex-1 justify-center items-center">
          <Text className="text-4xl mb-3">⚽</Text>
          <Text className="text-base text-gray-500">Öğrenci bilgisi yüklenemedi.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-4 pt-4 pb-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <Text className="text-xl text-gray-700">‹</Text>
        </TouchableOpacity>
        <Text className="text-base font-bold text-gray-900 flex-1">{child.fullName}</Text>
      </View>

      <View className="flex-row bg-white border-b border-gray-100 px-2">
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            className={`flex-1 py-3 items-center border-b-2 ${activeTab === tab.key ? 'border-primary' : 'border-transparent'}`}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text className={`text-xs font-semibold ${activeTab === tab.key ? 'text-primary' : 'text-gray-400'}`}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {activeTab === 'program' && <ProgramTab child={child} />}
        {activeTab === 'yoklama' && <YoklamaTab child={child} />}
        {activeTab === 'borc' && <BorcTab child={child} />}
        {activeTab === 'izin' && <IzinTab studentId={child.id} />}
      </ScrollView>
    </SafeAreaView>
  );
}
