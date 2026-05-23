-- Expo push notification token'ı saklamak için
alter table profiles add column if not exists push_token text;

-- Kullanıcı sadece kendi push_token'ını güncelleyebilir
create policy "profiles_update_own_push_token" on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
