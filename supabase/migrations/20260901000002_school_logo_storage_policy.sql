-- School logo upserts need SELECT as well as INSERT/UPDATE. Restrict every
-- authenticated write/read policy to the administrator's own school folder.

begin;

drop policy if exists "school_logos_admin_select" on storage.objects;
drop policy if exists "school_logos_admin_insert" on storage.objects;
drop policy if exists "school_logos_admin_update" on storage.objects;
drop policy if exists "school_logos_admin_delete" on storage.objects;

create policy "school_logos_admin_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'school-logos'
    and (
      public.app_current_role() = 'super_admin'
      or (
        public.app_current_role() = 'school_admin'
        and (storage.foldername(name))[1] = public.current_school_id()::text
      )
    )
  );

create policy "school_logos_admin_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'school-logos'
    and (
      public.app_current_role() = 'super_admin'
      or (
        public.app_current_role() = 'school_admin'
        and (storage.foldername(name))[1] = public.current_school_id()::text
      )
    )
  );

create policy "school_logos_admin_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'school-logos'
    and (
      public.app_current_role() = 'super_admin'
      or (
        public.app_current_role() = 'school_admin'
        and (storage.foldername(name))[1] = public.current_school_id()::text
      )
    )
  )
  with check (
    bucket_id = 'school-logos'
    and (
      public.app_current_role() = 'super_admin'
      or (
        public.app_current_role() = 'school_admin'
        and (storage.foldername(name))[1] = public.current_school_id()::text
      )
    )
  );

create policy "school_logos_admin_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'school-logos'
    and (
      public.app_current_role() = 'super_admin'
      or (
        public.app_current_role() = 'school_admin'
        and (storage.foldername(name))[1] = public.current_school_id()::text
      )
    )
  );

commit;
