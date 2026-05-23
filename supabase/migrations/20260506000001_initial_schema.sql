-- =====================================================
-- 5season Initial Schema
-- Multi-tenant halısaha yönetim platformu
-- =====================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =====================================================
-- SCHOOLS (Tenant)
-- =====================================================
create table schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  logo_url text,
  contact_phone text,
  address text,
  default_aidat_amount numeric(10,2) default 2500,
  default_uniform_amount numeric(10,2) default 2500,
  subscription_status text default 'trial'
    check (subscription_status in ('trial','active','suspended','cancelled')),
  subscription_starts_at timestamptz,
  subscription_ends_at timestamptz,
  created_at timestamptz default now()
);
comment on table schools is 'Multi-tenant: her halısaha okulu bir satır';

-- =====================================================
-- PROFILES (auth.users 1-1)
-- =====================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid references schools(id) on delete cascade,
  role text not null
    check (role in ('super_admin','school_admin','coach','parent')),
  full_name text not null,
  phone text not null,
  email text,
  is_active boolean default true,
  created_at timestamptz default now()
);
create index profiles_school_idx on profiles(school_id);
create index profiles_phone_idx on profiles(phone);

-- =====================================================
-- STUDENTS
-- =====================================================
create table students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade not null,
  full_name text not null,
  birth_date date,
  gender text check (gender in ('M','F')),
  blood_type text,
  notes text,
  enrollment_date date default current_date,
  status text default 'active'
    check (status in ('active','passive','trial','left')),
  health_doc_url text,
  consent_doc_url text,
  has_received_uniform boolean default false,
  uniform_received_at date,
  created_at timestamptz default now()
);
create index students_school_idx on students(school_id);
create index students_school_status_idx on students(school_id, status);

create table parent_student (
  parent_profile_id uuid references profiles(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  relation text default 'parent',
  is_primary boolean default true,
  created_at timestamptz default now(),
  primary key (parent_profile_id, student_id)
);
create index parent_student_student_idx on parent_student(student_id);

-- =====================================================
-- STAFF
-- =====================================================
create table staff (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade not null,
  profile_id uuid references profiles(id),
  full_name text not null,
  staff_type text not null
    check (staff_type in ('coach','assistant','admin','other')),
  monthly_salary numeric(10,2) default 0,
  hire_date date default current_date,
  is_active boolean default true,
  notes text,
  created_at timestamptz default now()
);
create index staff_school_active_idx on staff(school_id, is_active);

create table staff_salary_payments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade not null,
  staff_id uuid references staff(id) on delete cascade not null,
  period_year int not null,
  period_month int not null check (period_month between 1 and 12),
  amount numeric(10,2) not null,
  paid_at timestamptz default now(),
  payment_method text check (payment_method in ('cash','transfer','other')),
  notes text,
  unique(staff_id, period_year, period_month)
);

-- =====================================================
-- GROUPS
-- =====================================================
create table groups (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade not null,
  name text not null,
  age_min int,
  age_max int,
  capacity int default 20,
  primary_coach_id uuid references staff(id),
  monthly_fee numeric(10,2) default 2500,
  is_active boolean default true,
  created_at timestamptz default now()
);
create index groups_school_active_idx on groups(school_id, is_active);

create table group_schedule_slots (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade not null,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  created_at timestamptz default now()
);
create index slots_group_idx on group_schedule_slots(group_id);

create table student_groups (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade not null,
  group_id uuid references groups(id) on delete cascade not null,
  joined_at date default current_date,
  left_at date,
  is_active boolean default true
);
create unique index sg_active_idx on student_groups(student_id, group_id) where is_active;

-- =====================================================
-- ATTENDANCE
-- =====================================================
create table attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade not null,
  group_id uuid references groups(id) on delete cascade not null,
  session_date date not null,
  start_time time not null,
  end_time time not null,
  status text default 'scheduled'
    check (status in ('scheduled','completed','cancelled')),
  cancellation_reason text,
  cancelled_by uuid references profiles(id),
  cancelled_at timestamptz,
  taken_by uuid references profiles(id),
  taken_at timestamptz,
  notes text,
  unique(group_id, session_date, start_time)
);
create index sessions_school_date_idx on attendance_sessions(school_id, session_date);

