-- 5mevsim isolated pilot seed.
-- Synthetic data only. Never run against production.
-- Outbound communication stays quarantined and disabled.

insert into public.schools (
  id, name, slug, contact_phone, address,
  default_aidat_amount, default_uniform_amount,
  subscription_status, communications_status
) values (
  '11111111-1111-1111-1111-111111111111',
  '5mevsim Pilot Okulu',
  'pilot-okulu',
  '5550001122',
  'Sentetik test adresi',
  2500,
  2500,
  'trial',
  'quarantined'
)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  communications_status = 'quarantined';

insert into public.staff (
  id, school_id, full_name, staff_type, monthly_salary,
  invitation_email, invitation_status, is_active
) values
  (
    '22222222-2222-2222-2222-222222222201',
    '11111111-1111-1111-1111-111111111111',
    'Pilot Antrenör',
    'coach',
    20000,
    'pilot-antrenor@example.invalid',
    'not_invited',
    true
  ),
  (
    '22222222-2222-2222-2222-222222222202',
    '11111111-1111-1111-1111-111111111111',
    'Pilot Yardımcı',
    'assistant',
    15000,
    null,
    'not_applicable',
    true
  )
on conflict (id) do update set
  full_name = excluded.full_name,
  staff_type = excluded.staff_type,
  monthly_salary = excluded.monthly_salary,
  invitation_email = excluded.invitation_email,
  invitation_status = excluded.invitation_status,
  is_active = excluded.is_active;

insert into public.groups (
  id, school_id, name, category, age_min, age_max,
  capacity, primary_coach_id, monthly_fee, is_active
) values
  (
    '33333333-3333-3333-3333-333333333301',
    '11111111-1111-1111-1111-111111111111',
    'U10 Pilot Grubu',
    'spor_okulu',
    8, 10, 16,
    '22222222-2222-2222-2222-222222222201',
    2500,
    true
  ),
  (
    '33333333-3333-3333-3333-333333333302',
    '11111111-1111-1111-1111-111111111111',
    'U13 Altyapı',
    'altyapi',
    11, 13, 18,
    '22222222-2222-2222-2222-222222222201',
    3000,
    true
  )
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  primary_coach_id = excluded.primary_coach_id,
  monthly_fee = excluded.monthly_fee,
  is_active = true;

insert into public.group_schedule_slots (
  id, group_id, day_of_week, start_time, end_time
) values
  (
    '34333333-3333-3333-3333-333333333301',
    '33333333-3333-3333-3333-333333333301',
    extract(dow from current_date)::integer,
    '17:00',
    '18:00'
  ),
  (
    '34333333-3333-3333-3333-333333333302',
    '33333333-3333-3333-3333-333333333302',
    extract(dow from current_date + 1)::integer,
    '18:00',
    '19:30'
  )
on conflict (id) do update set
  day_of_week = excluded.day_of_week,
  start_time = excluded.start_time,
  end_time = excluded.end_time;

-- These inserts exercise the automatic first-month aidat and equipment triggers.
insert into public.students (
  id, school_id, full_name, birth_date, gender,
  enrollment_date, status, notes
) values
  (
    '44444444-4444-4444-4444-444444444401',
    '11111111-1111-1111-1111-111111111111',
    'Pilot Öğrenci Bir',
    '2017-04-12',
    'M',
    current_date,
    'active',
    'Tek öğrenci dekont eşleme senaryosu'
  ),
  (
    '44444444-4444-4444-4444-444444444402',
    '11111111-1111-1111-1111-111111111111',
    'Pilot Öğrenci İki',
    '2016-09-03',
    'F',
    current_date,
    'active',
    'Çoklu öğrenci ve fatura seçimi senaryosu'
  ),
  (
    '44444444-4444-4444-4444-444444444403',
    '11111111-1111-1111-1111-111111111111',
    'Pilot Deneme Öğrencisi',
    '2014-01-20',
    'M',
    current_date,
    'trial',
    'Deneme statüsü senaryosu'
  )
on conflict (id) do update set
  full_name = excluded.full_name,
  birth_date = excluded.birth_date,
  gender = excluded.gender,
  status = excluded.status,
  notes = excluded.notes;

insert into public.guardians (
  id, school_id, full_name, phone_e164, whatsapp_wa_id, status
) values
  (
    '55555555-5555-5555-5555-555555555501',
    '11111111-1111-1111-1111-111111111111',
    'Pilot Veli Bir',
    '+905550001101',
    '905550001101',
    'active'
  ),
  (
    '55555555-5555-5555-5555-555555555502',
    '11111111-1111-1111-1111-111111111111',
    'Pilot Veli İki',
    '+905550001102',
    '905550001102',
    'active'
  )
on conflict (id) do update set
  full_name = excluded.full_name,
  phone_e164 = excluded.phone_e164,
  whatsapp_wa_id = excluded.whatsapp_wa_id,
  status = excluded.status;

insert into public.guardian_students (
  guardian_id, student_id, relation, is_primary
) values
  (
    '55555555-5555-5555-5555-555555555501',
    '44444444-4444-4444-4444-444444444401',
    'parent',
    true
  ),
  (
    '55555555-5555-5555-5555-555555555502',
    '44444444-4444-4444-4444-444444444402',
    'parent',
    true
  ),
  (
    '55555555-5555-5555-5555-555555555502',
    '44444444-4444-4444-4444-444444444403',
    'parent',
    true
  )
