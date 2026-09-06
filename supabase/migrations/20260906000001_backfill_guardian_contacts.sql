-- Preserve parent contact data before legacy parent Auth accounts are removed.
-- This migration is additive: Auth users and legacy profile/link rows are deleted
-- only after the migrated data has been verified separately.

begin;

do $$
declare
  invalid_phone_count integer;
begin
  select count(*)
    into invalid_phone_count
  from public.profiles p
  where p.role = 'parent'
    and (
      p.school_id is null
      or case
        when regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g') ~ '^90[1-9][0-9]{9}$' then '+' || regexp_replace(p.phone, '[^0-9]', '', 'g')
        when regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g') ~ '^0[1-9][0-9]{9}$' then '+90' || substring(regexp_replace(p.phone, '[^0-9]', '', 'g') from 2)
        when regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g') ~ '^[1-9][0-9]{9}$' then '+90' || regexp_replace(p.phone, '[^0-9]', '', 'g')
        else null
      end is null
    );

  if invalid_phone_count <> 0 then
    raise exception 'guardian_backfill_aborted: % parent profile(s) have an invalid school or phone', invalid_phone_count;
  end if;
end
$$;

with normalized_parents as (
  select
    p.school_id,
    p.full_name,
    case
      when regexp_replace(p.phone, '[^0-9]', '', 'g') ~ '^90[1-9][0-9]{9}$' then '+' || regexp_replace(p.phone, '[^0-9]', '', 'g')
      when regexp_replace(p.phone, '[^0-9]', '', 'g') ~ '^0[1-9][0-9]{9}$' then '+90' || substring(regexp_replace(p.phone, '[^0-9]', '', 'g') from 2)
      when regexp_replace(p.phone, '[^0-9]', '', 'g') ~ '^[1-9][0-9]{9}$' then '+90' || regexp_replace(p.phone, '[^0-9]', '', 'g')
    end as phone_e164
  from public.profiles p
  where p.role = 'parent'
)
insert into public.guardians (school_id, full_name, phone_e164, status)
select school_id, full_name, phone_e164, 'active'
from normalized_parents
on conflict (school_id, phone_e164) do update
set
  full_name = excluded.full_name,
  status = case
    when public.guardians.status = 'archived' then public.guardians.status
    else 'active'
  end,
  updated_at = now();

with normalized_parents as (
  select
    p.id as parent_profile_id,
    p.school_id,
    case
      when regexp_replace(p.phone, '[^0-9]', '', 'g') ~ '^90[1-9][0-9]{9}$' then '+' || regexp_replace(p.phone, '[^0-9]', '', 'g')
      when regexp_replace(p.phone, '[^0-9]', '', 'g') ~ '^0[1-9][0-9]{9}$' then '+90' || substring(regexp_replace(p.phone, '[^0-9]', '', 'g') from 2)
      when regexp_replace(p.phone, '[^0-9]', '', 'g') ~ '^[1-9][0-9]{9}$' then '+90' || regexp_replace(p.phone, '[^0-9]', '', 'g')
    end as phone_e164
  from public.profiles p
  where p.role = 'parent'
)
insert into public.guardian_students (guardian_id, student_id, relation, is_primary)
select
  g.id,
  ps.student_id,
  coalesce(nullif(trim(ps.relation), ''), 'parent'),
  coalesce(ps.is_primary, false)
from public.parent_student ps
join normalized_parents np on np.parent_profile_id = ps.parent_profile_id
join public.guardians g
  on g.school_id = np.school_id
 and g.phone_e164 = np.phone_e164
on conflict (guardian_id, student_id) do update
set
  relation = excluded.relation,
  is_primary = excluded.is_primary;

do $$
declare
  parent_count integer;
  migrated_parent_count integer;
  legacy_link_count integer;
  migrated_link_count integer;
begin
  select count(*) into parent_count
  from public.profiles
  where role = 'parent';

  select count(*) into migrated_parent_count
  from public.profiles p
  join public.guardians g
    on g.school_id = p.school_id
   and g.phone_e164 = case
      when regexp_replace(p.phone, '[^0-9]', '', 'g') ~ '^90[1-9][0-9]{9}$' then '+' || regexp_replace(p.phone, '[^0-9]', '', 'g')
      when regexp_replace(p.phone, '[^0-9]', '', 'g') ~ '^0[1-9][0-9]{9}$' then '+90' || substring(regexp_replace(p.phone, '[^0-9]', '', 'g') from 2)
      when regexp_replace(p.phone, '[^0-9]', '', 'g') ~ '^[1-9][0-9]{9}$' then '+90' || regexp_replace(p.phone, '[^0-9]', '', 'g')
    end
  where p.role = 'parent';

  select count(*) into legacy_link_count
  from public.parent_student ps
  join public.profiles p on p.id = ps.parent_profile_id
  where p.role = 'parent';

  select count(*) into migrated_link_count
  from public.parent_student ps
  join public.profiles p on p.id = ps.parent_profile_id and p.role = 'parent'
  join public.guardians g
    on g.school_id = p.school_id
   and g.phone_e164 = case
      when regexp_replace(p.phone, '[^0-9]', '', 'g') ~ '^90[1-9][0-9]{9}$' then '+' || regexp_replace(p.phone, '[^0-9]', '', 'g')
      when regexp_replace(p.phone, '[^0-9]', '', 'g') ~ '^0[1-9][0-9]{9}$' then '+90' || substring(regexp_replace(p.phone, '[^0-9]', '', 'g') from 2)
      when regexp_replace(p.phone, '[^0-9]', '', 'g') ~ '^[1-9][0-9]{9}$' then '+90' || regexp_replace(p.phone, '[^0-9]', '', 'g')
    end
  join public.guardian_students gs
    on gs.guardian_id = g.id
   and gs.student_id = ps.student_id;

  if migrated_parent_count <> parent_count then
    raise exception 'guardian_backfill_aborted: migrated % of % parent contacts', migrated_parent_count, parent_count;
  end if;

  if migrated_link_count <> legacy_link_count then
    raise exception 'guardian_backfill_aborted: migrated % of % student links', migrated_link_count, legacy_link_count;
  end if;
end
$$;

commit;