create table attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references attendance_sessions(id) on delete cascade not null,
  student_id uuid references students(id) on delete cascade not null,
  status text not null
    check (status in ('present','absent','excused','late')),
  recorded_at timestamptz default now(),
  unique(session_id, student_id)
);

create table leave_requests (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade not null,
  student_id uuid references students(id) on delete cascade not null,
  parent_profile_id uuid references profiles(id),
  session_date date not null,
  group_id uuid references groups(id),
  reason text,
  status text default 'submitted'
    check (status in ('submitted','seen','applied')),
  created_at timestamptz default now()
);
create index leave_school_date_idx on leave_requests(school_id, session_date);

-- =====================================================
-- AIDAT & PAYMENTS
-- =====================================================
create table aidat_invoices (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade not null,
  student_id uuid references students(id) on delete cascade not null,
  period_year int not null,
  period_month int not null check (period_month between 1 and 12),
  amount numeric(10,2) not null,
  is_prorated boolean default false,
  due_date date not null,
  paid_amount numeric(10,2) default 0,
  status text default 'pending'
    check (status in ('pending','partial','paid','waived')),
  notes text,
  created_at timestamptz default now(),
  unique(student_id, period_year, period_month)
);
create index aidat_school_status_idx on aidat_invoices(school_id, status);
create index aidat_period_idx on aidat_invoices(student_id, period_year, period_month);

create table equipment_invoices (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade not null,
  student_id uuid references students(id) on delete cascade not null,
  description text default 'Forma + Eşofman',
  amount numeric(10,2) not null,
  paid_amount numeric(10,2) default 0,
  status text default 'pending'
    check (status in ('pending','partial','paid','waived')),
  delivered boolean default false,
  delivered_at date,
  created_at timestamptz default now()
);
create index equipment_school_status_idx on equipment_invoices(school_id, status);

create table payments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade not null,
  student_id uuid references students(id) on delete cascade not null,
  invoice_type text not null check (invoice_type in ('aidat','equipment')),
  invoice_id uuid not null,
  amount numeric(10,2) not null,
  payment_method text not null
    check (payment_method in ('cash','transfer','card','other')),
  payment_date date default current_date,
  receipt_url text,
  received_by uuid references profiles(id),
  notes text,
  created_at timestamptz default now()
);
create index payments_school_date_idx on payments(school_id, payment_date);
create index payments_invoice_idx on payments(invoice_type, invoice_id);

-- =====================================================
-- APPLICATIONS (CRM)
-- =====================================================
create table applications (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade not null,
  applicant_full_name text not null,
  birth_date date,
  parent_full_name text not null,
  parent_phone text not null,
  source text,
  status text not null default 'new'
    check (status in ('new','contacted','trial_scheduled','trialed','enrolled','rejected','no_show')),
  trial_session_date date,
  trial_group_id uuid references groups(id),
  notes text,
  enrolled_student_id uuid references students(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index apps_school_status_idx on applications(school_id, status);

create table application_status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references applications(id) on delete cascade,
  from_status text,
  to_status text,
  note text,
  changed_by uuid references profiles(id),
  changed_at timestamptz default now()
);

-- =====================================================
-- EXPENSES
-- =====================================================
create table expenses (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade not null,
  category text not null
    check (category in ('rent','utility','equipment','salary','tax','other')),
  description text,
  amount numeric(10,2) not null,
  expense_date date default current_date,
  paid_to text,
  receipt_url text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);
create index expenses_school_date_idx on expenses(school_id, expense_date);

-- =====================================================
-- NOTIFICATIONS
-- =====================================================
create table notification_templates (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade,
  code text not null,
  channel text not null check (channel in ('whatsapp','sms','push','in_app')),
  body_template text not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  unique(school_id, code, channel)
);

create table notification_log (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade not null,
  recipient_profile_id uuid references profiles(id),
  recipient_phone text,
  channel text not null,
  template_code text,
  body_rendered text,
  status text default 'queued'
    check (status in ('queued','sent','delivered','failed')),
  error_message text,
  related_entity_type text,
  related_entity_id uuid,
  sent_at timestamptz,
  created_at timestamptz default now()
);
create index notif_log_school_idx on notification_log(school_id, created_at desc);

-- =====================================================
-- AUDIT LOG
-- =====================================================
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  actor_profile_id uuid references profiles(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  diff jsonb,
  created_at timestamptz default now()
);
create index audit_school_idx on audit_log(school_id, created_at desc);
