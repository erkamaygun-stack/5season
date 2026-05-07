-- Temel Yardımcı Fonksiyonlar
create or replace function public.current_school_id()
returns uuid as $$
  select school_id from public.profiles where id = auth.uid();
$$ language sql stable;
