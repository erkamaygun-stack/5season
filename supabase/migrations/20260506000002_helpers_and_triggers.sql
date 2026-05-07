-- =====================================================
-- 5season Helper Functions & Triggers
-- =====================================================

-- =====================================================
-- HELPER FUNCTIONS (RLS için)
-- =====================================================
create or replace function current_school_id()
returns uuid language sql stable security definer set search_path = public as $$
  select school_id from profiles where id = auth.uid()
$$;

create or replace function app_current_role()
returns text language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function is_coach_for_group(group_id_param uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from staff s
    join groups g on g.primary_coach_id = s.id
    where s.profile_id = auth.uid()
      and g.id = group_id_param
  )
$$;

-- =====================================================
-- AIDAT: İlk ay yarım fatura (kayıt anında)
-- =====================================================
create or replace function create_first_month_aidat()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  fee numeric(10,2);
  uniform_fee numeric(10,2);
begin
  if NEW.status not in ('active','trial') then
    return NEW;
  end if;

  select default_aidat_amount, default_uniform_amount
    into fee, uniform_fee
    from schools where id = NEW.school_id;

  -- İlk ay yarım aidat faturası
  insert into aidat_invoices (
    school_id, student_id, period_year, period_month,
    amount, is_prorated, due_date
  ) values (
    NEW.school_id,
    NEW.id,
    extract(year from NEW.enrollment_date)::int,
    extract(month from NEW.enrollment_date)::int,
    fee / 2,
    true,
    date_trunc('month', NEW.enrollment_date)::date
  )
  on conflict (student_id, period_year, period_month) do nothing;

  -- Forma + eşofman tek seferlik fatura
  insert into equipment_invoices (school_id, student_id, amount)
  values (NEW.school_id, NEW.id, uniform_fee);

  return NEW;
end;
$$;

create trigger student_first_month_aidat
  after insert on students
  for each row
  execute function create_first_month_aidat();

-- =====================================================
-- PAYMENT → INVOICE STATUS GÜNCELLEMESİ
-- =====================================================
create or replace function update_invoice_on_payment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  total_paid numeric(10,2);
  invoice_amount numeric(10,2);
begin
  select coalesce(sum(amount), 0) into total_paid
    from payments
    where invoice_type = NEW.invoice_type
      and invoice_id = NEW.invoice_id;

  if NEW.invoice_type = 'aidat' then
    select amount into invoice_amount from aidat_invoices where id = NEW.invoice_id;
    update aidat_invoices
      set paid_amount = total_paid,
          status = case
            when total_paid >= invoice_amount then 'paid'
            when total_paid > 0 then 'partial'
            else 'pending'
          end
      where id = NEW.invoice_id;
  elsif NEW.invoice_type = 'equipment' then
    select amount into invoice_amount from equipment_invoices where id = NEW.invoice_id;
    update equipment_invoices
      set paid_amount = total_paid,
          status = case
            when total_paid >= invoice_amount then 'paid'
            when total_paid > 0 then 'partial'
            else 'pending'
          end
      where id = NEW.invoice_id;
  end if;

  return NEW;
end;
$$;

create trigger payment_updates_invoice
  after insert on payments
  for each row
  execute function update_invoice_on_payment();

-- =====================================================
-- AYLIK AİDAT ÜRETİMİ
-- Cron job ayın 1'inde çağırır: select generate_monthly_aidat(2026, 6);
-- =====================================================
create or replace function generate_monthly_aidat(target_year int, target_month int)
returns int language plpgsql security definer set search_path = public as $$
declare
  generated_count int := 0;
  due_date_val date;
begin
  due_date_val := make_date(target_year, target_month, 1);

  insert into aidat_invoices (
    school_id, student_id, period_year, period_month,
    amount, is_prorated, due_date
  )
  select
    s.school_id, s.id, target_year, target_month,
    sc.default_aidat_amount, false, due_date_val
  from students s
  join schools sc on sc.id = s.school_id
  where s.status = 'active'
    -- Kayıt aynı ay ise zaten trigger açtı
    and not (
      extract(year from s.enrollment_date)::int = target_year
      and extract(month from s.enrollment_date)::int = target_month
    )
  on conflict (student_id, period_year, period_month) do nothing;

  get diagnostics generated_count = row_count;
  return generated_count;
end;
$$;

-- =====================================================
-- YARINKİ YOKLAMA OTURUMLARINI ÜRET
-- Cron her gece 23:30: select generate_tomorrow_sessions();
-- =====================================================
create or replace function generate_tomorrow_sessions()
returns int language plpgsql security definer set search_path = public as $$
declare
  generated_count int := 0;
  tomorrow_date date;
  tomorrow_dow int;
begin
  tomorrow_date := current_date + 1;
  tomorrow_dow := extract(dow from tomorrow_date)::int;

  insert into attendance_sessions (
    school_id, group_id, session_date, start_time, end_time
  )
  select
    g.school_id, g.id, tomorrow_date, gss.start_time, gss.end_time
  from groups g
  join group_schedule_slots gss on gss.group_id = g.id
  where g.is_active = true
    and gss.day_of_week = tomorrow_dow
  on conflict (group_id, session_date, start_time) do nothing;

  get diagnostics generated_count = row_count;
  return generated_count;
end;
$$;

-- =====================================================
-- AIDAT HATIRLATMA KUYRUĞU (5 gün öncesi)
-- Cron her gün 09:00: select queue_aidat_reminders();
-- =====================================================
create or replace function queue_aidat_reminders()
returns int language plpgsql security definer set search_path = public as $$
declare
  queued_count int := 0;
  reminder_target_date date;
begin
  -- 5 gün sonra hangi tarih
  reminder_target_date := current_date + 5;

  insert into notification_log (
    school_id, recipient_profile_id, recipient_phone,
    channel, template_code, body_rendered,
    related_entity_type, related_entity_id, status
  )
  select
    ai.school_id,
    ps.parent_profile_id,
    p.phone,
    'whatsapp',
    'aidat_reminder_5d',
    replace(replace(replace(
      coalesce(nt.body_template, 'Sayın veli, {{student_name}} için {{period}} ayı aidatına 5 gün kaldı. Tutar: {{amount}} TL.'),
      '{{student_name}}', s.full_name),
      '{{period}}', to_char(make_date(ai.period_year, ai.period_month, 1), 'TMMonth YYYY')),
      '{{amount}}', ai.amount::text),
    'aidat_invoice',
    ai.id,
    'queued'
  from aidat_invoices ai
  join students s on s.id = ai.student_id
  join parent_student ps on ps.student_id = s.id
  join profiles p on p.id = ps.parent_profile_id
  left join notification_templates nt
    on nt.school_id = ai.school_id
    and nt.code = 'aidat_reminder_5d'
    and nt.channel = 'whatsapp'
  where ai.status in ('pending','partial')
    and ai.due_date = reminder_target_date
    -- Aynı fatura için zaten kuyruğa eklenmediyse
    and not exists (
      select 1 from notification_log nl
      where nl.related_entity_id = ai.id
        and nl.template_code = 'aidat_reminder_5d'
    );

  get diagnostics queued_count = row_count;
  return queued_count;
end;
$$;
