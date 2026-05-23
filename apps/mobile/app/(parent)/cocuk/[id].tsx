import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Alert,
  SafeAreaView, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../lib/auth-context';
import {
  getChildDetail, submitLeaveRequest, uploadPaymentReceipt,
  getUpcomingTrainingDates,
  type ChildDetail, type ScheduleSlot,
} from '../../../lib/services/parent.service';

// ─── Sabitler ───

const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                   'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const DAY_SHORT  = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const CAL_HEADER = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];

const STATUS_CONFIG = {
  present:  { label: 'Geldi',   emoji: '✅', bg: 'bg-green-500',  text: 'text-white' },
  absent:   { label: 'Gelmedi', emoji: '❌', bg: 'bg-red-400',    text: 'text-white' },
  late:     { label: 'Geç',     emoji: '⏱',  bg: 'bg-yellow-400', text: 'text-white' },
  excused:  { label: 'İzinli',  emoji: '📋', bg: 'bg-blue-400',   text: 'text-white' },
};

type Tab = 'program' | 'yoklama' | 'borc' | 'izin';

const TABS: { key: Tab; label: string }[] = [
  { key: 'program', label: 'Program' },
  { key: 'yoklama', label: 'Yoklama' },
  { key: 'borc', label: 'Borç' },
  { key: 'izin', label: 'İzin Bildir' },
];

function formatCurrency(n: number) {
  return n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
}

// ─── Program Sekmesi ───

