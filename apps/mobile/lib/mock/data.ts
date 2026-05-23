// Mock veri — seed.sql yapısıyla birebir alan isimleri (Supabase swap için)
// Bugün: 2026-05-10 (Cumartesi)

export const SCHOOL_ID = '11111111-1111-1111-1111-111111111111';
export const SCHOOL_NAME = 'Kapaklı Site Spor';

// ─────────────────────────────────────────────────────────────
// Profiller: E.164 telefon → profil mapping
// ─────────────────────────────────────────────────────────────

export type MockProfile = {
  id: string;
  phone: string;
  full_name: string;
  role: 'parent' | 'coach';
  school_id: string;
  staffId?: string;
  groupName?: string;
};

export const MOCK_PROFILES: Record<string, MockProfile> = {
  '+905551000001': { id: 'profile-p001', phone: '+905551000001', full_name: 'Mehmet Yılmaz', role: 'parent', school_id: SCHOOL_ID },
  '+905551000002': { id: 'profile-p002', phone: '+905551000002', full_name: 'Fatma Demir',   role: 'parent', school_id: SCHOOL_ID },
  '+905551000003': { id: 'profile-p003', phone: '+905551000003', full_name: 'Mustafa Arslan', role: 'parent', school_id: SCHOOL_ID },
  '+905551000004': { id: 'profile-p004', phone: '+905551000004', full_name: 'Serap Yıldız',  role: 'parent', school_id: SCHOOL_ID },
  '+905551000005': { id: 'profile-p005', phone: '+905551000005', full_name: 'Hüseyin Doğan', role: 'parent', school_id: SCHOOL_ID },
  '+905551000006': { id: 'profile-p006', phone: '+905551000006', full_name: 'Zeynep Şahin',  role: 'parent', school_id: SCHOOL_ID },
  '+905559990001': {
    id: 'profile-c001', phone: '+905559990001', full_name: 'Ahmet Kara', role: 'coach', school_id: SCHOOL_ID,
    staffId: '22222222-2222-2222-2222-222222222201', groupName: 'U9 Salı-Perşembe 17:00',
  },
  '+905559990002': {
    id: 'profile-c002', phone: '+905559990002', full_name: 'Mehmet Öz', role: 'coach', school_id: SCHOOL_ID,
    staffId: '22222222-2222-2222-2222-222222222202', groupName: 'U11 Salı-Perşembe 18:00',
  },
  '+905559990003': {
    id: 'profile-c003', phone: '+905559990003', full_name: 'Ali Çetin', role: 'coach', school_id: SCHOOL_ID,
    staffId: '22222222-2222-2222-2222-222222222203', groupName: 'U13 Cumartesi 10:00',
  },
};

// ─────────────────────────────────────────────────────────────
// Gruplar
// ─────────────────────────────────────────────────────────────

export const GROUPS = [
  {
    id: '33333333-3333-3333-3333-333333333301',
    name: 'U9 Salı-Perşembe 17:00',
    primary_coach_id: '22222222-2222-2222-2222-222222222201',
    capacity: 16,
    monthly_fee: 2500,
    slots: [
      { day_of_week: 2, start_time: '17:00', end_time: '18:00' },
      { day_of_week: 4, start_time: '17:00', end_time: '18:00' },
    ],
  },
  {
    id: '33333333-3333-3333-3333-333333333302',
    name: 'U11 Salı-Perşembe 18:00',
    primary_coach_id: '22222222-2222-2222-2222-222222222202',
    capacity: 18,
    monthly_fee: 2500,
    slots: [
      { day_of_week: 2, start_time: '18:00', end_time: '19:00' },
      { day_of_week: 4, start_time: '18:00', end_time: '19:00' },
    ],
  },
  {
    id: '33333333-3333-3333-3333-333333333303',
    name: 'U13 Cumartesi 10:00',
    primary_coach_id: '22222222-2222-2222-2222-222222222203',
    capacity: 20,
    monthly_fee: 2500,
    slots: [
      { day_of_week: 6, start_time: '10:00', end_time: '11:30' },
    ],
  },
] as const;

// ─────────────────────────────────────────────────────────────
// Öğrenciler
// ─────────────────────────────────────────────────────────────

