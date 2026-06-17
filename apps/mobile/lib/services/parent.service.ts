import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../supabase';
import type { AttendanceStatus } from '../mock-data';

// ─── Tipler ───

export type ScheduleSlot = { day_of_week: number; start_time: string };

export type ChildGroup = {
  id: string;
  name: string;
  group_schedule_slots: ScheduleSlot[];
};

export type Child = {
  id: string;
  full_name: string;
  group: ChildGroup | null;
  totalDebt: number;
};

export type ChildGroup4Detail = {
  id: string;
  name: string;
  slots: ScheduleSlot[];
};

export type AttendanceRecord = { date: string; status: AttendanceStatus };

export type Invoice = {
  id: string;
  month: string;
  amount: number;
  paidAmount: number;
  status: string;
};

export type EquipmentInvoice = {
  id: string;
  description: string;
  amount: number;
  paidAmount: number;
  status: string;
  delivered: boolean;
  deliveredAt: string | null;
};

export type ChildDetail = {
  id: string;
  fullName: string;
  group: ChildGroup4Detail | null;
  attendance: AttendanceRecord[];
  aidatInvoices: Invoice[];
  equipInvoices: EquipmentInvoice[];
};

export type WeekTrainingItem = {
  dateStr: string;
  dayLabel: string;
  startTime: string;
  childName: string;
  isToday: boolean;
  isPast: boolean;
};

// ─── Yardımcılar ───

const TR_DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                   'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

function monthLabel(year: number, month: number): string {
  return `${TR_MONTHS[month - 1]} ${year}`;
}

// Haftanın Pazartesi'sini döner
function getMondayOfWeek(d: Date): Date {
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// ─── Bu haftanın antrenman listesi (anasayfa şeridi) ───

export function getWeekTrainingItems(children: Child[]): WeekTrainingItem[] {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const monday = getMondayOfWeek(now);

  const items: WeekTrainingItem[] = [];

  for (const child of children) {
    const slots = child.group?.group_schedule_slots ?? [];
    for (const slot of slots) {
      // day_of_week 0=Pazar, JS ile aynı. Pazartesi'den offset: (dow+6)%7
      const offset = (slot.day_of_week + 6) % 7;
      const date = new Date(monday);
      date.setDate(monday.getDate() + offset);
      const dateStr = date.toISOString().split('T')[0];

      items.push({
        dateStr,
        dayLabel: `${TR_DAYS[date.getDay()]}, ${date.getDate()} ${TR_MONTHS[date.getMonth()]}`,
        startTime: slot.start_time.slice(0, 5),
        childName: child.full_name.split(' ')[0],
        isToday: dateStr === todayStr,
        isPast: dateStr < todayStr,
      });
    }
  }

  return items.sort((a, b) => (a.dateStr > b.dateStr ? 1 : -1));
}

// ─── Önümüzdeki antrenman tarihleri (izin tab için) ───

export function getUpcomingTrainingDates(
  slots: ScheduleSlot[],
  weeksAhead = 4
): { dateStr: string; label: string }[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const todayStr = now.toISOString().split('T')[0];
  const monday = getMondayOfWeek(now);

  const dates: { dateStr: string; label: string; sortKey: string }[] = [];

  for (let week = 0; week < weeksAhead; week++) {
    for (const slot of slots) {
      const offset = (slot.day_of_week + 6) % 7;
      const date = new Date(monday);
      date.setDate(monday.getDate() + week * 7 + offset);
      const dateStr = date.toISOString().split('T')[0];

      if (dateStr >= todayStr) {
        dates.push({
          dateStr,
          label: `${TR_DAYS[date.getDay()]}, ${date.getDate()} ${TR_MONTHS[date.getMonth()]} — ${slot.start_time.slice(0, 5)}`,
          sortKey: dateStr + slot.start_time,
        });
      }
    }
  }

  return dates
    .sort((a, b) => (a.sortKey > b.sortKey ? 1 : -1))
    .map(({ dateStr, label }) => ({ dateStr, label }));
}

// ─── Çocuk listesi (veli anasayfası) ───

export async function getChildren(userId: string): Promise<Child[]> {
  const { data, error } = await supabase
    .from('parent_student')
    .select(`
      students(
        id, full_name,
        student_groups(
          is_active,
          groups(
            id, name,
            group_schedule_slots(day_of_week, start_time)
          )
        ),
        aidat_invoices(amount, paid_amount, status),
        equipment_invoices(amount, paid_amount, status)
      )
    `)
    .eq('parent_profile_id', userId);

  if (error || !data) return [];

  return data.flatMap(({ students: s }) => {
    if (!s) return [];
    const student = s as unknown as {
      id: string;
      full_name: string;
      student_groups: {
        is_active: boolean;
        groups: { id: string; name: string; group_schedule_slots: ScheduleSlot[] } | null;
      }[];
      aidat_invoices: { amount: number; paid_amount: number; status: string }[];
      equipment_invoices: { amount: number; paid_amount: number; status: string }[];
    };

    const activeGroup = student.student_groups.find((sg) => sg.is_active)?.groups ?? null;

    const aidatDebt = student.aidat_invoices
      .filter((inv) => inv.status !== 'paid' && inv.status !== 'waived')
      .reduce((sum, inv) => sum + (Number(inv.amount) - Number(inv.paid_amount ?? 0)), 0);

    const equipDebt = student.equipment_invoices
      .filter((inv) => inv.status !== 'paid' && inv.status !== 'waived')
      .reduce((sum, inv) => sum + (Number(inv.amount) - Number(inv.paid_amount ?? 0)), 0);

    return [{
      id: student.id,
      full_name: student.full_name,
      group: activeGroup
        ? {
            id: activeGroup.id,
            name: activeGroup.name,
            group_schedule_slots: activeGroup.group_schedule_slots.map((sl) => ({
              day_of_week: sl.day_of_week,
              start_time: sl.start_time,
            })),
          }
        : null,
      totalDebt: aidatDebt + equipDebt,
    }];
  });
}

// ─── Çocuk detayı (4 sekme) ───

export async function getChildDetail(studentId: string): Promise<ChildDetail | null> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString().split('T')[0];

  const [studentRes, attendanceRes, aidatRes, equipRes] = await Promise.all([
    supabase
      .from('students')
      .select(`
        id, full_name,
        student_groups(
          is_active,
          groups(id, name, group_schedule_slots(day_of_week, start_time))
        )
      `)
      .eq('id', studentId)
      .single(),

    supabase
      .from('attendance_records')
      .select(`status, attendance_sessions!inner(session_date)`)
      .eq('student_id', studentId)
      .gte('attendance_sessions.session_date', cutoff)
      .order('attendance_sessions(session_date)', { ascending: false }),

    supabase
      .from('aidat_invoices')
      .select('id, period_year, period_month, amount, paid_amount, status')
      .eq('student_id', studentId)
      .order('period_year')
      .order('period_month'),

    supabase
      .from('equipment_invoices')
      .select('id, description, amount, paid_amount, status, delivered, delivered_at')
      .eq('student_id', studentId),
  ]);

  if (studentRes.error || !studentRes.data) return null;

  const s = studentRes.data as unknown as {
    id: string;
    full_name: string;
    student_groups: {
      is_active: boolean;
      groups: { id: string; name: string; group_schedule_slots: ScheduleSlot[] } | null;
    }[];
  };

  const activeGroup = s.student_groups.find((sg) => sg.is_active)?.groups ?? null;

  const attendanceRecords = (attendanceRes.data ?? []) as unknown as {
    status: string;
    attendance_sessions: { session_date: string } | null;
  }[];

  const attendance: AttendanceRecord[] = attendanceRecords
    .filter((r) => r.attendance_sessions?.session_date)
    .map((r) => ({
      date: r.attendance_sessions!.session_date,
      status: r.status as AttendanceStatus,
    }));

  const aidatInvoices: Invoice[] = (aidatRes.data ?? []).map((inv) => ({
    id: inv.id,
    month: monthLabel(inv.period_year, inv.period_month),
    amount: Number(inv.amount),
    paidAmount: Number(inv.paid_amount ?? 0),
    status: inv.status ?? 'pending',
  }));

  const equipInvoices: EquipmentInvoice[] = (equipRes.data ?? []).map((inv) => ({
    id: inv.id,
    description: inv.description ?? 'Forma + Eşofman',
    amount: Number(inv.amount),
    paidAmount: Number(inv.paid_amount ?? 0),
    status: inv.status ?? 'pending',
    delivered: inv.delivered ?? false,
    deliveredAt: inv.delivered_at ?? null,
  }));

  return {
    id: s.id,
    fullName: s.full_name,
    group: activeGroup
      ? {
          id: activeGroup.id,
          name: activeGroup.name,
          slots: activeGroup.group_schedule_slots.map((sl) => ({
            day_of_week: sl.day_of_week,
            start_time: sl.start_time,
          })),
        }
      : null,
    attendance,
    aidatInvoices,
    equipInvoices,
  };
}

