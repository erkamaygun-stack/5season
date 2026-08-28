-- =====================================================
-- WhatsApp-first safe foundation
-- IMPORTANT: additive schema first; no legacy parent row or Auth user is deleted.
-- Apply to isolated staging only after backup/schema-diff review.
-- =====================================================

begin;

-- -----------------------------------------------------------------------------
-- Environment/tenant quarantine and coach email invitation metadata
-- -----------------------------------------------------------------------------

alter table public.schools
  add column if not exists communications_status text not null default 'quarantined'
    check (communications_status in ('quarantined', 'active', 'suspended'));

alter table public.staff
  add column if not exists invitation_email text,
  add column if not exists invitation_status text not null default 'not_applicable'
    check (invitation_status in ('not_applicable', 'not_invited', 'suppressed', 'invited', 'accepted', 'failed')),
  add column if not exists invitation_sent_at timestamptz,
  add column if not exists invitation_last_error text;

create unique index if not exists staff_school_coach_invitation_email_uidx
  on public.staff (school_id, lower(invitation_email))
  where invitation_email is not null and staff_type = 'coach';

-- Coach accounts no longer require a phone number. Existing values are preserved.
alter table public.profiles alter column phone drop not null;

-- -----------------------------------------------------------------------------
-- Guardians are contacts, not Auth users.
-- -----------------------------------------------------------------------------