export const STUDENTS = [
  { id: 'student-001', full_name: 'Ali Yılmaz',     group_id: '33333333-3333-3333-3333-333333333301' },
  { id: 'student-002', full_name: 'Berk Yılmaz',    group_id: '33333333-3333-3333-3333-333333333301' },
  { id: 'student-003', full_name: 'Can Demir',       group_id: '33333333-3333-3333-3333-333333333301' },
  { id: 'student-004', full_name: 'Deniz Şahin',    group_id: '33333333-3333-3333-3333-333333333301' },
  { id: 'student-005', full_name: 'Efe Demir',       group_id: '33333333-3333-3333-3333-333333333302' },
  { id: 'student-006', full_name: 'Furkan Arslan',  group_id: '33333333-3333-3333-3333-333333333302' },
  { id: 'student-007', full_name: 'Görkem Yıldız',  group_id: '33333333-3333-3333-3333-333333333302' },
  { id: 'student-008', full_name: 'Hasan Doğan',    group_id: '33333333-3333-3333-3333-333333333303' },
  { id: 'student-009', full_name: 'İbrahim Yıldız', group_id: '33333333-3333-3333-3333-333333333303' },
  { id: 'student-010', full_name: 'Jamal Şahin',    group_id: '33333333-3333-3333-3333-333333333303' },
];

// ─────────────────────────────────────────────────────────────
// Veli → Öğrenci ilişkileri
// ─────────────────────────────────────────────────────────────

export const PARENT_STUDENT = [
  { parent_profile_id: 'profile-p001', student_id: 'student-001' }, // Mehmet → Ali
  { parent_profile_id: 'profile-p001', student_id: 'student-002' }, // Mehmet → Berk (kardeş, aynı U9)
  { parent_profile_id: 'profile-p002', student_id: 'student-003' }, // Fatma → Can (U9)
  { parent_profile_id: 'profile-p002', student_id: 'student-005' }, // Fatma → Efe (kardeş, U11)
  { parent_profile_id: 'profile-p003', student_id: 'student-006' }, // Mustafa → Furkan (U11)
  { parent_profile_id: 'profile-p004', student_id: 'student-007' }, // Serap → Görkem (U11)
  { parent_profile_id: 'profile-p004', student_id: 'student-009' }, // Serap → İbrahim (kardeş, U13)
  { parent_profile_id: 'profile-p005', student_id: 'student-008' }, // Hüseyin → Hasan (U13)
  { parent_profile_id: 'profile-p006', student_id: 'student-004' }, // Zeynep → Deniz (U9)
  { parent_profile_id: 'profile-p006', student_id: 'student-010' }, // Zeynep → Jamal (kardeş, U13)
];

// ─────────────────────────────────────────────────────────────
// Antrenman oturumları
// Bugün: 2026-05-10 (Cumartesi = day_of_week 6)
// ─────────────────────────────────────────────────────────────

export type SessionStatus = 'scheduled' | 'completed' | 'cancelled';

export type Session = {
  id: string;
  group_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  status: SessionStatus;
  cancellation_reason?: string;
};

