-- school_admin kendi okulunu güncelleyebilir
create policy "schools_admin_update" on schools
  for update to authenticated
  using (
    app_current_role() = 'school_admin'
    and id = current_school_id()
  )
  with check (
    app_current_role() = 'school_admin'
    and id = current_school_id()
  );
