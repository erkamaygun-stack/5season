-- A school administrator may also use the coach app when the same profile is
-- explicitly linked to an active coach staff record in the same school.

begin;

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
    select 1
    from public.profiles p
    join public.staff s
      on s.profile_id = p.id
     and s.school_id = p.school_id
     and s.staff_type = 'coach'
     and s.is_active = true
    where p.id = auth.uid()
      and p.role in ('coach', 'school_admin')
      and p.is_active = true
  ) then
    raise exception 'active_coach_assignment_required' using errcode = '42501';
  end if;

  update public.staff s
  set invitation_status = 'accepted',
      invitation_accepted_at = coalesce(s.invitation_accepted_at, now()),
      invitation_last_error = null
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active = true
    and p.role in ('coach', 'school_admin')
    and s.profile_id = p.id
    and s.school_id = p.school_id
    and s.staff_type = 'coach'
    and s.is_active = true;

  get diagnostics v_updated = row_count;
  return v_updated >= 1;
end;
$$;

revoke all on function public.accept_coach_invitation() from public, anon;
grant execute on function public.accept_coach_invitation() to authenticated;

comment on function public.accept_coach_invitation() is
  'Accepts coach app access for an active coach or school administrator with an active same-school coach staff assignment.';

commit;