export const SESSIONS: Session[] = [
  // ── U9 (Salı + Perşembe 17:00) ──
  { id: 'sess-u9-0428', group_id: '33333333-3333-3333-3333-333333333301', session_date: '2026-04-28', start_time: '17:00', end_time: '18:00', status: 'completed' },
  { id: 'sess-u9-0430', group_id: '33333333-3333-3333-3333-333333333301', session_date: '2026-04-30', start_time: '17:00', end_time: '18:00', status: 'completed' },
  { id: 'sess-u9-0505', group_id: '33333333-3333-3333-3333-333333333301', session_date: '2026-05-05', start_time: '17:00', end_time: '18:00', status: 'completed' },
  { id: 'sess-u9-0507', group_id: '33333333-3333-3333-3333-333333333301', session_date: '2026-05-07', start_time: '17:00', end_time: '18:00', status: 'completed' },
  { id: 'sess-u9-0512', group_id: '33333333-3333-3333-3333-333333333301', session_date: '2026-05-12', start_time: '17:00', end_time: '18:00', status: 'scheduled' },
  { id: 'sess-u9-0514', group_id: '33333333-3333-3333-3333-333333333301', session_date: '2026-05-14', start_time: '17:00', end_time: '18:00', status: 'scheduled' },

  // ── U11 (Salı + Perşembe 18:00) ──
  { id: 'sess-u11-0428', group_id: '33333333-3333-3333-3333-333333333302', session_date: '2026-04-28', start_time: '18:00', end_time: '19:00', status: 'completed' },
  { id: 'sess-u11-0430', group_id: '33333333-3333-3333-3333-333333333302', session_date: '2026-04-30', start_time: '18:00', end_time: '19:00', status: 'completed' },
  { id: 'sess-u11-0505', group_id: '33333333-3333-3333-3333-333333333302', session_date: '2026-05-05', start_time: '18:00', end_time: '19:00', status: 'completed' },
  { id: 'sess-u11-0507', group_id: '33333333-3333-3333-3333-333333333302', session_date: '2026-05-07', start_time: '18:00', end_time: '19:00', status: 'completed' },
  { id: 'sess-u11-0512', group_id: '33333333-3333-3333-3333-333333333302', session_date: '2026-05-12', start_time: '18:00', end_time: '19:00', status: 'scheduled' },
  { id: 'sess-u11-0514', group_id: '33333333-3333-3333-3333-333333333302', session_date: '2026-05-14', start_time: '18:00', end_time: '19:00', status: 'scheduled' },

  // ── U13 (Cumartesi 10:00) ──
  { id: 'sess-u13-0426', group_id: '33333333-3333-3333-3333-333333333303', session_date: '2026-04-26', start_time: '10:00', end_time: '11:30', status: 'completed' },
  { id: 'sess-u13-0503', group_id: '33333333-3333-3333-3333-333333333303', session_date: '2026-05-03', start_time: '10:00', end_time: '11:30', status: 'completed' },
  { id: 'sess-u13-0510', group_id: '33333333-3333-3333-3333-333333333303', session_date: '2026-05-10', start_time: '10:00', end_time: '11:30', status: 'scheduled' }, // BUGÜN
  { id: 'sess-u13-0517', group_id: '33333333-3333-3333-3333-333333333303', session_date: '2026-05-17', start_time: '10:00', end_time: '11:30', status: 'scheduled' },
];

// ─────────────────────────────────────────────────────────────
// Yoklama kayıtları (sadece tamamlanmış oturumlar için)
// ─────────────────────────────────────────────────────────────

export type AttendanceRecordData = {
  session_id: string;
  student_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
};

