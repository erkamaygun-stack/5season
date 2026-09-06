-- =====================================================
-- 5mevsim — pg_cron Zamanlamaları
--
-- Tüm saatler UTC cinsinden.
-- Türkiye UTC+3 (TRT) olduğu için:
--   TRT saati - 3 = UTC saati
--
-- cron.schedule() aynı isimde job varsa günceller,
-- yoksa yeni oluşturur — migration güvenle tekrar
-- çalıştırılabilir.
-- =====================================================

-- New Supabase projects do not enable the Cron module automatically.
-- Enabling it here keeps a fresh staging/production install reproducible.
create extension if not exists pg_cron;

-- 1. Günlük yoklama oturumu üretimi
--    Hedef : Her gece 23:30 TRT
--    UTC   : 20:30
select cron.schedule(
  '5mevsim-daily-sessions',
  '30 20 * * *',
  $$ select generate_tomorrow_sessions() $$
);

-- 2. Aylık aidat faturası üretimi
--    Hedef : Her ayın 1'i, 00:05 TRT
--    UTC   : 21:05 (önceki gün) — pg_cron'da "ayın 1'i 21:05 UTC"
--            Türkiye'de bu an = 2. günün 00:05 TRT'si olur.
--            1 günlük kayma kabul edilebilir; alternatif olarak
--            son gün 21:05 UTC çalıştırmak daha doğru ama
--            pg_cron "L" (last day) syntax'ını desteklemez.
--            Pratik çözüm: ayın 1'i 01:05 UTC = 04:05 TRT.
--    UTC   : 01:05, ayın 1'i
select cron.schedule(
  '5mevsim-monthly-aidat',
  '5 1 1 * *',
  $$
    select generate_monthly_aidat(
      extract(year  from current_date)::int,
      extract(month from current_date)::int
    )
  $$
);

-- 3. Günlük aidat hatırlatma kuyruğu
--    Hedef : Her gün 09:00 TRT
--    UTC   : 06:00
select cron.schedule(
  '5mevsim-aidat-reminders',
  '0 6 * * *',
  $$ select queue_aidat_reminders() $$
);