on conflict (guardian_id, student_id) do update set
  relation = excluded.relation,
  is_primary = excluded.is_primary;

insert into public.student_groups (
  id, student_id, group_id, joined_at, is_active
) values
  (
    '66666666-6666-6666-6666-666666666601',
    '44444444-4444-4444-4444-444444444401',
    '33333333-3333-3333-3333-333333333301',
    current_date,
    true
  ),
  (
    '66666666-6666-6666-6666-666666666602',
    '44444444-4444-4444-4444-444444444402',
    '33333333-3333-3333-3333-333333333301',
    current_date,
    true
  ),
  (
    '66666666-6666-6666-6666-666666666603',
    '44444444-4444-4444-4444-444444444403',
    '33333333-3333-3333-3333-333333333302',
    current_date,
    true
  )
on conflict (id) do update set
  group_id = excluded.group_id,
  joined_at = excluded.joined_at,
  left_at = null,
  is_active = true;

insert into public.attendance_sessions (
  id, school_id, group_id, session_date, start_time, end_time, status
) values (
  '77777777-7777-7777-7777-777777777701',
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333301',
  current_date,
  '17:00',
  '18:00',
  'scheduled'
)
on conflict (group_id, session_date, start_time) do update set
  end_time = excluded.end_time,
  status = 'scheduled',
  cancellation_reason = null,
  cancelled_by = null,
  cancelled_at = null,
  taken_by = null,
  taken_at = null;

insert into public.applications (
  id, school_id, applicant_full_name, birth_date,
  parent_full_name, parent_phone, source, status, notes
) values
  (
    '88888888-8888-8888-8888-888888888801',
    '11111111-1111-1111-1111-111111111111',
    'Pilot Başvuru Yeni',
    '2018-06-15',
    'Pilot Başvuru Velisi',
    '5550002201',
    'Sentetik test',
    'new',
    'Kanban durum değişimi senaryosu'
  ),
  (
    '88888888-8888-8888-8888-888888888802',
    '11111111-1111-1111-1111-111111111111',
    'Pilot Başvuru Deneme',
    '2015-11-08',
    'Pilot İkinci Veli',
    '5550002202',
    'Sentetik test',
    'trial_scheduled',
    'Deneme planlama senaryosu'
  )
on conflict (id) do update set
  applicant_full_name = excluded.applicant_full_name,
  parent_full_name = excluded.parent_full_name,
  parent_phone = excluded.parent_phone,
  status = excluded.status,
  notes = excluded.notes;

insert into public.expenses (
  id, school_id, category, description, amount, paid_to
) values (
  '99999999-9999-9999-9999-999999999901',
  '11111111-1111-1111-1111-111111111111',
  'rent',
  'Sentetik pilot saha kirası',
  35000,
  'Pilot Tedarikçi'
)
on conflict (id) do update set
  description = excluded.description,
  amount = excluded.amount,
  paid_to = excluded.paid_to;

insert into public.notification_templates (
  id, school_id, code, channel, body_template
) values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  '11111111-1111-1111-1111-111111111111',
  'aidat_reminder_5d',
  'whatsapp',
  'Sayın veli, {{student_name}} için {{period}} ayı aidatına 5 gün kaldı. Tutar: {{amount}} TL.'
)
on conflict (school_id, code, channel) do update set
  body_template = excluded.body_template;

-- This fake channel is intentionally disabled. Replace it only in isolated staging.
insert into public.whatsapp_channels (
  id, school_id, phone_number_id, waba_account_id,
  display_phone, status, template_config
) values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  '11111111-1111-1111-1111-111111111111',
  'synthetic-phone-number-id',
  'synthetic-waba-id',
  '+905550009999',
  'disabled',
  jsonb_build_object(
    'language_code', 'tr',
    'aidat_reminder', 'aidat_hatirlatma_v1',
    'receipt_approved', 'dekont_onaylandi_v1',
    'receipt_rejected', 'dekont_reddedildi_v1'
  )
)
on conflict (id) do update set
  status = 'disabled',
  template_config = excluded.template_config;

-- Create school-admin and coach users through Supabase Auth after seeding, then:
--
-- insert into public.profiles (id, school_id, role, full_name, email)
-- values
--   ('<ADMIN_AUTH_USER_ID>', '11111111-1111-1111-1111-111111111111', 'school_admin', 'Pilot Yönetici', '<ADMIN_EMAIL>'),
--   ('<COACH_AUTH_USER_ID>', '11111111-1111-1111-1111-111111111111', 'coach', 'Pilot Antrenör', '<COACH_EMAIL>');
--
-- update public.staff
-- set profile_id = '<COACH_AUTH_USER_ID>',
--     invitation_email = '<COACH_EMAIL>',
--     invitation_status = 'accepted',
--     invitation_accepted_at = now()
-- where id = '22222222-2222-2222-2222-222222222201';
--
-- Guardians never receive Auth accounts in V1.