export const ATTENDANCE_RECORDS: AttendanceRecordData[] = [
  // ── sess-u9-0428 ──
  { session_id: 'sess-u9-0428', student_id: 'student-001', status: 'present' },
  { session_id: 'sess-u9-0428', student_id: 'student-002', status: 'present' },
  { session_id: 'sess-u9-0428', student_id: 'student-003', status: 'excused' },
  { session_id: 'sess-u9-0428', student_id: 'student-004', status: 'present' },
  // ── sess-u9-0430 ──
  { session_id: 'sess-u9-0430', student_id: 'student-001', status: 'present' },
  { session_id: 'sess-u9-0430', student_id: 'student-002', status: 'absent' },
  { session_id: 'sess-u9-0430', student_id: 'student-003', status: 'present' },
  { session_id: 'sess-u9-0430', student_id: 'student-004', status: 'present' },
  // ── sess-u9-0505 ──
  { session_id: 'sess-u9-0505', student_id: 'student-001', status: 'present' },
  { session_id: 'sess-u9-0505', student_id: 'student-002', status: 'present' },
  { session_id: 'sess-u9-0505', student_id: 'student-003', status: 'absent' },
  { session_id: 'sess-u9-0505', student_id: 'student-004', status: 'late' },
  // ── sess-u9-0507 ──
  { session_id: 'sess-u9-0507', student_id: 'student-001', status: 'absent' },
  { session_id: 'sess-u9-0507', student_id: 'student-002', status: 'present' },
  { session_id: 'sess-u9-0507', student_id: 'student-003', status: 'present' },
  { session_id: 'sess-u9-0507', student_id: 'student-004', status: 'present' },
  // ── sess-u11-0428 ──
  { session_id: 'sess-u11-0428', student_id: 'student-005', status: 'present' },
  { session_id: 'sess-u11-0428', student_id: 'student-006', status: 'present' },
  { session_id: 'sess-u11-0428', student_id: 'student-007', status: 'absent' },
  // ── sess-u11-0430 ──
  { session_id: 'sess-u11-0430', student_id: 'student-005', status: 'present' },
  { session_id: 'sess-u11-0430', student_id: 'student-006', status: 'absent' },
  { session_id: 'sess-u11-0430', student_id: 'student-007', status: 'present' },
  // ── sess-u11-0505 ──
  { session_id: 'sess-u11-0505', student_id: 'student-005', status: 'absent' },
  { session_id: 'sess-u11-0505', student_id: 'student-006', status: 'present' },
  { session_id: 'sess-u11-0505', student_id: 'student-007', status: 'present' },
  // ── sess-u11-0507 ──
  { session_id: 'sess-u11-0507', student_id: 'student-005', status: 'present' },
  { session_id: 'sess-u11-0507', student_id: 'student-006', status: 'present' },
  { session_id: 'sess-u11-0507', student_id: 'student-007', status: 'present' },
  // ── sess-u13-0426 ──
  { session_id: 'sess-u13-0426', student_id: 'student-008', status: 'present' },
  { session_id: 'sess-u13-0426', student_id: 'student-009', status: 'present' },
  { session_id: 'sess-u13-0426', student_id: 'student-010', status: 'absent' },
  // ── sess-u13-0503 ──
  { session_id: 'sess-u13-0503', student_id: 'student-008', status: 'absent' },
  { session_id: 'sess-u13-0503', student_id: 'student-009', status: 'present' },
  { session_id: 'sess-u13-0503', student_id: 'student-010', status: 'present' },
];

// ─────────────────────────────────────────────────────────────
// Aidat faturaları (Oca–May 2026, 10 öğrenci × 5 ay = 50 fatura)
// ─────────────────────────────────────────────────────────────

export type AidatInvoice = {
  id: string;
  student_id: string;
  period_year: number;
  period_month: number;
  amount: number;
  paid_amount: number;
  status: 'paid' | 'partial' | 'pending';
};

export const AIDAT_INVOICES: AidatInvoice[] = STUDENTS.flatMap((s) =>
  [1, 2, 3, 4, 5].map((month): AidatInvoice => ({
    id: `inv-aidat-${s.id}-${month}`,
    student_id: s.id,
    period_year: 2026,
    period_month: month,
    amount: 2500,
    paid_amount: month <= 3 ? 2500 : month === 4 ? 1250 : 0,
    status: month <= 3 ? 'paid' : month === 4 ? 'partial' : 'pending',
  }))
);

// ─────────────────────────────────────────────────────────────
// Ekipman faturaları (forma + eşofman, öğrenci başına 1 adet)
// ─────────────────────────────────────────────────────────────

export type EquipmentInvoice = {
  id: string;
  student_id: string;
  amount: number;
  paid_amount: number;
  status: 'paid' | 'pending';
  delivered: boolean;
};

export const EQUIPMENT_INVOICES: EquipmentInvoice[] = STUDENTS.map((s, i): EquipmentInvoice => ({
  id: `inv-equip-${s.id}`,
  student_id: s.id,
  amount: 2500,
  paid_amount: i < 5 ? 2500 : 0,
  status: i < 5 ? 'paid' : 'pending',
  delivered: i < 5,
}));

// ─────────────────────────────────────────────────────────────
// Bildirimler (veli başına 3-4 adet)
// ─────────────────────────────────────────────────────────────

export type NotificationData = {
  id: string;
  recipient_profile_id: string;
  title: string;
  body: string;
  created_at: string;
};

