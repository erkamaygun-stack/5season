-- =====================================================
-- 5mevsim — Eksik Özellikler
-- student_basic_view · updated_at · salary→expense ·
-- audit trigger · storage bucket'ları
-- =====================================================

-- =====================================================
-- 1. STUDENT_BASIC_VIEW
-- Antrenör ekranları bu view'u kullanır.
-- blood_type, health_doc_url, consent_doc_url, notes
-- görünmez. Satır kısıtlaması students tablosundaki
-- mevcut RLS politikaları tarafından uygulanır.
-- =====================================================
create or replace view student_basic_view as
  select
    id,
    school_id,
    full_name,
    birth_date,
    gender,
    status,
    enrollment_date,
    created_at
  from students;

comment on view student_basic_view is
  'Antrenör ekranlarında kullanılır; hassas alanlar (blood_type, health_doc_url, consent_doc_url, notes) gizlenmiştir';

-- =====================================================
-- 2. UPDATED_AT AUTO-UPDATE TRİGGER
-- Şu an sadece applications tablosunda updated_at var.
-- =====================================================
create or replace function set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger applications_updated_at
  before update on applications
  for each row execute function set_updated_at();

-- =====================================================
-- 3. SALARY → EXPENSE TRİGGER
-- staff_salary_payments'e INSERT olunca otomatik
-- olarak expenses (category='salary') kaydı açar.
-- =====================================================
create or replace function salary_payment_to_expense()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_staff_name text;
begin
  select full_name into v_staff_name from staff where id = new.staff_id;

  insert into expenses (
    school_id,
    category,
    description,
    amount,
    expense_date,
    paid_to
  ) values (
    new.school_id,
    'salary',
    v_staff_name
      || ' — '
      || new.period_year::text
      || '/'
      || lpad(new.period_month::text, 2, '0')
      || ' maaşı',
    new.amount,
    coalesce(new.paid_at::date, current_date),
    v_staff_name
  );

  return new;
end;
$$;

create trigger salary_creates_expense
  after insert on staff_salary_payments
  for each row execute function salary_payment_to_expense();

-- =====================================================
-- 4. AUDIT TRİGGER
-- students, payments, aidat_invoices, staff tablolarında
-- INSERT / UPDATE / DELETE → audit_log kaydı.
-- actor_profile_id: cron ile tetiklenirse NULL kalır.
-- =====================================================
create or replace function write_audit_log()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_school_id  uuid;
  v_entity_id  uuid;
  v_diff       jsonb;
begin
  if tg_op = 'DELETE' then
    v_school_id := (to_jsonb(old) ->> 'school_id')::uuid;
    v_entity_id := (to_jsonb(old) ->> 'id')::uuid;
    v_diff      := jsonb_build_object('old', to_jsonb(old));
    insert into audit_log (school_id, actor_profile_id, action, entity_type, entity_id, diff)
    values (v_school_id, auth.uid(), tg_op, tg_table_name, v_entity_id, v_diff);
    return old;
  elsif tg_op = 'INSERT' then
    v_school_id := (to_jsonb(new) ->> 'school_id')::uuid;
    v_entity_id := (to_jsonb(new) ->> 'id')::uuid;
    v_diff      := jsonb_build_object('new', to_jsonb(new));
  else
    v_school_id := (to_jsonb(new) ->> 'school_id')::uuid;
    v_entity_id := (to_jsonb(new) ->> 'id')::uuid;
    v_diff      := jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new));
  end if;

  insert into audit_log (school_id, actor_profile_id, action, entity_type, entity_id, diff)
  values (v_school_id, auth.uid(), tg_op, tg_table_name, v_entity_id, v_diff);

  return new;
end;
$$;

create trigger audit_students
  after insert or update or delete on students
  for each row execute function write_audit_log();

create trigger audit_payments
  after insert or update or delete on payments
  for each row execute function write_audit_log();

create trigger audit_aidat_invoices
  after insert or update or delete on aidat_invoices
  for each row execute function write_audit_log();

create trigger audit_staff
  after insert or update or delete on staff
  for each row execute function write_audit_log();

-- =====================================================
-- 5. STORAGE BUCKET'LARI
-- Klasör sözleşmesi:
--   health-docs/      {school_id}/{student_id}/{dosya}
--   consent-docs/     {school_id}/{student_id}/{dosya}
--   receipts/         {parent_user_id}/{dosya}
--   expense-receipts/ {school_id}/{dosya}
--   school-logos/     {school_id}/{dosya}
-- =====================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'health-docs', 'health-docs', false,
    5242880,  -- 5 MB
    array['application/pdf', 'image/jpeg', 'image/png']
  ),
  (
    'consent-docs', 'consent-docs', false,
    5242880,
    array['application/pdf', 'image/jpeg', 'image/png']
  ),
  (
    'receipts', 'receipts', false,
    10485760,  -- 10 MB
    array['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'application/pdf']
  ),
  (
    'expense-receipts', 'expense-receipts', false,
    10485760,
    array['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'application/pdf']
  ),
  (
    'school-logos', 'school-logos', true,
    2097152,   -- 2 MB
    array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
  )
on conflict (id) do nothing;

-- ---- health-docs (sadece school_admin / super_admin) ----
create policy "health_docs_admin_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'health-docs'
    and app_current_role() in ('super_admin', 'school_admin')
  );

create policy "health_docs_admin_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'health-docs'
    and app_current_role() in ('super_admin', 'school_admin')
  );

create policy "health_docs_admin_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'health-docs'
    and app_current_role() in ('super_admin', 'school_admin')
  );

-- ---- consent-docs (sadece school_admin / super_admin) ----
create policy "consent_docs_admin_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'consent-docs'
    and app_current_role() in ('super_admin', 'school_admin')
  );

create policy "consent_docs_admin_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'consent-docs'
    and app_current_role() in ('super_admin', 'school_admin')
  );

create policy "consent_docs_admin_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'consent-docs'
    and app_current_role() in ('super_admin', 'school_admin')
  );

-- ---- receipts (veli yükler kendi klasörüne, admin okur) ----
create policy "receipts_parent_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and app_current_role() = 'parent'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "receipts_parent_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and app_current_role() = 'parent'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "receipts_admin_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and app_current_role() in ('super_admin', 'school_admin')
  );

create policy "receipts_admin_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'receipts'
    and app_current_role() in ('super_admin', 'school_admin')
  );

-- ---- expense-receipts (sadece school_admin / super_admin) ----
create policy "expense_receipts_admin_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'expense-receipts'
    and app_current_role() in ('super_admin', 'school_admin')
  );

create policy "expense_receipts_admin_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'expense-receipts'
    and app_current_role() in ('super_admin', 'school_admin')
  );

create policy "expense_receipts_admin_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'expense-receipts'
    and app_current_role() in ('super_admin', 'school_admin')
  );

-- ---- school-logos (public bucket; admin yazar, herkes okur) ----
-- SELECT policy gerekmez: bucket public = true ise Supabase anonim erişime izin verir.
create policy "school_logos_admin_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'school-logos'
    and app_current_role() in ('super_admin', 'school_admin')
  );

create policy "school_logos_admin_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'school-logos'
    and app_current_role() in ('super_admin', 'school_admin')
  );

create policy "school_logos_admin_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'school-logos'
    and app_current_role() in ('super_admin', 'school_admin')
  );
