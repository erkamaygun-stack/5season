-- =====================================================
-- Session Generator
--
-- generate_daily_sessions(target_date)
--   → group_schedule_slots tablosunu okur,
--   → o güne ait aktif gruplar için attendance_sessions üretir
--   → ON CONFLICT DO NOTHING → çift kayıt olmaz
--
-- Dev kullanımı:
--   SELECT generate_daily_sessions();            -- bugün
--   SELECT generate_daily_sessions('2026-05-16'); -- istenen gün
--
-- Production: pg_cron her gece 23:55'te yarın için çağırır
-- =====================================================

create or replace function generate_daily_sessions(
  target_date date default current_date
)
returns int
language plpgsql
security definer
as $$
declare
  target_dow int;
  sessions_created int;
begin
  -- 0=Pazar … 6=Ctesi  (PostgreSQL DOW = JS getDay() ile aynı)
  target_dow := extract(dow from target_date)::int;

  insert into attendance_sessions (school_id, group_id, session_date, start_time, end_time, status)
  select
    g.school_id,
    g.id,
    target_date,
    gss.start_time,
    gss.end_time,
    'scheduled'
  from groups g
  join group_schedule_slots gss on gss.group_id = g.id
  where g.is_active = true
    and gss.day_of_week = target_dow
  on conflict (group_id, session_date, start_time) do nothing;

  get diagnostics sessions_created = row_count;
  return sessions_created;
end;
$$;

-- ─── pg_cron zamanlaması ────────────────────────────────────────────────────
-- Supabase Dashboard → Database → Extensions → pg_cron'u etkinleştirdikten sonra:
--
-- select cron.schedule(
--   'generate-tomorrow-sessions',
--   '55 23 * * *',
--   $$select generate_daily_sessions(current_date + 1)$$
-- );
