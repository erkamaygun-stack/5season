import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type AttendanceStatus } from '../../../lib/mock-data';
// import { supabase } from '../../../lib/supabase';

const TR_STATUS: Record<NonNullable<AttendanceStatus>, string> = {
  present: 'Geldi',
  absent: 'Gelmedi',
  late: 'Geç',
  excused: 'İzinli',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

type PastStudent = { fullName: string; status: AttendanceStatus };

type PastSession = {
  id: string;
  date: string;
  groupName: string;
  presentCount: number;
  absentCount: number;
  students: PastStudent[];
};

export default function GecmisScreen() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sessions, setSessions] = useState<PastSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPastSessions();
  }, []);

  async function loadPastSessions() {
    setLoading(true);
    // TODO: Supabase tabloları hazır olduğunda aşağıdaki sorguyu aktif et
    // const { data, error } = await supabase
    //   .from('attendance_sessions')
    //   .select(`
    //     id,
    //     date,
    //     groups ( name ),
    //     attendance_records (
    //       status,
    //       students ( full_name )
    //     )
    //   `)
    //   .lt('date', new Date().toISOString().split('T')[0])
    //   .order('date', { ascending: false })
    //   .limit(30);
    // if (!error && data) {
    //   setSessions(data.map((s) => {
    //     const records = s.attendance_records ?? [];
    //     return {
    //       id: s.id,
    //       date: s.date,
    //       groupName: s.groups.name,
    //       presentCount: records.filter((r) => r.status === 'present').length,
    //       absentCount: records.filter((r) => r.status === 'absent').length,
    //       students: records.map((r) => ({ fullName: r.students.full_name, status: r.status as AttendanceStatus })),
    //     };
    //   }));
    // }
    setSessions([]);
    setLoading(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
        <Text className="text-xl font-bold text-gray-900 mb-4">Geçmiş Yoklamalar</Text>

        {loading ? (
          <View className="items-center pt-16">
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : sessions.length === 0 ? (
          <View className="items-center pt-16">
            <Text className="text-4xl mb-3">📋</Text>
            <Text className="text-base text-gray-500">Henüz yoklama kaydı yok.</Text>
          </View>
        ) : (
          sessions.map((session) => (
            <View
              key={session.id}
              className="bg-white rounded-2xl mb-3 overflow-hidden"
              style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 }}
            >
              <TouchableOpacity
                className="flex-row items-center justify-between p-4"
                onPress={() => setExpanded(expanded === session.id ? null : session.id)}
                activeOpacity={0.8}
              >
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-900 mb-0.5">{session.groupName}</Text>
                  <Text className="text-xs text-gray-500">{formatDate(session.date)}</Text>
                </View>
                <View className="flex-row items-center gap-3 mr-2">
                  <Text className="text-xs text-green-600 font-semibold">✓ {session.presentCount}</Text>
                  <Text className="text-xs text-red-500 font-semibold">✗ {session.absentCount}</Text>
                </View>
                <Text className="text-gray-400 text-base">{expanded === session.id ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {expanded === session.id && session.students.length > 0 && (
                <View className="border-t border-gray-100 px-4 py-3">
                  {session.students.map((student, i) => {
                    const statusLabel = student.status ? TR_STATUS[student.status] : '-';
                    const isPresent = student.status === 'present';
                    const isAbsent = student.status === 'absent';
                    return (
                      <View key={i} className="flex-row justify-between items-center py-1.5">
                        <Text className="text-sm text-gray-700">{student.fullName}</Text>
                        <Text className={`text-xs font-semibold ${isPresent ? 'text-green-600' : isAbsent ? 'text-red-500' : 'text-yellow-600'}`}>
                          {statusLabel}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
