import { supabase } from '../supabase';
import type { AttendanceStatus } from '../mock-data';

// ─── Tipler (ekranların beklediği format) ───

export type SessionGroup = {
  id: string;       // session ID (route parametresi olarak kullanılır)
  groupId: string;
  groupName: string;
  time: string;     // "17:00"
  studentCount: number;
};

export type PastStudent = { fullName: string; status: AttendanceStatus };

export type PastSession = {
  id: string;
  date: string;      // ISO date
  groupName: string;
  presentCount: number;
  absentCount: number;
  students: PastStudent[];
};

export type StudentRecord = {
  id: string;
  fullName: string;
  status: AttendanceStatus;
  isExcused: boolean;
};

// ─── Yardımcı ───

function todayDate(): string {
  return toLocalDateString(new Date());
}

function toLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// ─── Bugünün oturumları ───

export async function getTodaysSessions(staffId: string): Promise<SessionGroup[]> {
  const today = todayDate();

  // Coach'un aktif gruplarını ve öğrenci sayılarını çek
  const { data: groups, error: groupsError } = await supabase
    .from('groups')
    .select('id, name, student_groups(id)')
    .eq('primary_coach_id', staffId)
    .eq('is_active', true);

  if (groupsError) throw new Error('Antrenör grupları yüklenemedi.');
  if (!groups?.length) return [];

  const groupIds = groups.map((g) => g.id);

  // Bugünkü planlanmış oturumları çek
  const { data: sessions, error: sessionsError } = await supabase
    .from('attendance_sessions')
    .select('id, group_id, start_time, end_time, status')
    .in('group_id', groupIds)
    .eq('session_date', today)
    .eq('status', 'scheduled');

  if (sessionsError) throw new Error('Bugünkü antrenmanlar yüklenemedi.');
  if (!sessions?.length) return [];

  const groupMap = new Map(
    groups.map((g) => ({
      id: g.id,
      name: g.name,
      // student_groups is an array; .length gives active student count
      // (RLS already filters to the coach's school)
      count: (g.student_groups as { id: string }[]).length,
    })).map((g) => [g.id, g])
  );

  return sessions.map((s): SessionGroup => {
    const group = groupMap.get(s.group_id);
    return {
      id: s.id,
      groupId: s.group_id,
      groupName: group?.name ?? '',
      time: s.start_time.slice(0, 5),
      studentCount: group?.count ?? 0,
    };
  });
}

// ─── Geçmiş oturumlar ───

export async function getPastSessions(staffId: string): Promise<PastSession[]> {
  const today = todayDate();

  const { data: groups, error: groupsError } = await supabase
    .from('groups')
    .select('id, name')
    .eq('primary_coach_id', staffId)
    .eq('is_active', true);

  if (groupsError) throw new Error('Antrenör grupları yüklenemedi.');
  if (!groups?.length) return [];

  const groupIds = groups.map((g) => g.id);
  const groupMap = new Map(groups.map((g) => [g.id, g.name]));

  // Önce kayıtları çek (students join yok — view üzerinden ayrı sorgu)
  const { data: sessions, error: sessionsError } = await supabase
    .from('attendance_sessions')
    .select('id, group_id, session_date, attendance_records(student_id, status)')
    .in('group_id', groupIds)
    .lte('session_date', today)
    .eq('status', 'completed')
    .order('session_date', { ascending: false })
    .limit(20);

  if (sessionsError) throw new Error('Geçmiş antrenmanlar yüklenemedi.');
  if (!sessions) return [];

  // Tüm benzersiz öğrenci ID'lerini topla → student_basic_view'dan adları çek
  const allStudentIds = [
    ...new Set(
      sessions.flatMap((s) =>
        (s.attendance_records as { student_id: string; status: string }[]).map(
          (r) => r.student_id
        )
      )
    ),
  ];

  const { data: studentRows, error: studentRowsError } = allStudentIds.length
    ? await supabase
        .from('student_basic_view')
        .select('id, full_name')
        .in('id', allStudentIds)
    : { data: [] as { id: string; full_name: string }[], error: null };

  if (studentRowsError) throw new Error('Öğrenci adları yüklenemedi.');

  const nameMap = new Map((studentRows ?? []).map((s) => [s.id, s.full_name]));

  return sessions.map((session): PastSession => {
    const records = session.attendance_records as {
      student_id: string;
      status: string;
    }[];

    const students: PastStudent[] = records.map((r) => ({
      fullName: nameMap.get(r.student_id) ?? '',
      status: r.status as AttendanceStatus,
    }));

    const presentCount = students.filter((s) => s.status === 'present').length;
    const absentCount = students.filter((s) => s.status === 'absent').length;

    return {
      id: session.id,
      date: session.session_date,
      groupName: groupMap.get(session.group_id) ?? '',
      presentCount,
      absentCount,
      students,
    };
  });
}

// ─── Oturumdaki öğrenci listesi (yoklama ekranı için) ───

