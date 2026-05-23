-- =====================================================
-- Mobile Login: Phone Check RPC
-- Mobil uygulama login ekranında telefon doğrulaması için.
-- Kimlik doğrulama gerektirmeden (anon) çalışır.
-- DEV/PROD: Bu fonksiyon sadece var/yok + email döner; şifre döndürmez.
-- =====================================================

-- check_mobile_phone: Verilen telefon numarasının sistemde kayıtlı
-- coach/parent profiline ait olup olmadığını kontrol eder.
-- Supabase Auth'da signInWithPassword için gerekli email'i döner.
create or replace function check_mobile_phone(p_phone text)
returns json
language plpgsql
security definer
stable
as $$
declare
  v_email text;
  v_found boolean := false;
begin
  select p.email, true
  into v_email, v_found
  from profiles p
  where p.phone = p_phone
    and p.role in ('coach', 'parent')
    and p.is_active = true
  limit 1;

  if v_found and v_email is not null then
    return json_build_object('exists', true, 'email', v_email);
  elsif v_found then
    -- Profil var ama email eksik — kurulum tamamlanmamış
    return json_build_object('exists', false, 'email', null, 'setup_incomplete', true);
  else
    return json_build_object('exists', false, 'email', null);
  end if;
end;
$$;

-- Hem anonim hem de authenticated kullanıcılar çağırabilir
grant execute on function check_mobile_phone(text) to anon;
grant execute on function check_mobile_phone(text) to authenticated;
