-- Veliler kendi çocukları için dekont yükleyip pending payment oluşturabilir
create policy "payments_parent_insert" on payments
  for insert to authenticated
  with check (
    app_current_role() = 'parent'
    and exists (
      select 1 from parent_student ps
      where ps.student_id = payments.student_id
        and ps.parent_profile_id = auth.uid()
    )
  );

-- Receipts storage bucket
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

-- Veliler kendi okluğunun klasörüne yükleyebilir
create policy "receipts_authenticated_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'receipts');

create policy "receipts_authenticated_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts');