export async function getSessionStudents(sessionId: string): Promise<{
  sessionInfo: { groupName: string; sessionDate: string; startTime: string };
  students: StudentRecord[];
}> {
  const { data: session, error } = await supabase
    .from('attendance_sessions')
    .select(`
      id, group_id, session_date, start_time,
      groups(name),
      attendance_records(student_id, status)
    `)
    .eq('id', sessionId)
    .single();

  if (error || !session) throw new Error('Yoklama oturumu bulunamadı.');

  const groupRelation = session.groups as unknown as { name: string } | { name: string }[] | null;
  const groupName = Array.isArray(groupRelation)
    ? (groupRelation[0]?.name ?? 'Yoklama')
    : (groupRelation?.name ?? 'Yoklama');
  const sessionDate: string = (session as any).session_date ?? '';
  const startTime: string = ((session as any).start_time ?? '').slice(0, 5);

  const { data: sgRows, error: studentGroupError } = await supabase
    .from('student_groups')
    .select('student_id')
    .eq('group_id', session.group_id)
    .eq('is_active', true);

  if (studentGroupError) throw new Error('Grup öğrencileri yüklenemedi.');
  const studentIds = (sgRows ?? []).map((sg) => sg.student_id);

  // İzin isteklerini kontrol et (bu oturum tarihi + bu öğrenciler)
  const { data: leaveRows, error: leaveError } = studentIds.length && sessionDate
    ? await supabase
        .from('leave_requests')
        .select('student_id')
        .in('student_id', studentIds)
        .eq('session_date', sessionDate)
        .neq('status', 'rejected')
    : { data: [] as { student_id: string }[], error: null };

  if (leaveError) throw new Error('İzin bilgileri yüklenemedi.');

  const excusedIds = new Set((leaveRows ?? []).map((r) => r.student_id));

  const { data: studentRows, error: studentRowsError } = studentIds.length
    ? await supabase
        .from('student_basic_view')
        .select('id, full_name')
        .in('id', studentIds)
    : { data: [] as { id: string; full_name: string }[], error: null };

  if (studentRowsError) throw new Error('Öğrenciler yüklenemedi.');

  const existingRecords = session.attendance_records as {
    student_id: string;
    status: string;
  }[];

  const recordMap = new Map(
    existingRecords.map((r) => [r.student_id, r.status as AttendanceStatus])
  );

  const students: StudentRecord[] = (studentRows ?? [])
    .sort((a, b) => a.full_name.localeCompare(b.full_name, 'tr'))
    .map((s): StudentRecord => {
      const isExcused = excusedIds.has(s.id);
      return {
        id: s.id,
        fullName: s.full_name,
        status: isExcused ? 'excused' : (recordMap.get(s.id) ?? null),
        isExcused,
      };
    });

  return { sessionInfo: { groupName, sessionDate, startTime }, students };
}

// ─── Yoklama kaydet ───

export async function saveAttendance(
  sessionId: string,
  records: { id: string; status: AttendanceStatus }[]
): Promise<void> {
  const validRecords = records.filter((r) => r.status !== null);

  if (validRecords.length > 0) {
    const { error: upsertError } = await supabase
      .from('attendance_records')
      .upsert(
        validRecords.map((r) => ({
          session_id: sessionId,
          student_id: r.id,
          status: r.status!,
        })),
        { onConflict: 'session_id,student_id' }
      );
    if (upsertError) throw new Error(upsertError.message);
  }

  const { error: updateError } = await supabase
    .from('attendance_sessions')
    .update({ status: 'completed', taken_at: new Date().toISOString() })
    .eq('id', sessionId);
  if (updateError) throw new Error(updateError.message);
}

// ─── Haftalık program (tekrar eden slotlardan üretilir) ───

export type WeekSlot = {
  dayOfWeek: number;  // 0=Pazar, 1=Pzt, ..., 6=Ctesi (JS Date.getDay() ile aynı)
  date: string;       // ISO date — bu haftaki oluşum tarihi
  groupId: string;
  groupName: string;
  time: string;       // "17:00"
  endTime: string;    // "18:00"
  studentCount: number;
  isToday: boolean;
};

export async function getWeeklySchedule(staffId: string): Promise<WeekSlot[]> {
  const { data: groups, error } = await supabase
    .from('groups')
    .select(`
      id, name,
      group_schedule_slots(day_of_week, start_time, end_time),
      student_groups(id)
    `)
    .eq('primary_coach_id', staffId)
    .eq('is_active', true);

  if (error) throw new Error('Haftalık program yüklenemedi.');
  if (!groups?.length) return [];

  const today = new Date();
  const todayDOW = today.getDay();
  const todayISO = toLocalDateString(today);

  const slots: WeekSlot[] = [];

  for (const group of groups) {
    const studentCount = (group.student_groups as { id: string }[]).length;
    const scheduleSlots = group.group_schedule_slots as {
      day_of_week: number;
      start_time: string;
      end_time: string;
    }[];

    for (const slot of scheduleSlots) {
      // Bu haftaki tarihi hesapla (today + diff gün)
      let diff = slot.day_of_week - todayDOW;
      if (diff < 0) diff += 7;

      const slotDate = new Date(today);
      slotDate.setDate(today.getDate() + diff);
      const dateISO = toLocalDateString(slotDate);

      slots.push({
        dayOfWeek: slot.day_of_week,
        date: dateISO,
        groupId: group.id,
        groupName: group.name,
        time: slot.start_time.slice(0, 5),
        endTime: slot.end_time.slice(0, 5),
        studentCount,
        isToday: dateISO === todayISO,
      });
    }
  }

  return slots.sort((a, b) =>
    a.date !== b.date ? a.date.localeCompare(b.date) : a.time.localeCompare(b.time)
  );
}

// ─── Antrenman iptal ───

export async function cancelSession(
  sessionId: string,
  reason: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('attendance_sessions')
    .update({
      status: 'cancelled',
      cancellation_reason: reason,
      cancelled_by: userId,
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', sessionId);
  if (error) throw new Error(error.message);
}
