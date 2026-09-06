-- =====================================================
-- WhatsApp delivery pipeline, idempotent inbound jobs and receipt cleanup
-- Apply only to an isolated local/staging database before any production review.
-- =====================================================

begin;

-- Grup renk seçimi mevcut yönetim arayüzünün kullandığı şema sözleşmesidir;
-- eski migration zincirinde eksik olduğu için temiz kurulumda burada tamamlanır.
alter table public.groups
  add column if not exists color text
  check (color is null or color in (
    'blue', 'red', 'green', 'yellow', 'dark_green', 'lime', 'orange', 'purple',
    'magenta', 'pink', 'cyan', 'light_blue', 'navy', 'brown', 'maroon', 'white'
  ));

alter table public.whatsapp_channels
  add column if not exists template_config jsonb not null default '{}'::jsonb;

alter table public.staff
  add column if not exists invitation_accepted_at timestamptz;

alter table public.receipt_submissions
  add column if not exists cleanup_locked_at timestamptz,
  add column if not exists cleanup_next_attempt_at timestamptz;

alter table public.integration_outbox
  drop constraint if exists integration_outbox_status_check;

alter table public.integration_outbox
  add constraint integration_outbox_status_check
  check (status in ('suppressed', 'dry_run', 'pending', 'processing', 'sent', 'failed', 'dead_letter', 'cancelled'));

-- The V1 receipt contract accepts images only. HEIC/PDF are deliberately rejected.
update storage.buckets
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png']
where id = 'whatsapp-receipts';

create table if not exists public.whatsapp_inbound_jobs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  channel_id uuid not null references public.whatsapp_channels(id) on delete cascade,
  message_id uuid not null unique references public.whatsapp_messages(id) on delete cascade,
  job_type text not null check (job_type in ('receipt_media', 'receipt_selection')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'failed', 'completed', 'dead_letter')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz,
  locked_at timestamptz,
  last_error_code text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists whatsapp_inbound_jobs_worker_idx
  on public.whatsapp_inbound_jobs (status, next_attempt_at, created_at)
  where status in ('pending', 'failed');

alter table public.whatsapp_inbound_jobs enable row level security;

drop policy if exists "whatsapp_inbound_jobs_admin_read" on public.whatsapp_inbound_jobs;
create policy "whatsapp_inbound_jobs_admin_read" on public.whatsapp_inbound_jobs
  for select to authenticated
  using (
    public.app_current_role() = 'super_admin'
    or (public.app_current_role() = 'school_admin' and school_id = public.current_school_id())
  );

-- -----------------------------------------------------------------------------
-- Fast webhook ingestion. The function stores only normalized/minimum metadata;
-- raw message bodies and text are intentionally not retained.
-- -----------------------------------------------------------------------------

