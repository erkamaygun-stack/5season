-- =====================================================
-- 5mevsim — Toplu Oturum Üretimi
--
-- generate_sessions_for_range(start_date, end_date)
-- Admin panelden çağrılır; verilen tarih aralığı için
-- group_schedule_slots'tan attendance_sessions üretir.
--
-- Maksimum aralık 365 gün ile sınırlıdır.
-- ON CONFLICT DO NOTHING → tekrar çalıştırılabilir.
-- =====================================================

create or replace function generate_sessions_for_range(
  p_start_date date,
  p_end_date   date
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  total_count int := 0;
  batch_count int;
  current_day date;
  current_dow int;
begin
  -- Güvenlik: en fazla 365 günlük aralığa izin ver
  if p_end_date - p_start_date > 365 then
    raise exception 'Aralık 365 günden fazla olamaz';
  end if;

  if p_end_date < p_start_date then
    raise exception 'Bitiş tarihi başlangıç tarihinden önce olamaz';
  end if;

  current_day := p_start_date;

  while current_day <= p_end_date loop
    current_dow := extract(dow from current_day)::int;

    insert into attendance_sessions (
      school_id, group_id, session_date, start_time, end_time
    )
    select
      g.school_id,
      g.id,
      current_day,
      gss.start_time,
      gss.end_time
    from groups g
    join group_schedule_slots gss on gss.group_id = g.id
    where g.is_active = true
      and gss.day_of_week = current_dow
    on conflict (group_id, session_date, start_time) do nothing;

    get diagnostics batch_count = row_count;
    total_count := total_count + batch_count;

    current_day := current_day + 1;
  end loop;

  return total_count;
end;
$$;

comment on function generate_sessions_for_range(date, date) is
  'Admin panelinden belirli bir tarih aralığı için toplu attendance_sessions üretir. Maksimum 365 gün. Idempotent.';
