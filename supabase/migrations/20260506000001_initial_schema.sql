-- 1. Schools & Profiles (Zaten vardı ama temizleyip tam halini yazalım)
create table if not exists schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  logo_url text,
  contact_phone text,
  address text,
  default_aidat_amount numeric(10,2) default 2500,
  default_uniform_amount numeric(10,2) default 2500,
  subscription_status text default 'trial' check (subscription_status in ('trial','active','suspended','cancelled')),
  subscription_starts_at timestamptz,
  subscription_ends_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid references schools(id) on delete cascade,
  role text not null check (role in ('super_admin','school_admin','coach','parent')),
  full_name text not null,
  phone text not null,
  email text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade not null,
  full_name text not null,
  birth_date date,
  gender text check (gender in ('M','F')),
  status text default 'active' check (status in ('active','passive','trial','left')),
  enrollment_date date default current_date,
  created_at timestamptz default now()
);

-- 2. Staff & Groups (Eksik olanlar)
create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade not null,
  profile_id uuid references profiles(id),
  full_name text not null,
  staff_type text not null check (staff_type in ('coach','assistant','admin','other')),
  monthly_salary numeric(10,2) default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade not null,
  name text not null,
  capacity int default 20,
  primary_coach_id uuid references staff(id),
  monthly_fee numeric(10,2) default 2500,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 3. Invoices & Payments (Finansal tablolar)
create table if not exists aidat_invoices (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade not null,
  student_id uuid references students(id) on delete cascade not null,
  period_year int not null,
  period_month int not null,
  amount numeric(10,2) not null,
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade not null,
  student_id uuid references students(id) on delete cascade not null,
  invoice_type text not null,
  invoice_id uuid not null,
  amount numeric(10,2) not null,
  payment_method text not null,
  payment_date date default current_date,
  created_at timestamptz default now()
);

-- NOT: Bunlar MVP için kritik olanlar. Diğer 21 tabloya tamamlamak için db push sonrası devam edeceğiz.
