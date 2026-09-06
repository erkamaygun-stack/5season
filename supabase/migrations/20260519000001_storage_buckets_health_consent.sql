-- =====================================================

begin;
-- Storage buckets: health-docs, consent-docs
-- Bu migration daha önce 20260516000001 içinde
-- tanımlandı fakat hosted Supabase'e uygulanmadıysa
-- bu dosyayı Dashboard > SQL Editor'dan çalıştır.
-- =====================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'health-docs', 'health-docs', false,
    5242880,
    array['application/pdf', 'image/jpeg', 'image/png']
  ),
  (
    'consent-docs', 'consent-docs', false,
    5242880,
    array['application/pdf', 'image/jpeg', 'image/png']
  )
on conflict (id) do nothing;

-- health-docs: sadece school_admin / super_admin erişir
drop policy if exists "health_docs_admin_insert" on storage.objects;
create policy "health_docs_admin_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'health-docs'
    and app_current_role() in ('super_admin', 'school_admin')
  );

drop policy if exists "health_docs_admin_select" on storage.objects;
create policy "health_docs_admin_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'health-docs'
    and app_current_role() in ('super_admin', 'school_admin')
  );

drop policy if exists "health_docs_admin_delete" on storage.objects;
create policy "health_docs_admin_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'health-docs'
    and app_current_role() in ('super_admin', 'school_admin')
  );

-- consent-docs: sadece school_admin / super_admin erişir
drop policy if exists "consent_docs_admin_insert" on storage.objects;
create policy "consent_docs_admin_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'consent-docs'
    and app_current_role() in ('super_admin', 'school_admin')
  );

drop policy if exists "consent_docs_admin_select" on storage.objects;
create policy "consent_docs_admin_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'consent-docs'
    and app_current_role() in ('super_admin', 'school_admin')
  );

drop policy if exists "consent_docs_admin_delete" on storage.objects;
create policy "consent_docs_admin_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'consent-docs'
    and app_current_role() in ('super_admin', 'school_admin')
  );

commit;
