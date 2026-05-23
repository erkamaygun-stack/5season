-- =====================================================
-- 5season Seed Data (Sadece Development!)
-- Bu dosyayı production'a UYGULAMA.
-- =====================================================

-- 1) Test Okul
insert into schools (id, name, slug, contact_phone, address, default_aidat_amount, default_uniform_amount)
values (
  '11111111-1111-1111-1111-111111111111',
  'Kapaklı Site Spor',
  'kapakli',
  '5550001122',
  'Kapaklı, Tekirdağ',
  2500,
  2500
)
on conflict (id) do nothing;

-- 2) Antrenörler (profile yok, ek personel olarak da olabilir)
insert into staff (id, school_id, full_name, staff_type, monthly_salary)
values
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111111', 'Antrenör 1', 'coach', 20000),
  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111111', 'Antrenör 2', 'coach', 20000),
  ('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111111', 'Antrenör 3', 'coach', 20000),
  ('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111111', 'Antrenör 4', 'coach', 20000),
  ('22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111111', 'Antrenör 5', 'coach', 20000),
  ('22222222-2222-2222-2222-222222222299', '11111111-1111-1111-1111-111111111111', 'Halısaha Görevlisi', 'other', 15000)
on conflict (id) do nothing;

-- 3) Örnek Gruplar
insert into groups (id, school_id, name, age_min, age_max, capacity, primary_coach_id, monthly_fee)
values
  ('33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111111', 'U9 Salı-Perşembe 17:00', 7, 9, 16, '22222222-2222-2222-2222-222222222201', 2500),
  ('33333333-3333-3333-3333-333333333302', '11111111-1111-1111-1111-111111111111', 'U11 Salı-Perşembe 18:00', 9, 11, 18, '22222222-2222-2222-2222-222222222202', 2500),
  ('33333333-3333-3333-3333-333333333303', '11111111-1111-1111-1111-111111111111', 'U13 Cumartesi 10:00', 11, 13, 20, '22222222-2222-2222-2222-222222222203', 2500)
on conflict (id) do nothing;

-- 4) Haftalık program slotları
-- 0=Pazar, 1=Pzt, 2=Salı, 3=Çar, 4=Per, 5=Cuma, 6=Ctesi
insert into group_schedule_slots (group_id, day_of_week, start_time, end_time)
values
  ('33333333-3333-3333-3333-333333333301', 2, '17:00', '18:00'),
  ('33333333-3333-3333-3333-333333333301', 4, '17:00', '18:00'),
  ('33333333-3333-3333-3333-333333333302', 2, '18:00', '19:00'),
  ('33333333-3333-3333-3333-333333333302', 4, '18:00', '19:00'),
  ('33333333-3333-3333-3333-333333333303', 6, '10:00', '11:30');

-- 5) Mekan kirası gideri örneği
insert into expenses (school_id, category, description, amount, paid_to)
values (
  '11111111-1111-1111-1111-111111111111',
  'rent',
  'Mayıs 2026 mekan kirası',
  35000,
  'Mülk Sahibi'
);

-- 6) Bildirim şablonu
insert into notification_templates (school_id, code, channel, body_template)
values (
  '11111111-1111-1111-1111-111111111111',
  'aidat_reminder_5d',
  'whatsapp',
  'Sayın veli, {{student_name}} için {{period}} ayı aidatına 5 gün kaldı. Tutar: {{amount}} TL.'
)
on conflict (school_id, code, channel) do nothing;

-- =====================================================
-- ÖĞRENCİLER İÇİN NOT:
-- Öğrencileri eklemeden önce bir veli profile'ı oluşturmalısın.
-- Önce Auth Dashboard'tan veli kullanıcısı yarat, sonra:
--
-- insert into profiles (id, school_id, role, full_name, phone)
-- values ('VELI_AUTH_USER_ID', '11111111-1111-1111-1111-111111111111', 'parent', 'Mehmet Yılmaz', '5551234567');
--
-- insert into students (id, school_id, full_name, birth_date)
-- values ('44444444-4444-4444-4444-444444444401', '11111111-1111-1111-1111-111111111111', 'Ali Yılmaz', '2015-03-12');
-- (trigger otomatik aidat + forma faturası açar)
--
-- insert into parent_student (parent_profile_id, student_id)
-- values ('VELI_AUTH_USER_ID', '44444444-4444-4444-4444-444444444401');
--
-- insert into student_groups (student_id, group_id)
-- values ('44444444-4444-4444-4444-444444444401', '33333333-3333-3333-3333-333333333301');
-- =====================================================
