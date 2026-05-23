import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, SafeAreaView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getSessionStudents, saveAttendance, type StudentRecord } from '../../../lib/services/coach.service';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | null;

const BUTTONS: { status: NonNullable<AttendanceStatus>; label: string; activeClass: string; inactiveClass: string }[] = [
  { status: 'present', label: '✓ Geldi',   activeClass: 'bg-green-500',  inactiveClass: 'bg-gray-100' },
  { status: 'absent',  label: '✗ Gelmedi', activeClass: 'bg-red-500',    inactiveClass: 'bg-gray-100' },
  { status: 'late',    label: '⏱ Geç',     activeClass: 'bg-yellow-400', inactiveClass: 'bg-gray-100' },
  { status: 'excused', label: '📋 İzinli', activeClass: 'bg-blue-400',   inactiveClass: 'bg-gray-100' },
];

function initials(fullName: string) {
  return fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function StudentRow({
  student,
  onMark,
}: {
  student: StudentRecord;
  onMark: (id: string, status: NonNullable<AttendanceStatus>) => void;
}) {
  const disabled = student.isExcused;

  return (
    <View
      className="bg-white rounded-2xl p-4 mb-2"
      style={[
        { elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
        disabled ? { opacity: 0.6 } : undefined,
      ]}
    >
      <View className="flex-row items-center mb-3">
        <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center mr-3">
          <Text className="text-sm font-bold text-gray-600">{initials(student.fullName)}</Text>
        </View>
        <Text className="text-sm font-semibold text-gray-900 flex-1">{student.fullName}</Text>
        {disabled && (
          <View className="bg-blue-100 px-2 py-0.5 rounded-full">
            <Text className="text-[10px] font-semibold text-blue-600">İzin</Text>
          </View>
        )}
      </View>

      <View className="flex-row gap-2">
        {BUTTONS.map((btn) => {
          const isActive = student.status === btn.status;
          return (
            <TouchableOpacity
              key={btn.status}
              className={`flex-1 py-2 rounded-lg items-center ${isActive ? btn.activeClass : btn.inactiveClass}`}
              onPress={() => !disabled && onMark(student.id, btn.status)}
              activeOpacity={disabled ? 1 : 0.8}
              disabled={disabled}
            >
              <Text className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-gray-500'}`}>
                {btn.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function YoklamaScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();

  const [groupName, setGroupName] = useState('Yoklama');
  const [sessionTime, setSessionTime] = useState('');
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { sessionInfo, students: data } = await getSessionStudents(sessionId);
      setGroupName(sessionInfo.groupName);
      setSessionTime(sessionInfo.startTime);
      setStudents(data);
      setLoading(false);
    })();
  }, [sessionId]);

  function mark(id: string, status: NonNullable<AttendanceStatus>) {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
  }

  function markAllPresent() {
    setStudents((prev) =>
      prev.map((s) => (s.isExcused ? s : { ...s, status: 'present' }))
    );
  }

  const markedCount = students.filter((s) => s.status !== null).length;
  const presentCount = students.filter((s) => s.status === 'present').length;

  async function handleSave() {
    if (markedCount < students.length) {
      Alert.alert(
        'Eksik Yoklama',
        `${students.length - markedCount} öğrenci için durum seçilmedi. Yine de kaydet?`,
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Kaydet', onPress: doSave },
        ]
      );
    } else {
      doSave();
    }
  }

  async function doSave() {
    try {
      await saveAttendance(sessionId, students.map((s) => ({ id: s.id, status: s.status })));
      Alert.alert('Kaydedildi', 'Yoklama başarıyla kaydedildi.', [
        { text: 'Tamam', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Yoklama kaydedilemedi.');
    }
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-4 pt-4 pb-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <Text className="text-xl text-gray-700">‹</Text>
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-base font-bold text-gray-900">{groupName}</Text>
          <Text className="text-xs text-gray-500">
            {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
            {sessionTime ? `  ·  ${sessionTime}` : ''}
          </Text>
        </View>
        <View className="bg-blue-50 px-2.5 py-1 rounded-full">
          <Text className="text-xs font-semibold text-coach">{markedCount}/{students.length}</Text>
        </View>
      </View>

      {students.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-4xl mb-3">👥</Text>
          <Text className="text-base text-gray-500">Öğrenci listesi yüklenemedi.</Text>
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <StudentRow student={item} onMark={mark} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        />
      )}

      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 pb-6">
        <View className="flex-row items-center mb-2">
          <Text className="text-xs text-gray-500 flex-1">
            Geldi: {presentCount} · Toplam: {students.length}
          </Text>
          <TouchableOpacity onPress={markAllPresent} className="bg-gray-100 rounded-lg px-3 py-1">
            <Text className="text-xs font-semibold text-gray-600">Hepsini Geldi</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          className="bg-coach rounded-xl py-3.5 items-center"
          onPress={handleSave}
          activeOpacity={0.85}
        >
          <Text className="text-white text-sm font-bold">Yoklamayı Kaydet</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