create table if not exists public.guardians (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  full_name text not null,
  phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  whatsapp_wa_id text,
  status text not null default 'active'
    check (status in ('active', 'unverified', 'blocked', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, phone_e164)
);

create unique index if not exists guardians_school_wa_id_uidx
  on public.guardians (school_id, whatsapp_wa_id)
  where whatsapp_wa_id is not null;

create table if not exists public.guardian_students (
  guardian_id uuid not null references public.guardians(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  relation text not null default 'parent',
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (guardian_id, student_id)
);

create index if not exists guardian_students_student_idx
  on public.guardian_students (student_id);

create table if not exists public.guardian_consents (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  guardian_id uuid not null references public.guardians(id) on delete cascade,
  purpose_code text not null,
  status text not null check (status in ('granted', 'revoked', 'not_required')),
  legal_basis text not null check (legal_basis in ('opt_in', 'contractual_notice', 'legal_obligation', 'other')),
  source text not null,
  evidence jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now(),
  revoked_at timestamptz,
  recorded_by uuid references public.profiles(id)
);

create index if not exists guardian_consents_lookup_idx
  on public.guardian_consents (guardian_id, purpose_code, recorded_at desc);

-- -----------------------------------------------------------------------------
-- WhatsApp provider boundary, conversations and idempotent messages
-- -----------------------------------------------------------------------------

create table if not exists public.whatsapp_channels (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  provider text not null default 'meta_cloud' check (provider in ('meta_cloud')),
  phone_number_id text not null unique,
  waba_account_id text not null,
  display_phone text,
  status text not null default 'disabled'
    check (status in ('disabled', 'test', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  channel_id uuid not null references public.whatsapp_channels(id) on delete cascade,
  guardian_id uuid references public.guardians(id) on delete set null,
  sender_wa_id text not null,
  state text not null default 'idle'
    check (state in ('idle', 'identifying', 'awaiting_student', 'awaiting_invoice', 'awaiting_receipt', 'human_handoff', 'closed')),
  service_window_expires_at timestamptz,
  human_handoff_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel_id, sender_wa_id)
);

create index if not exists whatsapp_conversations_school_state_idx
  on public.whatsapp_conversations (school_id, state, updated_at desc);

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  channel_id uuid not null references public.whatsapp_channels(id) on delete cascade,
  conversation_id uuid references public.whatsapp_conversations(id) on delete set null,
  provider_message_id text not null unique,
  direction text not null check (direction in ('inbound', 'outbound')),
  message_type text not null,
  delivery_status text not null default 'received'
    check (delivery_status in ('received', 'suppressed', 'queued', 'sent', 'delivered', 'read', 'failed')),
  media_id text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_messages_conversation_idx
  on public.whatsapp_messages (conversation_id, occurred_at desc);

-- -----------------------------------------------------------------------------
-- Receipt state machine and outbox
-- -----------------------------------------------------------------------------

create table if not exists public.receipt_submissions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  channel_id uuid not null references public.whatsapp_channels(id) on delete restrict,
  message_id uuid not null unique references public.whatsapp_messages(id) on delete restrict,
  guardian_id uuid references public.guardians(id) on delete set null,
  student_id uuid references public.students(id) on delete restrict,
  invoice_type text check (invoice_type in ('aidat', 'equipment')),
  invoice_id uuid,
  storage_bucket text not null default 'whatsapp-receipts',
  storage_path text,
  content_sha256 text check (content_sha256 is null or content_sha256 ~ '^[0-9a-f]{64}$'),
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes between 1 and 10485760),
  match_confidence numeric(4,3) check (match_confidence is null or match_confidence between 0 and 1),
  status text not null default 'received'
    check (status in ('received', 'identifying', 'awaiting_selection', 'pending_review', 'cleanup_pending', 'completed', 'failed')),
  decision text check (decision in ('approved', 'rejected')),
  decision_reason text,
  decided_by uuid references public.profiles(id),
  decided_at timestamptz,
  payment_id uuid unique references public.payments(id) on delete restrict,
  cleanup_attempts integer not null default 0 check (cleanup_attempts >= 0),
  cleanup_last_error text,
  cleaned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((invoice_type is null) = (invoice_id is null)),
  check (status <> 'pending_review' or (student_id is not null and invoice_id is not null)),
  check (decision is null or decided_at is not null)
);

create unique index if not exists receipt_submissions_content_hash_uidx
  on public.receipt_submissions (school_id, content_sha256)
  where content_sha256 is not null;

create index if not exists receipt_submissions_review_queue_idx
  on public.receipt_submissions (school_id, status, created_at)
  where status in ('pending_review', 'cleanup_pending', 'failed');

create table if not exists public.integration_outbox (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  channel_id uuid references public.whatsapp_channels(id) on delete restrict,
  guardian_id uuid references public.guardians(id) on delete set null,
  event_key text not null unique,
  purpose_code text not null,
  template_name text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'suppressed'
    check (status in ('suppressed', 'dry_run', 'pending', 'processing', 'sent', 'failed', 'cancelled')),
  suppression_reason text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz,
  locked_at timestamptz,
  last_error_code text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists integration_outbox_worker_idx
  on public.integration_outbox (status, next_attempt_at, created_at)
  where status in ('pending', 'failed');

comment on column public.integration_outbox.payload is
  'Minimum template variables only. Raw message, phone, receipt URL or document content must not be stored here.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'whatsapp-receipts',
  'whatsapp-receipts',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Deliberately no authenticated/anon storage.objects policy for whatsapp-receipts.
-- Webhook/cleanup services use server credentials; admins receive short-lived signed URLs.

-- -----------------------------------------------------------------------------
-- Disable removed parent/SMS/push surfaces without deleting legacy rows.
-- -----------------------------------------------------------------------------

select cron.unschedule('5mevsim-aidat-reminders')
where exists (select 1 from cron.job where jobname = '5mevsim-aidat-reminders');

drop function if exists public.queue_aidat_reminders();

revoke all on function public.check_mobile_phone(text) from public, anon, authenticated;
drop function if exists public.check_mobile_phone(text);

drop policy if exists "payments_parent_insert" on public.payments;
drop policy if exists "payments_parent_read" on public.payments;
drop policy if exists "students_parent_read" on public.students;
drop policy if exists "ps_parent_read_own" on public.parent_student;
drop policy if exists "groups_parent_read" on public.groups;
drop policy if exists "sg_parent_read_own" on public.student_groups;
drop policy if exists "sessions_parent_read" on public.attendance_sessions;
drop policy if exists "records_parent_read" on public.attendance_records;
drop policy if exists "leave_parent_own" on public.leave_requests;
drop policy if exists "aidat_parent_read" on public.aidat_invoices;
drop policy if exists "equipment_parent_read" on public.equipment_invoices;
drop policy if exists "notif_log_self" on public.notification_log;
drop policy if exists "profiles_update_own_push_token" on public.profiles;

drop policy if exists "receipts_authenticated_upload" on storage.objects;
drop policy if exists "receipts_authenticated_read" on storage.objects;
drop policy if exists "receipts_parent_insert" on storage.objects;
drop policy if exists "receipts_parent_select_own" on storage.objects;
drop policy if exists "receipts_admin_select" on storage.objects;
drop policy if exists "receipts_admin_delete" on storage.objects;
update storage.buckets set public = false where id = 'receipts';

drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self" on public.profiles
  for select to authenticated
  using (id = auth.uid() and public.app_current_role() in ('super_admin', 'school_admin', 'coach'));

drop policy if exists "profiles_select_same_school" on public.profiles;
create policy "profiles_select_same_school" on public.profiles
  for select to authenticated
  using (
    school_id = public.current_school_id()
    and public.app_current_role() in ('school_admin', 'coach')
  );

drop policy if exists "schools_select_own" on public.schools;
create policy "schools_select_own" on public.schools
  for select to authenticated
  using (
    id = public.current_school_id()
    and public.app_current_role() in ('school_admin', 'coach')
  );

drop policy if exists "slots_school_users_read" on public.group_schedule_slots;
create policy "slots_coach_read" on public.group_schedule_slots
  for select to authenticated
  using (
    public.app_current_role() = 'coach'
    and exists (
      select 1 from public.groups
      where id = group_schedule_slots.group_id
        and school_id = public.current_school_id()
    )
  );

-- The legacy security-definer view had an explicit parent branch and therefore
-- bypassed students RLS. Rebuild it without any parent access.
create or replace view public.student_basic_view
  with (security_invoker = false)
as
  select
    s.id,
    s.school_id,
    s.full_name,
    s.birth_date,
    s.gender,
    s.status,
    s.enrollment_date,
    s.created_at
  from public.students s
  where
    (public.app_current_role() = 'school_admin' and s.school_id = public.current_school_id())
    or
    (
      public.app_current_role() = 'coach'
      and s.school_id = public.current_school_id()
      and exists (
        select 1
        from public.student_groups sg
        join public.groups g on g.id = sg.group_id
        join public.staff st on st.id = g.primary_coach_id
        where sg.student_id = s.id
          and sg.is_active = true
          and st.profile_id = auth.uid()
      )
    );

comment on view public.student_basic_view is
  'Hassas alanları gizler; yalnızca school_admin ve kendi grupları için coach erişebilir. Parent Auth erişimi kaldırılmıştır.';

-- -----------------------------------------------------------------------------
-- RLS: contacts can be managed by admins; integration data is read-only in UI.
-- Mutations from webhook/worker use trusted server credentials.
-- -----------------------------------------------------------------------------

alter table public.guardians enable row level security;
alter table public.guardian_students enable row level security;
alter table public.guardian_consents enable row level security;
alter table public.whatsapp_channels enable row level security;
alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.receipt_submissions enable row level security;
alter table public.integration_outbox enable row level security;

create policy "guardians_super_admin_all" on public.guardians
  for all to authenticated
  using (public.app_current_role() = 'super_admin')
  with check (public.app_current_role() = 'super_admin');
create policy "guardians_school_admin_all" on public.guardians
  for all to authenticated
  using (public.app_current_role() = 'school_admin' and school_id = public.current_school_id())
  with check (public.app_current_role() = 'school_admin' and school_id = public.current_school_id());

create policy "guardian_students_super_admin_all" on public.guardian_students
  for all to authenticated
  using (public.app_current_role() = 'super_admin')
  with check (public.app_current_role() = 'super_admin');
create policy "guardian_students_school_admin_all" on public.guardian_students
  for all to authenticated
  using (
    public.app_current_role() = 'school_admin'
    and exists (
      select 1 from public.guardians g
      where g.id = guardian_students.guardian_id
        and g.school_id = public.current_school_id()
    )
  )
  with check (
    public.app_current_role() = 'school_admin'
    and exists (
      select 1 from public.guardians g
      where g.id = guardian_students.guardian_id
        and g.school_id = public.current_school_id()
    )
    and exists (
      select 1 from public.students s
      where s.id = guardian_students.student_id
        and s.school_id = public.current_school_id()
    )
  );

create policy "guardian_consents_super_admin_all" on public.guardian_consents
  for all to authenticated
  using (public.app_current_role() = 'super_admin')
  with check (public.app_current_role() = 'super_admin');
create policy "guardian_consents_school_admin_all" on public.guardian_consents
  for all to authenticated
  using (public.app_current_role() = 'school_admin' and school_id = public.current_school_id())
  with check (public.app_current_role() = 'school_admin' and school_id = public.current_school_id());

create policy "whatsapp_channels_admin_read" on public.whatsapp_channels
  for select to authenticated
  using (
    public.app_current_role() = 'super_admin'
    or (public.app_current_role() = 'school_admin' and school_id = public.current_school_id())
  );
create policy "whatsapp_conversations_admin_read" on public.whatsapp_conversations
  for select to authenticated
  using (
    public.app_current_role() = 'super_admin'
    or (public.app_current_role() = 'school_admin' and school_id = public.current_school_id())
  );
create policy "whatsapp_messages_admin_read" on public.whatsapp_messages
  for select to authenticated
  using (
    public.app_current_role() = 'super_admin'
    or (public.app_current_role() = 'school_admin' and school_id = public.current_school_id())
  );
create policy "receipt_submissions_admin_read" on public.receipt_submissions
  for select to authenticated
  using (
    public.app_current_role() = 'super_admin'
    or (public.app_current_role() = 'school_admin' and school_id = public.current_school_id())
  );
create policy "integration_outbox_admin_read" on public.integration_outbox
  for select to authenticated
  using (
    public.app_current_role() = 'super_admin'
    or (public.app_current_role() = 'school_admin' and school_id = public.current_school_id())
  );

-- -----------------------------------------------------------------------------
-- Atomic admin decision. File deletion and outbound notification remain outbox
-- side effects and never participate in the financial transaction.
-- -----------------------------------------------------------------------------

create or replace function public.review_receipt_submission(
  p_submission_id uuid,
  p_decision text,
  p_amount numeric default null,
  p_payment_method text default 'transfer',
  p_reason text default null
)
returns public.receipt_submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor public.profiles%rowtype;
  v_submission public.receipt_submissions%rowtype;
  v_payment_id uuid;
  v_invoice_valid boolean := false;
begin
  if p_decision not in ('approved', 'rejected') then
    raise exception 'invalid_receipt_decision' using errcode = '22023';
  end if;

  select * into v_actor
  from public.profiles
  where id = auth.uid() and is_active = true;

  if v_actor.id is null or v_actor.role not in ('school_admin', 'super_admin') then
    raise exception 'receipt_review_forbidden' using errcode = '42501';
  end if;

  select * into v_submission
  from public.receipt_submissions
  where id = p_submission_id
  for update;

  if v_submission.id is null then
    raise exception 'receipt_submission_not_found' using errcode = 'P0002';
  end if;
  if v_actor.role <> 'super_admin' and v_submission.school_id <> v_actor.school_id then
    raise exception 'cross_tenant_receipt_review' using errcode = '42501';
  end if;

  if v_submission.decision = p_decision and v_submission.status in ('cleanup_pending', 'completed') then
    return v_submission;
  end if;
  if v_submission.status <> 'pending_review' or v_submission.decision is not null then
    raise exception 'receipt_submission_not_pending' using errcode = '55000';
  end if;

  if p_decision = 'approved' then
    if p_amount is null or p_amount <= 0 then
      raise exception 'invalid_payment_amount' using errcode = '22023';
    end if;
    if p_payment_method not in ('cash', 'transfer', 'card', 'other') then
      raise exception 'invalid_payment_method' using errcode = '22023';
    end if;
    if v_submission.student_id is null or v_submission.invoice_type is null or v_submission.invoice_id is null then
      raise exception 'receipt_invoice_match_missing' using errcode = '23502';
    end if;

    if v_submission.invoice_type = 'aidat' then
      select exists (
        select 1 from public.aidat_invoices ai
        where ai.id = v_submission.invoice_id
          and ai.school_id = v_submission.school_id
          and ai.student_id = v_submission.student_id
      ) into v_invoice_valid;
    elsif v_submission.invoice_type = 'equipment' then
      select exists (
        select 1 from public.equipment_invoices ei
        where ei.id = v_submission.invoice_id
          and ei.school_id = v_submission.school_id
          and ei.student_id = v_submission.student_id
      ) into v_invoice_valid;
    end if;

    if not v_invoice_valid then
      raise exception 'cross_tenant_or_invalid_invoice' using errcode = '23503';
    end if;

    insert into public.payments (
      school_id,
      student_id,
      invoice_type,
      invoice_id,
      amount,
      payment_method,
      payment_date,
      receipt_url,
      received_by,
      notes
    ) values (
      v_submission.school_id,
      v_submission.student_id,
      v_submission.invoice_type,
      v_submission.invoice_id,
      p_amount,
      p_payment_method,
      current_date,
      null,
      v_actor.id,
      'WhatsApp dekont onayı'
    ) returning id into v_payment_id;
  end if;

  update public.receipt_submissions
  set decision = p_decision,
      decision_reason = nullif(trim(p_reason), ''),
      decided_by = v_actor.id,
      decided_at = now(),
      payment_id = v_payment_id,
      status = 'cleanup_pending',
      updated_at = now()
  where id = v_submission.id
  returning * into v_submission;

  insert into public.audit_log (
    school_id,
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    diff
  ) values (
    v_submission.school_id,
    v_actor.id,
    'receipt_' || p_decision,
    'receipt_submission',
    v_submission.id,
    jsonb_build_object(
      'decision', p_decision,
      'payment_id', v_payment_id,
      'cleanup_required', true
    )
  );

  insert into public.integration_outbox (
    school_id,
    channel_id,
    guardian_id,
    event_key,
    purpose_code,
    payload,
    status,
    suppression_reason
  ) values (
    v_submission.school_id,
    v_submission.channel_id,
    v_submission.guardian_id,
    'receipt-result:' || v_submission.id::text,
    'receipt_result',
    jsonb_build_object('submission_id', v_submission.id, 'decision', p_decision),
    'suppressed',
    'outbound_requires_explicit_release'
  ) on conflict (event_key) do nothing;

  return v_submission;
end;
$$;

revoke all on function public.review_receipt_submission(uuid, text, numeric, text, text)
  from public, anon;
grant execute on function public.review_receipt_submission(uuid, text, numeric, text, text)
  to authenticated;

-- updated_at trigger function already exists in the baseline migrations.
drop trigger if exists guardians_set_updated_at on public.guardians;
create trigger guardians_set_updated_at
  before update on public.guardians
  for each row execute function public.set_updated_at();

drop trigger if exists whatsapp_channels_set_updated_at on public.whatsapp_channels;
create trigger whatsapp_channels_set_updated_at
  before update on public.whatsapp_channels
  for each row execute function public.set_updated_at();

drop trigger if exists whatsapp_conversations_set_updated_at on public.whatsapp_conversations;
create trigger whatsapp_conversations_set_updated_at
  before update on public.whatsapp_conversations
  for each row execute function public.set_updated_at();

drop trigger if exists receipt_submissions_set_updated_at on public.receipt_submissions;
create trigger receipt_submissions_set_updated_at
  before update on public.receipt_submissions
  for each row execute function public.set_updated_at();

drop trigger if exists integration_outbox_set_updated_at on public.integration_outbox;
create trigger integration_outbox_set_updated_at
  before update on public.integration_outbox
  for each row execute function public.set_updated_at();

commit;