function ProgramTab({ child }: { child: ChildDetail }) {
  if (!child.group) {
    return <Text className="text-gray-500 mt-4 text-center">Grup atanmamış.</Text>;
  }

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Pazartesi'den başlayan hafta
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  // Slot haritası: day_of_week → start_time
  const slotMap = new Map<number, string>();
  child.group.slots.forEach((s) => slotMap.set(s.day_of_week, s.start_time));

  // Sıradaki antrenmanı bul (bu hafta ve sonrası)
  let nextDateStr: string | null = null;
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dow = d.getDay();
    const ds = d.toISOString().split('T')[0];
    if (slotMap.has(dow)) {
      if (i === 0) {
        const [h, m] = (slotMap.get(dow) ?? '00:00').split(':').map(Number);
        const sessionTime = new Date(today);
        sessionTime.setHours(h, m, 0, 0);
        if (sessionTime > today) { nextDateStr = ds; break; }
      } else {
        nextDateStr = ds; break;
      }
    }
  }

  // 7 gün (Pzt → Paz)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dow = d.getDay();
    const ds = d.toISOString().split('T')[0];
    const hasTraining = slotMap.has(dow);
    return {
      dayNum: d.getDate(),
      dateStr: ds,
      shortLabel: DAY_SHORT[dow],
      hasTraining,
      startTime: hasTraining ? (slotMap.get(dow) ?? '').slice(0, 5) : null,
      isToday: ds === todayStr,
      isNext: ds === nextDateStr,
    };
  });

  return (
    <View>
      <View className="bg-green-50 rounded-2xl p-4 mb-4">
        <Text className="text-xs text-green-700 font-semibold mb-1">AKTİF GRUP</Text>
        <Text className="text-lg font-bold text-green-900">{child.group.name}</Text>
      </View>

      <Text className="text-sm font-semibold text-gray-700 mb-3">Bu Hafta</Text>
      <View className="flex-row gap-1">
        {days.map((day, i) => (
          <View
            key={i}
            className={`flex-1 rounded-xl py-2.5 items-center ${
              day.isNext
                ? 'bg-primary'
                : day.hasTraining
                ? 'bg-green-50'
                : 'bg-white'
            }`}
            style={[
              { elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
              day.isToday && !day.isNext ? { borderWidth: 2, borderColor: '#dc2626' } : undefined,
            ]}
          >
            <Text className={`text-[10px] font-semibold ${
              day.isNext ? 'text-white' : day.hasTraining ? 'text-green-700' : 'text-gray-400'
            }`}>
              {day.shortLabel}
            </Text>
            <Text className={`text-sm font-bold mt-0.5 ${
              day.isNext ? 'text-white' : day.isToday ? 'text-red-600' : 'text-gray-600'
            }`}>
              {day.dayNum}
            </Text>
            {day.hasTraining && (
              <Text className={`text-[9px] mt-0.5 ${day.isNext ? 'text-white/80' : 'text-green-600'}`}>
                {day.startTime}
              </Text>
            )}
            {day.isNext && (
              <View className="bg-white/20 rounded px-1 mt-1">
                <Text className="text-white text-[8px] font-bold">Sıradaki</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Yoklama Sekmesi ───

function YoklamaTab({ child }: { child: ChildDetail }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  const attendanceMap = new Map<string, keyof typeof STATUS_CONFIG>();
  child.attendance.forEach((r) => attendanceMap.set(r.date, r.status as keyof typeof STATUS_CONFIG));

  const yearMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const summary = { present: 0, absent: 0, late: 0, excused: 0 };
  child.attendance.forEach((r) => {
    if (r.date.startsWith(yearMonthPrefix) && r.status && r.status in summary) {
      summary[r.status as keyof typeof summary]++;
    }
  });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstOffset = (new Date(year, month, 1).getDay() + 6) % 7; // 0=Pzt
  const cells: (number | null)[] = [
    ...Array(firstOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayNum = now.getMonth() === month && now.getFullYear() === year ? now.getDate() : null;

  const summaryItems = [
    { key: 'present', label: 'Geldi', bg: 'bg-green-100', text: 'text-green-700' },
    { key: 'absent', label: 'Gelmedi', bg: 'bg-red-100', text: 'text-red-700' },
    { key: 'late', label: 'Geç', bg: 'bg-yellow-100', text: 'text-yellow-700' },
    { key: 'excused', label: 'İzinli', bg: 'bg-blue-100', text: 'text-blue-700' },
  ] as const;

  return (
    <View>
      {/* Özet chipler */}
      <View className="flex-row gap-2 mb-5">
        {summaryItems.map((item) => (
          <View key={item.key} className={`flex-1 ${item.bg} rounded-xl p-2.5 items-center`}>
            <Text className={`text-xl font-bold ${item.text}`}>{summary[item.key]}</Text>
            <Text className={`text-xs ${item.text} mt-0.5`}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Takvim */}
      <Text className="text-sm font-semibold text-gray-700 mb-3">
        {TR_MONTHS[month]} {year}
      </Text>
      <View className="flex-row mb-2">
        {CAL_HEADER.map((h) => (
          <Text key={h} className="flex-1 text-center text-xs text-gray-400 font-semibold">{h}</Text>
        ))}
      </View>
      {Array.from({ length: cells.length / 7 }, (_, week) => (
        <View key={week} className="flex-row mb-1.5">
          {cells.slice(week * 7, (week + 1) * 7).map((day, col) => {
            if (!day) return <View key={col} className="flex-1 h-8" />;

            const dateStr = `${yearMonthPrefix}-${String(day).padStart(2, '0')}`;
            const status = attendanceMap.get(dateStr);
            const isToday = day === todayNum;
            const statusCfg = status ? STATUS_CONFIG[status] : null;

            return (
              <View
                key={col}
                className={`flex-1 h-8 rounded-lg mx-0.5 items-center justify-center ${
                  statusCfg ? statusCfg.bg : isToday ? 'bg-red-100' : ''
                }`}
                style={isToday && !status ? { borderWidth: 1.5, borderColor: '#dc2626' } : undefined}
              >
                <Text className={`text-xs font-semibold ${
                  statusCfg ? statusCfg.text : isToday ? 'text-red-700' : 'text-gray-400'
                }`}>
                  {day}
                </Text>
              </View>
            );
          })}
        </View>
      ))}

      {child.attendance.length === 0 && (
        <View className="items-center pt-8">
          <Text className="text-3xl mb-2">📋</Text>
          <Text className="text-sm text-gray-500">Bu ay yoklama kaydı yok.</Text>
        </View>
      )}
    </View>
  );
}

// ─── Borç & Ödeme Sekmesi ───

function BorcTab({
  child,
  userId,
  schoolId,
  onRefresh,
}: {
  child: ChildDetail;
  userId: string | null;
  schoolId: string | null;
  onRefresh: () => void;
}) {
  const [uploading, setUploading] = useState<string | null>(null);

  const totalDebt =
    child.aidatInvoices
      .filter((inv) => inv.status !== 'paid' && inv.status !== 'waived')
      .reduce((s, inv) => s + (inv.amount - inv.paidAmount), 0) +
    child.equipInvoices
      .filter((inv) => inv.status !== 'paid' && inv.status !== 'waived')
      .reduce((s, inv) => s + (inv.amount - inv.paidAmount), 0);

  async function handleUpload(invoiceType: 'aidat' | 'equipment', invoiceId: string) {
    if (!userId || !schoolId) return;

    Alert.alert('Dekont Yükle', 'Fotoğraf kaynağını seçin', [
      {
        text: 'Fotoğraf Çek',
        onPress: async () => {
          setUploading(invoiceId);
          const res = await uploadPaymentReceipt({ invoiceType, invoiceId, studentId: child.id, schoolId, source: 'camera' });
          setUploading(null);
          if (!res.cancelled) {
            if (res.error) Alert.alert('Hata', res.error);
            else { Alert.alert('Gönderildi', 'Dekontunuz alındı. İdare onayladıktan sonra ödemeniz işlenecek.'); onRefresh(); }
          }
        },
      },
      {
        text: 'Galeriden Seç',
        onPress: async () => {
          setUploading(invoiceId);
          const res = await uploadPaymentReceipt({ invoiceType, invoiceId, studentId: child.id, schoolId, source: 'library' });
          setUploading(null);
          if (!res.cancelled) {
            if (res.error) Alert.alert('Hata', res.error);
            else { Alert.alert('Gönderildi', 'Dekontunuz alındı. İdare onayladıktan sonra ödemeniz işlenecek.'); onRefresh(); }
          }
        },
      },
      { text: 'İptal', style: 'cancel' },
    ]);
  }

  const hasAny = child.aidatInvoices.length > 0 || child.equipInvoices.length > 0;

  if (!hasAny) {
    return (
      <View className="items-center pt-12">
        <Text className="text-4xl mb-3">✅</Text>
        <Text className="text-base text-gray-500">Fatura kaydı yok.</Text>
      </View>
    );
  }

  return (
    <View>
      {totalDebt > 0 && (
        <View className="bg-red-50 rounded-2xl p-4 mb-5 flex-row justify-between items-center"
          style={{ borderWidth: 1, borderColor: '#fee2e2' }}>
          <Text className="text-sm font-semibold text-red-700">Toplam Borç</Text>
          <Text className="text-xl font-bold text-red-700">{formatCurrency(totalDebt)}</Text>
        </View>
      )}

      {/* Aidat faturalar */}
      {child.aidatInvoices.length > 0 && (
        <>
          <Text className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Aidat</Text>
          {child.aidatInvoices.map((inv) => {
            const isPaid = inv.status === 'paid' || inv.status === 'waived';
            const isUploading = uploading === inv.id;
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
                {!isPaid && (
                  <TouchableOpacity
                    className={`mt-3 rounded-lg py-2 items-center ${isUploading ? 'bg-gray-200' : 'bg-primary'}`}
                    activeOpacity={0.85}
                    disabled={isUploading}
                    onPress={() => handleUpload('aidat', inv.id)}
                  >
                    <Text className={`text-xs font-semibold ${isUploading ? 'text-gray-400' : 'text-white'}`}>
                      {isUploading ? 'Yükleniyor…' : 'Dekont Yükle'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </>
      )}

      {/* Forma faturalar */}
      {child.equipInvoices.length > 0 && (
        <>
          <Text className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 mt-4">Forma</Text>
          {child.equipInvoices.map((inv) => {
            const isPaid = inv.status === 'paid';
            const isUploading = uploading === inv.id;
            return (
              <View key={inv.id} className="bg-white rounded-xl p-4 mb-2"
                style={{ elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 }}>
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-sm font-semibold text-gray-800">{inv.description}</Text>
                  <View className={`px-2 py-0.5 rounded-full ${isPaid ? 'bg-green-100' : 'bg-red-100'}`}>
                    <Text className={`text-xs font-semibold ${isPaid ? 'text-green-700' : 'text-red-700'}`}>
                      {isPaid ? 'Ödendi' : 'Bekliyor'}
                    </Text>
                  </View>
                </View>
                <Text className="text-xs text-gray-500 mb-1">
                  {formatCurrency(inv.paidAmount)} / {formatCurrency(inv.amount)} ödendi
                </Text>
                {/* Forma teslim durumu */}
                <View className={`flex-row items-center gap-1 px-2 py-1 rounded-lg self-start ${inv.delivered ? 'bg-green-50' : 'bg-orange-50'}`}>
                  <Text className="text-xs">{inv.delivered ? '✅' : '📦'}</Text>
                  <Text className={`text-xs font-semibold ${inv.delivered ? 'text-green-700' : 'text-orange-700'}`}>
                    {inv.delivered ? 'Forma teslim edildi' : 'Teslim bekleniyor'}
                  </Text>
                </View>
                {!isPaid && (
                  <TouchableOpacity
                    className={`mt-3 rounded-lg py-2 items-center ${isUploading ? 'bg-gray-200' : 'bg-primary'}`}
                    activeOpacity={0.85}
                    disabled={isUploading}
                    onPress={() => handleUpload('equipment', inv.id)}
                  >
                    <Text className={`text-xs font-semibold ${isUploading ? 'text-gray-400' : 'text-white'}`}>
                      {isUploading ? 'Yükleniyor…' : 'Dekont Yükle'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </>
      )}
    </View>
  );
}

// ─── İzin Bildir Sekmesi ───

function IzinTab({
  studentId,
  userId,
  schoolId,
  slots,
}: {
  studentId: string;
  userId: string | null;
  schoolId: string | null;
  slots: ScheduleSlot[];
}) {
  const [selectedDate, setSelectedDate] = useState<{ dateStr: string; label: string } | null>(null);
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const upcomingDates = getUpcomingTrainingDates(slots);

  async function handleSend() {
    if (!note.trim() || !userId || !schoolId || !selectedDate) return;
    await submitLeaveRequest({
      studentId,
      userId,
      schoolId,
      note: note.trim(),
      sessionDate: selectedDate.dateStr,
    });
    setSent(true);
    Alert.alert('İzin Bildirimi', 'İzin talebiniz iletildi.');
  }

  if (sent) {
    return (
      <View className="items-center pt-12">
        <Text className="text-4xl mb-3">✅</Text>
        <Text className="text-base font-semibold text-gray-800">İzin bildirimi gönderildi</Text>
        <TouchableOpacity className="mt-4" onPress={() => { setSent(false); setSelectedDate(null); setNote(''); }}>
          <Text className="text-sm text-primary">Yeni İzin Bildir</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (slots.length === 0) {
    return (
      <View className="items-center pt-12">
        <Text className="text-3xl mb-3">📅</Text>
        <Text className="text-sm text-gray-500 text-center">Aktif antrenman programı bulunamadı.</Text>
      </View>
    );
  }

  const canSend = !!selectedDate && !!note.trim();

  return (
    <View>
      {/* Tarih seçici */}
      <Text className="text-sm font-semibold text-gray-700 mb-2">Antrenman Tarihi</Text>
      <TouchableOpacity
        className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex-row justify-between items-center"
        onPress={() => setShowPicker(true)}
        activeOpacity={0.8}
      >
        <Text className={selectedDate ? 'text-sm text-gray-800' : 'text-sm text-gray-400'}>
          {selectedDate ? selectedDate.label : 'Tarih seçin…'}
        </Text>
        <Text className="text-gray-400">▾</Text>
      </TouchableOpacity>

      {/* Sebep */}
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
        className={`mt-4 rounded-xl py-3.5 items-center ${canSend ? 'bg-primary' : 'bg-gray-200'}`}
        onPress={handleSend}
        disabled={!canSend}
        activeOpacity={0.85}
      >
        <Text className={`text-sm font-semibold ${canSend ? 'text-white' : 'text-gray-400'}`}>
          İzin Bildir
        </Text>
      </TouchableOpacity>

      {/* Tarih seçici modal */}
      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        />
        <View className="bg-white rounded-t-3xl px-4 pt-4 pb-8" style={{ maxHeight: '60%' }}>
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-base font-bold text-gray-900">Antrenman Tarihi Seç</Text>
            <TouchableOpacity onPress={() => setShowPicker(false)}>
              <Text className="text-sm text-gray-500">Kapat</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={upcomingDates}
            keyExtractor={(item) => item.dateStr}
            renderItem={({ item }) => (
              <TouchableOpacity
                className={`py-3.5 px-4 rounded-xl mb-2 ${
                  selectedDate?.dateStr === item.dateStr ? 'bg-primary' : 'bg-gray-50'
                }`}
                onPress={() => { setSelectedDate(item); setShowPicker(false); }}
                activeOpacity={0.8}
              >
                <Text className={`text-sm font-medium ${
                  selectedDate?.dateStr === item.dateStr ? 'text-white' : 'text-gray-800'
                }`}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

// ─── Ana Ekran ───

export default function CocukDetayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { userId, schoolId } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('program');

  const { data: child, isLoading } = useQuery({
    queryKey: ['childDetail', id],
    queryFn: () => getChildDetail(id),
    enabled: !!id,
  });

  function invalidateChild() {
    qc.invalidateQueries({ queryKey: ['childDetail', id] });
  }

  if (isLoading) {
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
        {activeTab === 'borc' && (
          <BorcTab child={child} userId={userId} schoolId={schoolId} onRefresh={invalidateChild} />
        )}
        {activeTab === 'izin' && (
          <IzinTab
            studentId={child.id}
            userId={userId}
            schoolId={schoolId}
            slots={child.group?.slots ?? []}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
