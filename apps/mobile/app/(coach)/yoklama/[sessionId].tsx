import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MOCK_STUDENTS, MOCK_TODAY_GROUPS, type AttendanceStatus } from '../../../lib/mock-data';

type StudentRecord = {
  id: string;
  fullName: string;
  status: AttendanceStatus;
};

const BUTTONS: { status: NonNullable<AttendanceStatus>; label: string; activeClass: string; inactiveClass: string }[] = [
  { status: 'present', label: '✓ Geldi',    activeClass: 'bg-green-500',  inactiveClass: 'bg-gray-100' },
  { status: 'absent',  label: '✗ Gelmedi',  activeClass: 'bg-red-500',    inactiveClass: 'bg-gray-100' },
  { status: 'late',    label: '⏱ Geç',      activeClass: 'bg-yellow-400', inactiveClass: 'bg-gray-100' },
  { status: 'excused', label: '📋 İzinli',  activeClass: 'bg-blue-400',   inactiveClass: 'bg-gray-100' },
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
  return (
    <View className="bg-white rounded-2xl p-4 mb-2"
      style={{ elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 }}>
      <View className="flex-row items-center mb-3">
        <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center mr-3">
          <Text className="text-sm font-bold text-gray-600">{initials(student.fullName)}</Text>
        </View>
        <Text className="text-sm font-semibold text-gray-900 flex-1">{student.fullName}</Text>
      </View>

      <View className="flex-row gap-2">
        {BUTTONS.map((btn) => {
          const isActive = student.status === btn.status;
          return (
            <TouchableOpacity
              key={btn.status}
              className={`flex-1 py-2 rounded-lg items-center ${isActive ? btn.activeClass : btn.inactiveClass}`}
              onPress={() => onMark(student.id, btn.status)}
              activeOpacity={0.8}
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

  const session = MOCK_TODAY_GROUPS.find((g) => g.id === sessionId) ?? MOCK_TODAY_GROUPS[0];

  const [students, setStudents] = useState<StudentRecord[]>(
    MOCK_STUDENTS.map((s) => ({ ...s }))
  );

  function mark(id: string, status: NonNullable<AttendanceStatus>) {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
  }

  const markedCount = students.filter((s) => s.status !== null).length;
  const presentCount = students.filter((s) => s.status === 'present').length;

  function handleSave() {
    if (markedCount < students.length) {
      Alert.alert(
        'Eksik Yoklama',
        `${students.length - markedCount} öğrenci için durum seçilmedi. Yine de kaydet?`,
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Kaydet', onPress: () => { Alert.alert('Kaydedildi', 'Yoklama başarıyla kaydedildi.'); router.back(); } },
        ]
      );
    } else {
      Alert.alert('Kaydedildi', 'Yoklama başarıyla kaydedildi.');
      router.back();
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center px-4 pt-4 pb-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <Text className="text-xl text-gray-700">‹</Text>
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-base font-bold text-gray-900">{session?.groupName ?? 'Yoklama'}</Text>
          <Text className="text-xs text-gray-500">
            {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
        </View>
        <View className="bg-blue-50 px-2.5 py-1 rounded-full">
          <Text className="text-xs font-semibold text-coach">{markedCount}/{students.length}</Text>
        </View>
      </View>

      {/* Student List */}
      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <StudentRow student={item} onMark={mark} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      />

      {/* Footer */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 pb-6">
        <View className="flex-row items-center mb-2">
          <Text className="text-xs text-gray-500 flex-1">
            Geldi: {presentCount} · Toplam: {students.length}
          </Text>
          <Text className="text-xs text-gray-400">{markedCount} işaretlendi</Text>
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
