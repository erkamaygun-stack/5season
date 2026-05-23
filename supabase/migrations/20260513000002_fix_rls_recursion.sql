-- =====================================================
-- Fix: RLS infinite recursion
--
-- Problem: sg_admin_all EXISTS(students) → students_parent_read
--          EXISTS(parent_student) → ps_admin_all EXISTS(students) → sonsuz döngü
--
-- Fix: SECURITY DEFINER fonksiyonlar RLS'i bypass eder, döngüyü kırar.
-- =====================================================

-- Yardımcı 1: group_id'den okul kontrolü (RLS bypass)
create or replace function is_sg_in_school(p_group_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from groups where id = p_group_id and school_id = current_school_id()
  )
$$;

-- Yardımcı 2: student_id'den school_id (RLS bypass)
create or replace function get_student_school(p_student_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select school_id from students where id = p_student_id
$$;

-- sg_admin_all: students yerine SECURITY DEFINER fonksiyon
drop policy if exists "sg_admin_all" on student_groups;
create policy "sg_admin_all" on student_groups
  for all to authenticated using (
    app_current_role() = 'school_admin'
    and is_sg_in_school(group_id)
  );

-- ps_admin_all: students yerine SECURITY DEFINER fonksiyon
drop policy if exists "ps_admin_all" on parent_student;
create policy "ps_admin_all" on parent_student
  for all to authenticated using (
    app_current_role() = 'school_admin'
    and get_student_school(student_id) = current_school_id()
  );
