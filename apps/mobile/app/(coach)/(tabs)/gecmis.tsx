import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../lib/auth-context';
import { getPastSessions, type PastSession } from '../../../lib/services/coach.service';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | null;

const TR_STATUS: Record<NonNullable<AttendanceStatus>, string> = {
  present: 'Geldi',
  absent: 'Gelmedi',
  late: 'Geç',
  excused: 'İzinli',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function GecmisScreen() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const { staffId } = useAuth();

  const { data: sessions = [], isLoading, refetch } = useQuery({
    queryKey: ['pastSessions', staffId],
    queryFn: () => getPastSessions(staffId!),
    enabled: !!staffId,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
        <Text className="text-xl font-bold text-gray-900 mb-4">Geçmiş Yoklamalar</Text>

        {isLoading ? (
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