// ─── Dekont yükle ───

export async function uploadPaymentReceipt(params: {
  invoiceType: 'aidat' | 'equipment';
  invoiceId: string;
  studentId: string;
  schoolId: string;
  source: 'camera' | 'library';
}): Promise<{ cancelled: boolean; error: string | null }> {
  // İzin iste
  if (params.source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return { cancelled: false, error: 'Kamera erişimi reddedildi.' };
  } else {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return { cancelled: false, error: 'Fotoğraf erişimi reddedildi.' };
  }

  const result = params.source === 'camera'
    ? await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true })
    : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: true });

  if (result.canceled || !result.assets?.[0]) return { cancelled: true, error: null };

  const imageUri = result.assets[0].uri;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { cancelled: false, error: 'Oturum bulunamadı.' };

  // RLS: (storage.foldername(name))[1] = auth.uid() — ilk klasör userId olmalı
  const fileName = `${user.id}/${Date.now()}.jpg`;

  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(fileName, blob, { contentType: 'image/jpeg' });

    if (uploadError) return { cancelled: false, error: 'Dekont yüklenemedi. Lütfen tekrar deneyin.' };

    // Bucket private: dosya yolunu saklıyoruz, admin paneli signed URL üretir
    const { error: paymentError } = await supabase.from('payments').insert({
      school_id: params.schoolId,
      student_id: params.studentId,
      invoice_type: params.invoiceType,
      invoice_id: params.invoiceId,
      amount: 0,
      payment_method: 'other',
      receipt_url: fileName,
    } as any);

    if (paymentError) return { cancelled: false, error: 'Kayıt oluşturulamadı.' };
    return { cancelled: false, error: null };
  } catch {
    return { cancelled: false, error: 'Beklenmeyen bir hata oluştu.' };
  }
}

// ─── İzin bildirimi gönder ───

export async function submitLeaveRequest(params: {
  studentId: string;
  userId: string;
  schoolId: string;
  note: string;
  sessionDate: string;
}): Promise<void> {
  await supabase.from('leave_requests').insert({
    school_id: params.schoolId,
    student_id: params.studentId,
    parent_profile_id: params.userId,
    session_date: params.sessionDate,
    reason: params.note,
  });
}