create or replace function public.ingest_whatsapp_message(
  p_phone_number_id text,
  p_provider_message_id text,
  p_sender_wa_id text,
  p_message_type text,
  p_occurred_at timestamptz,
  p_media_id text default null,
  p_interactive_reply_id text default null,
  p_is_stop_request boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_channel public.whatsapp_channels%rowtype;
  v_guardian public.guardians%rowtype;
  v_conversation public.whatsapp_conversations%rowtype;
  v_message public.whatsapp_messages%rowtype;
  v_submission public.receipt_submissions%rowtype;
  v_duplicate boolean := false;
  v_job_type text;
begin
  if nullif(trim(p_phone_number_id), '') is null
     or nullif(trim(p_provider_message_id), '') is null
     or nullif(trim(p_sender_wa_id), '') is null
     or nullif(trim(p_message_type), '') is null then
    raise exception 'whatsapp_message_fields_missing' using errcode = '22023';
  end if;

  select * into v_channel
  from public.whatsapp_channels
  where phone_number_id = p_phone_number_id
    and status in ('test', 'active');

  if v_channel.id is null then
    raise exception 'whatsapp_channel_not_enabled' using errcode = '42501';
  end if;

  select * into v_guardian
  from public.guardians
  where school_id = v_channel.school_id
    and status in ('active', 'unverified')
    and (
      whatsapp_wa_id = p_sender_wa_id
      or (whatsapp_wa_id is null and phone_e164 = '+' || regexp_replace(p_sender_wa_id, '[^0-9]', '', 'g'))
    )
  limit 1;

  if v_guardian.id is not null and v_guardian.whatsapp_wa_id is null then
    update public.guardians
    set whatsapp_wa_id = p_sender_wa_id,
        status = case when status = 'unverified' then 'active' else status end,
        updated_at = now()
    where id = v_guardian.id;
  end if;

  insert into public.whatsapp_conversations (
    school_id, channel_id, guardian_id, sender_wa_id, state, service_window_expires_at
  ) values (
    v_channel.school_id,
    v_channel.id,
    v_guardian.id,
    p_sender_wa_id,
    case when v_guardian.id is null then 'human_handoff' else 'idle' end,
    greatest(coalesce(p_occurred_at, now()), now()) + interval '24 hours'
  )
  on conflict (channel_id, sender_wa_id) do update
  set guardian_id = coalesce(public.whatsapp_conversations.guardian_id, excluded.guardian_id),
      service_window_expires_at = excluded.service_window_expires_at,
      updated_at = now()
  returning * into v_conversation;

  insert into public.whatsapp_messages (
    school_id, channel_id, conversation_id, provider_message_id, direction,
    message_type, delivery_status, media_id, metadata, occurred_at
  ) values (
    v_channel.school_id,
    v_channel.id,
    v_conversation.id,
    p_provider_message_id,
    'inbound',
    p_message_type,
    'received',
    p_media_id,
    jsonb_strip_nulls(jsonb_build_object(
      'interactive_reply_id', p_interactive_reply_id,
      'stop_request', case when p_is_stop_request then true else null end
    )),
    coalesce(p_occurred_at, now())
  )
  on conflict (provider_message_id) do nothing
  returning * into v_message;

  if v_message.id is null then
    v_duplicate := true;
    select * into v_message
    from public.whatsapp_messages
    where provider_message_id = p_provider_message_id;

    select * into v_submission
    from public.receipt_submissions
    where message_id = v_message.id;

    return jsonb_build_object(
      'duplicate', true,
      'message_id', v_message.id,
      'submission_id', v_submission.id,
      'school_id', v_message.school_id
    );
  end if;

  if p_is_stop_request and v_guardian.id is not null then
    insert into public.guardian_consents (
      school_id, guardian_id, purpose_code, status, legal_basis, source, evidence, revoked_at
    ) values (
      v_channel.school_id,
      v_guardian.id,
      'whatsapp_transactional',
      'revoked',
      'opt_in',
      'whatsapp_stop_message',
      jsonb_build_object('provider_message_id', p_provider_message_id),
      coalesce(p_occurred_at, now())
    );

    update public.whatsapp_conversations
    set state = 'closed', updated_at = now()
    where id = v_conversation.id;
  elsif p_message_type = 'image' and p_media_id is not null then
    insert into public.receipt_submissions (
      school_id, channel_id, message_id, guardian_id, status, decision_reason
    ) values (
      v_channel.school_id,
      v_channel.id,
      v_message.id,
      v_guardian.id,
      'identifying',
      case when v_guardian.id is null then 'guardian_not_matched' else null end
    )
    returning * into v_submission;
    v_job_type := 'receipt_media';
  elsif p_message_type = 'interactive' and p_interactive_reply_id is not null then
    v_job_type := 'receipt_selection';
  elsif v_guardian.id is null then
    update public.whatsapp_conversations
    set state = 'human_handoff', human_handoff_reason = 'guardian_not_matched', updated_at = now()
    where id = v_conversation.id;
  end if;

  if v_job_type is not null then
    insert into public.whatsapp_inbound_jobs (
      school_id, channel_id, message_id, job_type, payload, status
    ) values (
      v_channel.school_id,
      v_channel.id,
      v_message.id,
      v_job_type,
      jsonb_strip_nulls(jsonb_build_object(
        'media_id', p_media_id,
        'interactive_reply_id', p_interactive_reply_id,
        'submission_id', v_submission.id
      )),
      'pending'
    ) on conflict (message_id) do nothing;
  end if;

  return jsonb_build_object(
    'duplicate', v_duplicate,
    'message_id', v_message.id,
    'submission_id', v_submission.id,
    'school_id', v_channel.school_id
  );
end;
$$;

revoke all on function public.ingest_whatsapp_message(text, text, text, text, timestamptz, text, text, boolean)
  from public, anon, authenticated;
grant execute on function public.ingest_whatsapp_message(text, text, text, text, timestamptz, text, text, boolean)
  to service_role;

create or replace function public.record_whatsapp_delivery_status(
  p_phone_number_id text,
  p_provider_message_id text,
  p_delivery_status text,
  p_occurred_at timestamptz,
  p_error_code text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  if p_delivery_status not in ('sent', 'delivered', 'read', 'failed') then
    raise exception 'invalid_whatsapp_delivery_status' using errcode = '22023';
  end if;

  update public.whatsapp_messages wm
  set delivery_status = p_delivery_status,
      occurred_at = greatest(wm.occurred_at, coalesce(p_occurred_at, wm.occurred_at)),
      metadata = case
        when p_error_code is null then wm.metadata
        else wm.metadata || jsonb_build_object('provider_error_code', p_error_code)
      end
  from public.whatsapp_channels wc
  where wm.channel_id = wc.id
    and wc.phone_number_id = p_phone_number_id
    and wm.provider_message_id = p_provider_message_id;

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke all on function public.record_whatsapp_delivery_status(text, text, text, timestamptz, text)
  from public, anon, authenticated;
grant execute on function public.record_whatsapp_delivery_status(text, text, text, timestamptz, text)
  to service_role;

-- -----------------------------------------------------------------------------
-- Inbound worker claims and receipt matching.
-- -----------------------------------------------------------------------------

create or replace function public.claim_whatsapp_inbound_jobs(p_limit integer default 10)
returns setof public.whatsapp_inbound_jobs
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with candidates as (
    select id
    from public.whatsapp_inbound_jobs
    where (
      status = 'pending'
      or (status = 'failed' and coalesce(next_attempt_at, now()) <= now())
      or (status = 'processing' and locked_at < now() - interval '10 minutes')
    )
    order by created_at
    for update skip locked
    limit least(greatest(p_limit, 1), 50)
  )
  update public.whatsapp_inbound_jobs jobs
  set status = 'processing',
      locked_at = now(),
      attempt_count = attempt_count + 1,
      updated_at = now()
  from candidates
  where jobs.id = candidates.id
  returning jobs.*;
end;
$$;

revoke all on function public.claim_whatsapp_inbound_jobs(integer)
  from public, anon, authenticated;
grant execute on function public.claim_whatsapp_inbound_jobs(integer) to service_role;

create or replace function public.complete_whatsapp_inbound_job(p_job_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.whatsapp_inbound_jobs
  set status = 'completed', completed_at = now(), locked_at = null,
      last_error_code = null, updated_at = now()
  where id = p_job_id and status = 'processing';
$$;

revoke all on function public.complete_whatsapp_inbound_job(uuid)
  from public, anon, authenticated;
grant execute on function public.complete_whatsapp_inbound_job(uuid) to service_role;

create or replace function public.fail_whatsapp_inbound_job(
  p_job_id uuid,
  p_error_code text,
  p_retryable boolean default true
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.whatsapp_inbound_jobs
  set status = case when p_retryable and attempt_count < 5 then 'failed' else 'dead_letter' end,
      next_attempt_at = case
        when p_retryable and attempt_count < 5
          then now() + make_interval(mins => least(60, (power(2, attempt_count))::integer))
        else null
      end,
      locked_at = null,
      last_error_code = left(coalesce(p_error_code, 'unknown_error'), 120),
      updated_at = now()
  where id = p_job_id and status = 'processing';
end;
$$;

revoke all on function public.fail_whatsapp_inbound_job(uuid, text, boolean)
  from public, anon, authenticated;
grant execute on function public.fail_whatsapp_inbound_job(uuid, text, boolean) to service_role;

create or replace function public.finalize_whatsapp_receipt_media(
  p_submission_id uuid,
  p_storage_path text,
  p_content_sha256 text,
  p_mime_type text,
  p_size_bytes bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_submission public.receipt_submissions%rowtype;
  v_option_count integer := 0;
  v_student_id uuid;
  v_invoice_type text;
  v_invoice_id uuid;
begin
  if p_mime_type not in ('image/jpeg', 'image/png')
     or p_size_bytes not between 1 and 10485760
     or p_content_sha256 !~ '^[0-9a-f]{64}$'
     or nullif(trim(p_storage_path), '') is null then
    raise exception 'invalid_receipt_media_metadata' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_content_sha256, 0));

  select * into v_submission
  from public.receipt_submissions
  where id = p_submission_id
  for update;

  if v_submission.id is null then
    raise exception 'receipt_submission_not_found' using errcode = 'P0002';
  end if;
  if v_submission.storage_path is not null then
    return jsonb_build_object('status', v_submission.status, 'duplicate_job', true);
  end if;

  if exists (
    select 1 from public.receipt_submissions
    where school_id = v_submission.school_id
      and content_sha256 = p_content_sha256
      and id <> v_submission.id
  ) then
    update public.receipt_submissions
    set storage_path = p_storage_path,
        mime_type = p_mime_type,
        size_bytes = p_size_bytes,
        status = 'cleanup_pending',
        decision_reason = 'duplicate_content',
        updated_at = now()
    where id = v_submission.id;
    return jsonb_build_object('status', 'cleanup_pending', 'duplicate_content', true);
  end if;

  update public.receipt_submissions
  set storage_path = p_storage_path,
      content_sha256 = p_content_sha256,
      mime_type = p_mime_type,
      size_bytes = p_size_bytes,
      status = 'identifying',
      updated_at = now()
  where id = v_submission.id;

  if v_submission.guardian_id is null then
    update public.receipt_submissions
    set status = 'failed', decision_reason = 'guardian_not_matched', updated_at = now()
    where id = v_submission.id;
    update public.whatsapp_conversations
    set state = 'human_handoff', human_handoff_reason = 'guardian_not_matched', updated_at = now()
    where id = (select conversation_id from public.whatsapp_messages where id = v_submission.message_id);
    return jsonb_build_object('status', 'failed', 'reason', 'guardian_not_matched');
  end if;

  select count(*) into v_option_count
  from (
    select ai.student_id, 'aidat'::text as invoice_type, ai.id as invoice_id
    from public.guardian_students gs
    join public.aidat_invoices ai on ai.student_id = gs.student_id
    where gs.guardian_id = v_submission.guardian_id
      and ai.school_id = v_submission.school_id
      and ai.status in ('pending', 'partial')
      and ai.amount > coalesce(ai.paid_amount, 0)
    union all
    select ei.student_id, 'equipment'::text, ei.id
    from public.guardian_students gs
    join public.equipment_invoices ei on ei.student_id = gs.student_id
    where gs.guardian_id = v_submission.guardian_id
      and ei.school_id = v_submission.school_id
      and ei.status in ('pending', 'partial')
      and ei.amount > coalesce(ei.paid_amount, 0)
  ) options;

  if v_option_count = 1 then
    select student_id, invoice_type, invoice_id
    into v_student_id, v_invoice_type, v_invoice_id
    from (
      select ai.student_id, 'aidat'::text as invoice_type, ai.id as invoice_id
      from public.guardian_students gs
      join public.aidat_invoices ai on ai.student_id = gs.student_id
      where gs.guardian_id = v_submission.guardian_id
        and ai.school_id = v_submission.school_id
        and ai.status in ('pending', 'partial') and ai.amount > coalesce(ai.paid_amount, 0)
      union all
      select ei.student_id, 'equipment'::text, ei.id
      from public.guardian_students gs
      join public.equipment_invoices ei on ei.student_id = gs.student_id
      where gs.guardian_id = v_submission.guardian_id
        and ei.school_id = v_submission.school_id
        and ei.status in ('pending', 'partial') and ei.amount > coalesce(ei.paid_amount, 0)
    ) options
    limit 1;

    update public.receipt_submissions
    set student_id = v_student_id,
        invoice_type = v_invoice_type,
        invoice_id = v_invoice_id,
        match_confidence = 1,
        status = 'pending_review',
        decision_reason = null,
        updated_at = now()
    where id = v_submission.id;
    return jsonb_build_object('status', 'pending_review', 'option_count', 1);
  elsif v_option_count > 1 then
    update public.receipt_submissions
    set status = 'awaiting_selection', decision_reason = null, updated_at = now()
    where id = v_submission.id;

    update public.whatsapp_conversations
    set state = 'awaiting_invoice', updated_at = now()
    where id = (select conversation_id from public.whatsapp_messages where id = v_submission.message_id);

    insert into public.integration_outbox (
      school_id, channel_id, guardian_id, event_key, purpose_code, payload,
      status, suppression_reason, next_attempt_at
    )
    select
      v_submission.school_id,
      v_submission.channel_id,
      v_submission.guardian_id,
      'receipt-selection:' || v_submission.id::text,
      'receipt_selection',
      jsonb_build_object('submission_id', v_submission.id),
      case when s.communications_status = 'active' and wc.status in ('test', 'active') then 'pending' else 'suppressed' end,
      case when s.communications_status = 'active' and wc.status in ('test', 'active') then null else 'tenant_or_channel_quarantined' end,
      now()
    from public.schools s
    join public.whatsapp_channels wc on wc.id = v_submission.channel_id
    where s.id = v_submission.school_id
    on conflict (event_key) do nothing;

    return jsonb_build_object('status', 'awaiting_selection', 'option_count', v_option_count);
  end if;

  update public.receipt_submissions
  set status = 'failed', decision_reason = 'open_invoice_not_found', updated_at = now()
  where id = v_submission.id;
  update public.whatsapp_conversations
  set state = 'human_handoff', human_handoff_reason = 'open_invoice_not_found', updated_at = now()
  where id = (select conversation_id from public.whatsapp_messages where id = v_submission.message_id);
  return jsonb_build_object('status', 'failed', 'reason', 'open_invoice_not_found');
end;
$$;

revoke all on function public.finalize_whatsapp_receipt_media(uuid, text, text, text, bigint)
  from public, anon, authenticated;
grant execute on function public.finalize_whatsapp_receipt_media(uuid, text, text, text, bigint)
  to service_role;

create or replace function public.get_receipt_selection_options(p_submission_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(to_jsonb(options) order by options.due_sort, options.student_name), '[]'::jsonb)
  from (
    select s.id as student_id, s.full_name as student_name, 'aidat'::text as invoice_type,
           ai.id as invoice_id, ai.amount - coalesce(ai.paid_amount, 0) as remaining_amount,
           to_char(make_date(ai.period_year, ai.period_month, 1), 'YYYY-MM') as invoice_label,
           ai.due_date as due_sort
    from public.receipt_submissions rs
    join public.guardian_students gs on gs.guardian_id = rs.guardian_id
    join public.students s on s.id = gs.student_id and s.school_id = rs.school_id
    join public.aidat_invoices ai on ai.student_id = s.id and ai.school_id = rs.school_id
    where rs.id = p_submission_id and rs.status = 'awaiting_selection'
      and ai.status in ('pending', 'partial') and ai.amount > coalesce(ai.paid_amount, 0)
    union all
    select s.id, s.full_name, 'equipment'::text, ei.id,
           ei.amount - coalesce(ei.paid_amount, 0), coalesce(ei.description, 'Ekipman'),
           ei.created_at::date
    from public.receipt_submissions rs
    join public.guardian_students gs on gs.guardian_id = rs.guardian_id
    join public.students s on s.id = gs.student_id and s.school_id = rs.school_id
    join public.equipment_invoices ei on ei.student_id = s.id and ei.school_id = rs.school_id
    where rs.id = p_submission_id and rs.status = 'awaiting_selection'
      and ei.status in ('pending', 'partial') and ei.amount > coalesce(ei.paid_amount, 0)
  ) options;
$$;

revoke all on function public.get_receipt_selection_options(uuid)
  from public, anon, authenticated;
grant execute on function public.get_receipt_selection_options(uuid) to service_role;

create or replace function public.select_whatsapp_receipt_invoice(
  p_message_id uuid,
  p_submission_id uuid,
  p_invoice_type text,
  p_invoice_id uuid
)
returns public.receipt_submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_message public.whatsapp_messages%rowtype;
  v_submission public.receipt_submissions%rowtype;
  v_student_id uuid;
begin
  if p_invoice_type not in ('aidat', 'equipment') then
    raise exception 'invalid_invoice_type' using errcode = '22023';
  end if;

  select * into v_message from public.whatsapp_messages where id = p_message_id;
  select * into v_submission from public.receipt_submissions where id = p_submission_id for update;
  if v_message.id is null or v_submission.id is null or v_submission.status <> 'awaiting_selection' then
    raise exception 'receipt_selection_not_available' using errcode = '55000';
  end if;
  if v_message.direction <> 'inbound'
     or v_message.channel_id <> v_submission.channel_id
     or v_message.conversation_id <> (select conversation_id from public.whatsapp_messages where id = v_submission.message_id) then
    raise exception 'receipt_selection_conversation_mismatch' using errcode = '42501';
  end if;

  if p_invoice_type = 'aidat' then
    select ai.student_id into v_student_id
    from public.aidat_invoices ai
    join public.guardian_students gs on gs.student_id = ai.student_id
    where ai.id = p_invoice_id and ai.school_id = v_submission.school_id
      and gs.guardian_id = v_submission.guardian_id
      and ai.status in ('pending', 'partial') and ai.amount > coalesce(ai.paid_amount, 0);
  else
    select ei.student_id into v_student_id
    from public.equipment_invoices ei
    join public.guardian_students gs on gs.student_id = ei.student_id
    where ei.id = p_invoice_id and ei.school_id = v_submission.school_id
      and gs.guardian_id = v_submission.guardian_id
      and ei.status in ('pending', 'partial') and ei.amount > coalesce(ei.paid_amount, 0);
  end if;

  if v_student_id is null then
    raise exception 'receipt_selection_invoice_forbidden' using errcode = '42501';
  end if;

  update public.receipt_submissions
  set student_id = v_student_id,
      invoice_type = p_invoice_type,
      invoice_id = p_invoice_id,
      match_confidence = 1,
      status = 'pending_review',
      decision_reason = null,
      updated_at = now()
  where id = v_submission.id
  returning * into v_submission;

  update public.whatsapp_conversations
  set state = 'awaiting_receipt', updated_at = now()
  where id = v_message.conversation_id;

  return v_submission;
end;
$$;

revoke all on function public.select_whatsapp_receipt_invoice(uuid, uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.select_whatsapp_receipt_invoice(uuid, uuid, text, uuid)
  to service_role;

-- -----------------------------------------------------------------------------
-- Transaction-safe outbox claiming, retry/dead-letter and delivery recording.
-- -----------------------------------------------------------------------------

create or replace function public.claim_integration_outbox(p_limit integer default 10)
returns setof public.integration_outbox
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with candidates as (
    select id
    from public.integration_outbox
    where (
      (status = 'pending' and coalesce(next_attempt_at, now()) <= now())
      or (status = 'failed' and coalesce(next_attempt_at, now()) <= now())
      or (status = 'processing' and locked_at < now() - interval '10 minutes')
    )
    order by created_at
    for update skip locked
    limit least(greatest(p_limit, 1), 50)
  )
  update public.integration_outbox outbox
  set status = 'processing', locked_at = now(), attempt_count = attempt_count + 1, updated_at = now()
  from candidates
  where outbox.id = candidates.id
  returning outbox.*;
end;
$$;

revoke all on function public.claim_integration_outbox(integer)
  from public, anon, authenticated;
grant execute on function public.claim_integration_outbox(integer) to service_role;

create or replace function public.complete_integration_outbox(
  p_outbox_id uuid,
  p_provider_message_id text,
  p_accepted_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_outbox public.integration_outbox%rowtype;
  v_conversation_id uuid;
begin
  select * into v_outbox from public.integration_outbox where id = p_outbox_id for update;
  if v_outbox.id is null or v_outbox.status <> 'processing' then
    raise exception 'outbox_not_processing' using errcode = '55000';
  end if;

  select id into v_conversation_id
  from public.whatsapp_conversations
  where channel_id = v_outbox.channel_id and guardian_id = v_outbox.guardian_id
  order by updated_at desc limit 1;

  insert into public.whatsapp_messages (
    school_id, channel_id, conversation_id, provider_message_id, direction,
    message_type, delivery_status, metadata, occurred_at
  ) values (
    v_outbox.school_id, v_outbox.channel_id, v_conversation_id, p_provider_message_id,
    'outbound', case when v_outbox.purpose_code = 'receipt_selection' then 'interactive' else 'template' end,
    'sent', jsonb_build_object('outbox_id', v_outbox.id, 'purpose_code', v_outbox.purpose_code),
    coalesce(p_accepted_at, now())
  ) on conflict (provider_message_id) do nothing;

  update public.integration_outbox
  set status = 'sent', sent_at = coalesce(p_accepted_at, now()), locked_at = null,
      last_error_code = null, updated_at = now()
  where id = v_outbox.id;
end;
$$;

revoke all on function public.complete_integration_outbox(uuid, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.complete_integration_outbox(uuid, text, timestamptz)
  to service_role;

create or replace function public.fail_integration_outbox(
  p_outbox_id uuid,
  p_error_code text,
  p_retryable boolean default true
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.integration_outbox
  set status = case when p_retryable and attempt_count < 5 then 'failed' else 'dead_letter' end,
      next_attempt_at = case
        when p_retryable and attempt_count < 5
          then now() + make_interval(mins => least(60, (power(2, attempt_count))::integer))
        else null
      end,
      locked_at = null,
      last_error_code = left(coalesce(p_error_code, 'unknown_error'), 120),
      updated_at = now()
  where id = p_outbox_id and status = 'processing';
end;
$$;

revoke all on function public.fail_integration_outbox(uuid, text, boolean)
  from public, anon, authenticated;
grant execute on function public.fail_integration_outbox(uuid, text, boolean) to service_role;

create or replace function public.suppress_integration_outbox(p_outbox_id uuid, p_reason text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.integration_outbox
  set status = 'suppressed', suppression_reason = left(coalesce(p_reason, 'blocked'), 120),
      locked_at = null, next_attempt_at = null, updated_at = now()
  where id = p_outbox_id and status = 'processing';
$$;

revoke all on function public.suppress_integration_outbox(uuid, text)
  from public, anon, authenticated;
grant execute on function public.suppress_integration_outbox(uuid, text) to service_role;

-- Günlük worker bu fonksiyonu çağırır. Event key aynı fatura/gün için tekrar
-- üretimi engeller; gerçek gönderim ayrıca worker'daki opt-in ve ortam policy'sine tabidir.
create or replace function public.enqueue_due_aidat_reminders(p_today date default current_date)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  insert into public.integration_outbox (
    school_id, channel_id, guardian_id, event_key, purpose_code, payload,
    status, suppression_reason, next_attempt_at
  )
  select
    ai.school_id,
    channel.id,
    g.id,
    'aidat-reminder:' || ai.id::text || ':' || p_today::text,
    'aidat_reminder',
    jsonb_build_object('invoice_id', ai.id),
    case when s.communications_status = 'active' and channel.status in ('test', 'active') then 'pending' else 'suppressed' end,
    case when s.communications_status = 'active' and channel.status in ('test', 'active') then null else 'tenant_or_channel_quarantined' end,
    now()
  from public.aidat_invoices ai
  join public.schools s on s.id = ai.school_id
  join public.guardian_students gs on gs.student_id = ai.student_id and gs.is_primary = true
  join public.guardians g on g.id = gs.guardian_id and g.status = 'active'
  join lateral (
    select wc.id, wc.status
    from public.whatsapp_channels wc
    where wc.school_id = ai.school_id and wc.status in ('test', 'active')
    order by case when wc.status = 'active' then 0 else 1 end, wc.created_at
    limit 1
  ) channel on true
  where ai.status in ('pending', 'partial')
    and ai.amount > coalesce(ai.paid_amount, 0)
    and ai.due_date = p_today + 5
  on conflict (event_key) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.enqueue_due_aidat_reminders(date)
  from public, anon, authenticated;
grant execute on function public.enqueue_due_aidat_reminders(date) to service_role;

-- -----------------------------------------------------------------------------
-- Storage cleanup is deliberately separated from the financial transaction.
-- Result delivery is released only after cleanup succeeds.
-- -----------------------------------------------------------------------------

create or replace function public.claim_receipt_cleanup(p_limit integer default 10)
returns setof public.receipt_submissions
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with candidates as (
    select id
    from public.receipt_submissions
    where status = 'cleanup_pending'
      and storage_path is not null
      and coalesce(cleanup_next_attempt_at, now()) <= now()
      and (cleanup_locked_at is null or cleanup_locked_at < now() - interval '10 minutes')
    order by decided_at nulls last, created_at
    for update skip locked
    limit least(greatest(p_limit, 1), 50)
  )
  update public.receipt_submissions receipts
  set cleanup_locked_at = now(), cleanup_attempts = cleanup_attempts + 1, updated_at = now()
  from candidates
  where receipts.id = candidates.id
  returning receipts.*;
end;
$$;

revoke all on function public.claim_receipt_cleanup(integer)
  from public, anon, authenticated;
grant execute on function public.claim_receipt_cleanup(integer) to service_role;

create or replace function public.complete_receipt_cleanup(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_submission public.receipt_submissions%rowtype;
  v_should_queue boolean := false;
begin
  select * into v_submission
  from public.receipt_submissions
  where id = p_submission_id and status = 'cleanup_pending'
  for update;
  if v_submission.id is null then
    raise exception 'receipt_cleanup_not_pending' using errcode = '55000';
  end if;

  update public.receipt_submissions
  set storage_path = null, cleaned_at = now(), cleanup_locked_at = null,
      cleanup_next_attempt_at = null, cleanup_last_error = null,
      status = 'completed', updated_at = now()
  where id = v_submission.id;

  if v_submission.decision is not null then
    select s.communications_status = 'active' and wc.status in ('test', 'active')
    into v_should_queue
    from public.schools s
    join public.whatsapp_channels wc on wc.id = v_submission.channel_id
    where s.id = v_submission.school_id;

    update public.integration_outbox
    set status = case when v_should_queue then 'pending' else 'suppressed' end,
        suppression_reason = case when v_should_queue then null else 'tenant_or_channel_quarantined' end,
        next_attempt_at = case when v_should_queue then now() else null end,
        updated_at = now()
    where event_key = 'receipt-result:' || v_submission.id::text
      and status in ('suppressed', 'dry_run');
  end if;
end;
$$;

revoke all on function public.complete_receipt_cleanup(uuid)
  from public, anon, authenticated;
grant execute on function public.complete_receipt_cleanup(uuid) to service_role;

create or replace function public.fail_receipt_cleanup(p_submission_id uuid, p_error_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.receipt_submissions
  set status = case when cleanup_attempts >= 5 then 'failed' else 'cleanup_pending' end,
      cleanup_next_attempt_at = case
        when cleanup_attempts >= 5 then null
        else now() + make_interval(mins => least(60, (power(2, cleanup_attempts))::integer))
      end,
      cleanup_locked_at = null,
      cleanup_last_error = left(coalesce(p_error_code, 'unknown_error'), 120),
      updated_at = now()
  where id = p_submission_id and cleanup_locked_at is not null;
end;
$$;

revoke all on function public.fail_receipt_cleanup(uuid, text)
  from public, anon, authenticated;
grant execute on function public.fail_receipt_cleanup(uuid, text) to service_role;

-- Admin recovery for an unmatched receipt. Invoice ownership and tenant are
-- checked again in the database before the row can enter review.
create or replace function public.match_receipt_submission(
  p_submission_id uuid,
  p_invoice_type text,
  p_invoice_id uuid
)
returns public.receipt_submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor public.profiles%rowtype;
  v_submission public.receipt_submissions%rowtype;
  v_student_id uuid;
begin
  select * into v_actor from public.profiles where id = auth.uid() and is_active = true;
  select * into v_submission from public.receipt_submissions where id = p_submission_id for update;
  if v_actor.id is null or v_actor.role not in ('school_admin', 'super_admin') then
    raise exception 'receipt_match_forbidden' using errcode = '42501';
  end if;
  if v_submission.id is null or v_submission.decision is not null
     or v_submission.status not in ('identifying', 'awaiting_selection', 'failed') then
    raise exception 'receipt_not_matchable' using errcode = '55000';
  end if;
  if v_actor.role <> 'super_admin' and v_actor.school_id <> v_submission.school_id then
    raise exception 'cross_tenant_receipt_match' using errcode = '42501';
  end if;

  if p_invoice_type = 'aidat' then
    select student_id into v_student_id from public.aidat_invoices
    where id = p_invoice_id and school_id = v_submission.school_id
      and status in ('pending', 'partial') and amount > coalesce(paid_amount, 0);
  elsif p_invoice_type = 'equipment' then
    select student_id into v_student_id from public.equipment_invoices
    where id = p_invoice_id and school_id = v_submission.school_id
      and status in ('pending', 'partial') and amount > coalesce(paid_amount, 0);
  else
    raise exception 'invalid_invoice_type' using errcode = '22023';
  end if;
  if v_student_id is null then
    raise exception 'invoice_not_matchable' using errcode = '23503';
  end if;

  update public.receipt_submissions
  set student_id = v_student_id, invoice_type = p_invoice_type, invoice_id = p_invoice_id,
      match_confidence = 0.5, status = 'pending_review', decision_reason = 'admin_matched', updated_at = now()
  where id = v_submission.id
  returning * into v_submission;

  insert into public.audit_log (school_id, actor_profile_id, action, entity_type, entity_id, diff)
  values (v_submission.school_id, v_actor.id, 'receipt_matched', 'receipt_submission', v_submission.id,
          jsonb_build_object('invoice_type', p_invoice_type, 'invoice_id', p_invoice_id));
  return v_submission;
end;
$$;

revoke all on function public.match_receipt_submission(uuid, text, uuid) from public, anon;
grant execute on function public.match_receipt_submission(uuid, text, uuid) to authenticated;

create or replace function public.retry_receipt_cleanup(p_submission_id uuid)
returns public.receipt_submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor public.profiles%rowtype;
  v_submission public.receipt_submissions%rowtype;
begin
  select * into v_actor from public.profiles where id = auth.uid() and is_active = true;
  select * into v_submission from public.receipt_submissions where id = p_submission_id for update;
  if v_actor.id is null or v_actor.role not in ('school_admin', 'super_admin') then
    raise exception 'receipt_cleanup_retry_forbidden' using errcode = '42501';
  end if;
  if v_submission.id is null or v_submission.status <> 'failed'
     or v_submission.decision is null or v_submission.storage_path is null then
    raise exception 'receipt_cleanup_not_retryable' using errcode = '55000';
  end if;
  if v_actor.role <> 'super_admin' and v_actor.school_id <> v_submission.school_id then
    raise exception 'cross_tenant_receipt_cleanup_retry' using errcode = '42501';
  end if;

  update public.receipt_submissions
  set status = 'cleanup_pending', cleanup_attempts = 0, cleanup_next_attempt_at = now(),
      cleanup_locked_at = null, cleanup_last_error = null, updated_at = now()
  where id = v_submission.id
  returning * into v_submission;
  return v_submission;
end;
$$;

revoke all on function public.retry_receipt_cleanup(uuid) from public, anon;
grant execute on function public.retry_receipt_cleanup(uuid) to authenticated;

-- Personel profilinin iki tabloya yayılan güncelleme/arşiv işlemleri aynı DB
-- transaction'ında tamamlanır; istemciden gelen profile_id'ye güvenilmez.
create or replace function public.update_staff_record(
  p_staff_id uuid,
  p_full_name text,
  p_staff_type text,
  p_monthly_salary numeric,
  p_is_active boolean,
  p_phone_e164 text default null
)
returns public.staff
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor public.profiles%rowtype;
  v_staff public.staff%rowtype;
begin
  select * into v_actor from public.profiles where id = auth.uid() and is_active = true;
  if v_actor.id is null or v_actor.role not in ('school_admin', 'super_admin') then
    raise exception 'staff_update_forbidden' using errcode = '42501';
  end if;
  if nullif(trim(p_full_name), '') is null or p_staff_type not in ('coach', 'assistant', 'other')
     or (p_monthly_salary is not null and p_monthly_salary < 0)
     or (p_phone_e164 is not null and p_phone_e164 !~ '^\+[1-9][0-9]{7,14}$') then
    raise exception 'invalid_staff_update' using errcode = '22023';
  end if;

  select * into v_staff from public.staff where id = p_staff_id for update;
  if v_staff.id is null then raise exception 'staff_not_found' using errcode = 'P0002'; end if;
  if v_actor.role <> 'super_admin' and v_staff.school_id <> v_actor.school_id then
    raise exception 'cross_tenant_staff_update' using errcode = '42501';
  end if;

  update public.staff
  set full_name = trim(p_full_name), staff_type = p_staff_type,
      monthly_salary = p_monthly_salary, is_active = p_is_active,
      notes = case when profile_id is null and p_phone_e164 is not null then 'Telefon: ' || p_phone_e164 else notes end
  where id = v_staff.id
  returning * into v_staff;

  if v_staff.profile_id is not null then
    update public.profiles
    set full_name = trim(p_full_name), phone = p_phone_e164, is_active = p_is_active
    where id = v_staff.profile_id and school_id = v_staff.school_id;
    if not found then raise exception 'staff_profile_mismatch' using errcode = '23503'; end if;
  end if;

  return v_staff;
end;
$$;

revoke all on function public.update_staff_record(uuid, text, text, numeric, boolean, text) from public, anon;
grant execute on function public.update_staff_record(uuid, text, text, numeric, boolean, text) to authenticated;

create or replace function public.archive_staff_record(p_staff_id uuid)
returns public.staff
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor public.profiles%rowtype;
  v_staff public.staff%rowtype;
begin
  select * into v_actor from public.profiles where id = auth.uid() and is_active = true;
  if v_actor.id is null or v_actor.role not in ('school_admin', 'super_admin') then
    raise exception 'staff_archive_forbidden' using errcode = '42501';
  end if;
  select * into v_staff from public.staff where id = p_staff_id for update;
  if v_staff.id is null then raise exception 'staff_not_found' using errcode = 'P0002'; end if;
  if v_actor.role <> 'super_admin' and v_staff.school_id <> v_actor.school_id then
    raise exception 'cross_tenant_staff_archive' using errcode = '42501';
  end if;

  update public.staff set is_active = false where id = v_staff.id returning * into v_staff;
  if v_staff.profile_id is not null then
    update public.profiles set is_active = false
    where id = v_staff.profile_id and school_id = v_staff.school_id;
    if not found then raise exception 'staff_profile_mismatch' using errcode = '23503'; end if;
  end if;
  return v_staff;
end;
$$;

revoke all on function public.archive_staff_record(uuid) from public, anon;
grant execute on function public.archive_staff_record(uuid) to authenticated;

create or replace function public.transition_application(
  p_application_id uuid,
  p_to_status text,
  p_note text default null
)
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor public.profiles%rowtype;
  v_application public.applications%rowtype;
  v_from_status text;
begin
  if p_to_status not in ('new', 'contacted', 'trial_scheduled', 'trialed', 'enrolled', 'rejected', 'no_show') then
    raise exception 'invalid_application_status' using errcode = '22023';
  end if;
  select * into v_actor from public.profiles where id = auth.uid() and is_active = true;
  select * into v_application from public.applications where id = p_application_id for update;
  if v_actor.id is null or v_actor.role not in ('school_admin', 'super_admin') then
    raise exception 'application_transition_forbidden' using errcode = '42501';
  end if;
  if v_application.id is null then raise exception 'application_not_found' using errcode = 'P0002'; end if;
  if v_actor.role <> 'super_admin' and v_actor.school_id <> v_application.school_id then
    raise exception 'cross_tenant_application_transition' using errcode = '42501';
  end if;
  if v_application.status = p_to_status then return v_application; end if;

  v_from_status := v_application.status;
  update public.applications set status = p_to_status, updated_at = now()
  where id = v_application.id returning * into v_application;
  insert into public.application_status_history (
    application_id, from_status, to_status, changed_by, note
  ) values (
    v_application.id, v_from_status, p_to_status, v_actor.id, nullif(trim(p_note), '')
  );
  return v_application;
end;
$$;

revoke all on function public.transition_application(uuid, text, text) from public, anon;
grant execute on function public.transition_application(uuid, text, text) to authenticated;

create or replace function public.accept_coach_invitation()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'coach' and is_active = true
  ) then
    raise exception 'active_coach_required' using errcode = '42501';
  end if;

  update public.staff
  set invitation_status = 'accepted', invitation_accepted_at = coalesce(invitation_accepted_at, now()),
      invitation_last_error = null
  where profile_id = auth.uid() and is_active = true;
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke all on function public.accept_coach_invitation() from public, anon;
grant execute on function public.accept_coach_invitation() to authenticated;

drop trigger if exists whatsapp_inbound_jobs_set_updated_at on public.whatsapp_inbound_jobs;
create trigger whatsapp_inbound_jobs_set_updated_at
  before update on public.whatsapp_inbound_jobs
  for each row execute function public.set_updated_at();

commit;