export const NOTIFICATIONS: NotificationData[] = [
  // ── Mehmet Yılmaz (p001) — 2 çocuk, U9 ──
  { id: 'notif-001', recipient_profile_id: 'profile-p001', title: 'Aidat Hatırlatması', body: 'Ali Yılmaz için Nisan 2026 aidatı kısmen ödendi. Kalan: 1.250 ₺', created_at: '2026-04-26T09:00:00Z' },
  { id: 'notif-002', recipient_profile_id: 'profile-p001', title: 'Aidat Hatırlatması', body: 'Ali ve Berk için Mayıs 2026 aidatı yaklaşıyor. Toplam: 5.000 ₺', created_at: '2026-04-26T09:01:00Z' },
  { id: 'notif-003', recipient_profile_id: 'profile-p001', title: 'Yoklama Güncellendi', body: 'Berk Yılmaz — U9 Salı antrenmanında devamsız işaretlendi.', created_at: '2026-04-30T19:00:00Z' },
  // ── Fatma Demir (p002) — Can (U9) + Efe (U11) ──
  { id: 'notif-004', recipient_profile_id: 'profile-p002', title: 'Aidat Hatırlatması', body: 'Can Demir için Mayıs 2026 aidatı bekliyor. Tutar: 2.500 ₺', created_at: '2026-04-26T09:02:00Z' },
  { id: 'notif-005', recipient_profile_id: 'profile-p002', title: 'Yoklama Güncellendi', body: 'Can Demir — U9 Perşembe antrenmanında geç işaretlendi.', created_at: '2026-05-07T18:30:00Z' },
  { id: 'notif-006', recipient_profile_id: 'profile-p002', title: 'Yoklama Güncellendi', body: 'Efe Demir — U11 Salı antrenmanında devamsız işaretlendi.', created_at: '2026-05-05T19:00:00Z' },
  // ── Mustafa Arslan (p003) — Furkan (U11) ──
  { id: 'notif-007', recipient_profile_id: 'profile-p003', title: 'Aidat Hatırlatması', body: 'Furkan Arslan için Mayıs 2026 aidatı bekliyor. Tutar: 2.500 ₺', created_at: '2026-04-26T09:03:00Z' },
  // ── Serap Yıldız (p004) — Görkem (U11) + İbrahim (U13) ──
  { id: 'notif-008', recipient_profile_id: 'profile-p004', title: 'Aidat Hatırlatması', body: 'Görkem ve İbrahim için Mayıs aidatları bekliyor. Toplam: 5.000 ₺', created_at: '2026-04-26T09:04:00Z' },
  { id: 'notif-009', recipient_profile_id: 'profile-p004', title: 'Yoklama Güncellendi', body: 'İbrahim Yıldız — U13 Cumartesi antrenmanında katıldı.', created_at: '2026-05-03T12:00:00Z' },
  // ── Hüseyin Doğan (p005) — Hasan (U13) ──
  { id: 'notif-010', recipient_profile_id: 'profile-p005', title: 'Aidat Hatırlatması', body: 'Hasan Doğan için Nisan 2026 aidatı kısmen ödendi. Kalan: 1.250 ₺', created_at: '2026-04-26T09:05:00Z' },
  { id: 'notif-011', recipient_profile_id: 'profile-p005', title: 'Aidat Hatırlatması', body: 'Hasan Doğan için Mayıs 2026 aidatı bekliyor. Tutar: 2.500 ₺', created_at: '2026-04-26T09:06:00Z' },
  // ── Zeynep Şahin (p006) — Deniz (U9) + Jamal (U13) ──
  { id: 'notif-012', recipient_profile_id: 'profile-p006', title: 'Aidat Hatırlatması', body: 'Deniz ve Jamal için Mayıs aidatları bekliyor. Toplam: 5.000 ₺', created_at: '2026-04-26T09:07:00Z' },
  { id: 'notif-013', recipient_profile_id: 'profile-p006', title: 'Yoklama Güncellendi', body: 'Jamal Şahin — U13 26 Nisan antrenmanında devamsız işaretlendi.', created_at: '2026-04-26T12:30:00Z' },
  { id: 'notif-014', recipient_profile_id: 'profile-p006', title: 'Yoklama Güncellendi', body: 'Deniz Şahin — U9 7 Mayıs antrenmanında katıldı.', created_at: '2026-05-07T18:00:00Z' },
];
