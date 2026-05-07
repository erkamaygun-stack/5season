// Mock veri — Supabase bağlantısı kurulana kadar kullanılır

export const MOCK_SCHOOL_NAME = '5 Mevsim Gençlik ve Spor Kulübü';

export const MOCK_CHILDREN = [
  {
    id: 'student-1',
    full_name: 'Ahmet Yılmaz',
    group: {
      id: 'group-1',
      name: 'U10 Grubu',
      group_schedule_slots: [
        { day_of_week: 1, start_time: '10:00:00' },
        { day_of_week: 3, start_time: '10:00:00' },
        { day_of_week: 5, start_time: '10:00:00' },
      ],
    },
    totalDebt: 2250,
  },
  {
    id: 'student-2',
    full_name: 'Zeynep Yılmaz',
    group: {
      id: 'group-2',
      name: 'U8 Grubu',
      group_schedule_slots: [
        { day_of_week: 2, start_time: '16:00:00' },
        { day_of_week: 4, start_time: '16:00:00' },
      ],
    },
    totalDebt: 0,
  },
];

export const MOCK_TODAY_GROUPS = [
  {
    id: 'session-1',
    groupId: 'group-1',
    groupName: 'U10 Grubu',
    time: '10:00',
    studentCount: 14,
  },
  {
    id: 'session-2',
    groupId: 'group-2',
    groupName: 'U12 Grubu',
    time: '14:00',
    studentCount: 12,
  },
  {
    id: 'session-3',
    groupId: 'group-3',
    groupName: 'U14 Grubu',
    time: '16:30',
    studentCount: 10,
  },
];

export const MOCK_STUDENTS = [
  { id: 's1', fullName: 'Ahmet Yılmaz', status: null as AttendanceStatus },
  { id: 's2', fullName: 'Mehmet Kaya', status: null as AttendanceStatus },
  { id: 's3', fullName: 'Ali Demir', status: null as AttendanceStatus },
  { id: 's4', fullName: 'Emre Çelik', status: null as AttendanceStatus },
  { id: 's5', fullName: 'Can Şahin', status: null as AttendanceStatus },
  { id: 's6', fullName: 'Burak Arslan', status: null as AttendanceStatus },
  { id: 's7', fullName: 'Kerem Doğan', status: null as AttendanceStatus },
  { id: 's8', fullName: 'Furkan Aydın', status: null as AttendanceStatus },
  { id: 's9', fullName: 'Onur Özdemir', status: null as AttendanceStatus },
  { id: 's10', fullName: 'Berk Yıldız', status: null as AttendanceStatus },
  { id: 's11', fullName: 'Serhan Güneş', status: null as AttendanceStatus },
  { id: 's12', fullName: 'Tuna Kılıç', status: null as AttendanceStatus },
  { id: 's13', fullName: 'Ege Koç', status: null as AttendanceStatus },
  { id: 's14', fullName: 'Mert Polat', status: null as AttendanceStatus },
];

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | null;

export const MOCK_PAST_SESSIONS = [
  {
    id: 'ps1',
    date: '2026-05-06',
    groupName: 'U10 Grubu',
    presentCount: 12,
    absentCount: 2,
    students: [
      { fullName: 'Ahmet Yılmaz', status: 'present' as AttendanceStatus },
      { fullName: 'Mehmet Kaya', status: 'absent' as AttendanceStatus },
      { fullName: 'Ali Demir', status: 'present' as AttendanceStatus },
      { fullName: 'Emre Çelik', status: 'late' as AttendanceStatus },
    ],
  },
  {
    id: 'ps2',
    date: '2026-05-05',
    groupName: 'U12 Grubu',
    presentCount: 10,
    absentCount: 2,
    students: [],
  },
  {
    id: 'ps3',
    date: '2026-05-03',
    groupName: 'U10 Grubu',
    presentCount: 13,
    absentCount: 1,
    students: [],
  },
  {
    id: 'ps4',
    date: '2026-05-01',
    groupName: 'U14 Grubu',
    presentCount: 9,
    absentCount: 1,
    students: [],
  },
];

export const MOCK_CHILD_DETAIL = {
  id: 'student-1',
  fullName: 'Ahmet Yılmaz',
  group: {
    id: 'group-1',
    name: 'U10 Grubu',
    slots: [
      { day_of_week: 1, start_time: '10:00' },
      { day_of_week: 3, start_time: '10:00' },
      { day_of_week: 5, start_time: '10:00' },
    ],
  },
  attendance: [
    { date: '2026-05-06', status: 'present' as AttendanceStatus },
    { date: '2026-05-03', status: 'present' as AttendanceStatus },
    { date: '2026-05-01', status: 'absent' as AttendanceStatus },
    { date: '2026-04-29', status: 'present' as AttendanceStatus },
    { date: '2026-04-26', status: 'late' as AttendanceStatus },
    { date: '2026-04-24', status: 'present' as AttendanceStatus },
    { date: '2026-04-22', status: 'excused' as AttendanceStatus },
    { date: '2026-04-19', status: 'present' as AttendanceStatus },
  ],
  invoices: [
    { id: 'inv1', month: 'Mayıs 2026', amount: 1500, paidAmount: 0, status: 'pending' },
    { id: 'inv2', month: 'Nisan 2026', amount: 1500, paidAmount: 750, status: 'pending' },
    { id: 'inv3', month: 'Mart 2026', amount: 1500, paidAmount: 1500, status: 'paid' },
  ],
};

export const MOCK_NOTIFICATIONS = [
  {
    id: 'n1',
    title: 'Aidat Hatırlatması',
    body: 'Mayıs ayı aidatınız henüz ödenmemiş.',
    createdAt: '2026-05-05T09:00:00',
  },
  {
    id: 'n2',
    title: 'Antrenman İptali',
    body: 'Salı 10:00 antrenmanı hava koşulları nedeniyle iptal edildi.',
    createdAt: '2026-05-04T16:30:00',
  },
  {
    id: 'n3',
    title: 'Yoklama Güncellendi',
    body: 'Ahmet Yılmaz — 3 Mayıs antrenmanına katıldı.',
    createdAt: '2026-05-03T11:00:00',
  },
];
