-- =====================================================
-- 5season Row Level Security Policies
-- =====================================================

-- Tüm tablolarda RLS aç
alter table schools enable row level security;
alter table profiles enable row level security;
alter table students enable row level security;
alter table parent_student enable row level security;
alter table staff enable row level security;
alter table staff_salary_payments enable row level security;
alter table groups enable row level security;
alter table group_schedule_slots enable row level security;
alter table student_groups enable row level security;
alter table attendance_sessions enable row level security;
alter table attendance_records enable row level security;
alter table leave_requests enable row level security;
alter table aidat_invoices enable row level security;
alter table equipment_invoices enable row level security;
alter table payments enable row level security;
alter table applications enable row level security;
alter table application_status_history enable row level security;
alter table expenses enable row level security;
alter table notification_templates enable row level security;
alter table notification_log enable row level security;
alter table audit_log enable row level security;

-- =====================================================
-- SCHOOLS
-- =====================================================
create policy "schools_super_admin_all" on schools
  for all to authenticated using (app_current_role() = 'super_admin');

create policy "schools_select_own" on schools
  for select to authenticated using (id = current_school_id());

-- =====================================================
-- PROFILES
-- =====================================================
create policy "profiles_super_admin_all" on profiles
  for all to authenticated using (app_current_role() = 'super_admin');

create policy "profiles_select_self" on profiles
  for select to authenticated using (id = auth.uid());

create policy "profiles_select_same_school" on profiles
  for select to authenticated using (
    school_id = current_school_id()
    and app_current_role() in ('school_admin','coach','parent')
  );

create policy "profiles_admin_write" on profiles
  for all to authenticated using (
    app_current_role() = 'school_admin'
    and school_id = current_school_id()
  );

-- =====================================================
-- STUDENTS
-- =====================================================
create policy "students_super_admin_all" on students
  for all to authenticated using (app_current_role() = 'super_admin');

create policy "students_admin_all" on students
  for all to authenticated using (
    app_current_role() = 'school_admin'
    and school_id = current_school_id()
  );

create policy "students_coach_read" on students
  for select to authenticated using (
    app_current_role() = 'coach'
    and school_id = current_school_id()
    and exists (
      select 1 from student_groups sg
      join groups g on g.id = sg.group_id
      join staff st on st.id = g.primary_coach_id
      where sg.student_id = students.id
        and st.profile_id = auth.uid()
        and sg.is_active = true
    )
  );

create policy "students_parent_read" on students
  for select to authenticated using (
    app_current_role() = 'parent'
    and exists (
      select 1 from parent_student ps
      where ps.student_id = students.id
        and ps.parent_profile_id = auth.uid()
    )
  );

-- =====================================================
-- PARENT_STUDENT
-- =====================================================
create policy "ps_super_admin_all" on parent_student
  for all to authenticated using (app_current_role() = 'super_admin');

create policy "ps_admin_all" on parent_student
  for all to authenticated using (
    app_current_role() = 'school_admin'
    and exists (
      select 1 from students
      where id = parent_student.student_id
        and school_id = current_school_id()
    )
  );

create policy "ps_parent_read_own" on parent_student
  for select to authenticated using (parent_profile_id = auth.uid());

-- =====================================================
-- STAFF
-- =====================================================
create policy "staff_super_admin_all" on staff
  for all to authenticated using (app_current_role() = 'super_admin');

create policy "staff_admin_all" on staff
  for all to authenticated using (
    app_current_role() = 'school_admin'
    and school_id = current_school_id()
  );

create policy "staff_coach_self" on staff
  for select to authenticated using (
    app_current_role() = 'coach'
    and profile_id = auth.uid()
  );

-- =====================================================
-- STAFF_SALARY_PAYMENTS (sadece admin)
-- =====================================================
create policy "salary_super_admin_all" on staff_salary_payments
  for all to authenticated using (app_current_role() = 'super_admin');

create policy "salary_admin_all" on staff_salary_payments
  for all to authenticated using (
    app_current_role() = 'school_admin'
    and school_id = current_school_id()
  );

-- =====================================================
-- GROUPS
-- =====================================================
create policy "groups_super_admin_all" on groups
  for all to authenticated using (app_current_role() = 'super_admin');

create policy "groups_admin_all" on groups
  for all to authenticated using (
    app_current_role() = 'school_admin'
    and school_id = current_school_id()
  );

create policy "groups_coach_own" on groups
  for select to authenticated using (
    app_current_role() = 'coach'
    and school_id = current_school_id()
    and exists (
      select 1 from staff
      where id = groups.primary_coach_id
        and profile_id = auth.uid()
    )
  );

create policy "groups_parent_read" on groups
  for select to authenticated using (
    app_current_role() = 'parent'
    and school_id = current_school_id()
    and exists (
      select 1 from student_groups sg
      join parent_student ps on ps.student_id = sg.student_id
      where sg.group_id = groups.id
        and ps.parent_profile_id = auth.uid()
    )
  );

-- =====================================================
-- GROUP_SCHEDULE_SLOTS
-- =====================================================
create policy "slots_super_admin_all" on group_schedule_slots
  for all to authenticated using (app_current_role() = 'super_admin');

create policy "slots_admin_all" on group_schedule_slots
  for all to authenticated using (
    app_current_role() = 'school_admin'
    and exists (
      select 1 from groups
      where id = group_schedule_slots.group_id
        and school_id = current_school_id()
    )
  );

create policy "slots_school_users_read" on group_schedule_slots
  for select to authenticated using (
    app_current_role() in ('coach','parent')
    and exists (
      select 1 from groups
      where id = group_schedule_slots.group_id
        and school_id = current_school_id()
    )
  );

-- =====================================================
-- STUDENT_GROUPS
-- =====================================================
create policy "sg_super_admin_all" on student_groups
  for all to authenticated using (app_current_role() = 'super_admin');

create policy "sg_admin_all" on student_groups
  for all to authenticated using (
    app_current_role() = 'school_admin'
    and exists (
      select 1 from students
      where id = student_groups.student_id
        and school_id = current_school_id()
    )
  );

create policy "sg_coach_read_own" on student_groups
  for select to authenticated using (
    app_current_role() = 'coach'
    and is_coach_for_group(group_id)
  );

create policy "sg_parent_read_own" on student_groups
  for select to authenticated using (
    app_current_role() = 'parent'
    and exists (
      select 1 from parent_student ps
      where ps.student_id = student_groups.student_id
        and ps.parent_profile_id = auth.uid()
    )
  );

-- =====================================================
-- ATTENDANCE_SESSIONS
-- =====================================================
create policy "sessions_super_admin_all" on attendance_sessions
  for all to authenticated using (app_current_role() = 'super_admin');

create policy "sessions_admin_all" on attendance_sessions
  for all to authenticated using (
    app_current_role() = 'school_admin'
    and school_id = current_school_id()
  );

create policy "sessions_coach_own" on attendance_sessions
  for all to authenticated using (
    app_current_role() = 'coach'
    and school_id = current_school_id()
    and is_coach_for_group(group_id)
  );

create policy "sessions_parent_read" on attendance_sessions
  for select to authenticated using (
    app_current_role() = 'parent'
    and school_id = current_school_id()
    and exists (
      select 1 from student_groups sg
      join parent_student ps on ps.student_id = sg.student_id
      where sg.group_id = attendance_sessions.group_id
        and ps.parent_profile_id = auth.uid()
    )
  );

-- =====================================================
-- ATTENDANCE_RECORDS
-- =====================================================
create policy "records_super_admin_all" on attendance_records
  for all to authenticated using (app_current_role() = 'super_admin');

create policy "records_admin_all" on attendance_records
  for all to authenticated using (
    app_current_role() = 'school_admin'
    and exists (
      select 1 from attendance_sessions
      where id = attendance_records.session_id
        and school_id = current_school_id()
    )
  );

create policy "records_coach_own" on attendance_records
  for all to authenticated using (
    app_current_role() = 'coach'
    and exists (
      select 1 from attendance_sessions s
      where s.id = attendance_records.session_id
        and is_coach_for_group(s.group_id)
    )
  );

create policy "records_parent_read" on attendance_records
  for select to authenticated using (
    app_current_role() = 'parent'
    and exists (
      select 1 from parent_student ps
      where ps.student_id = attendance_records.student_id
        and ps.parent_profile_id = auth.uid()
    )
  );

-- =====================================================
-- LEAVE_REQUESTS
-- =====================================================
create policy "leave_super_admin_all" on leave_requests
  for all to authenticated using (app_current_role() = 'super_admin');

create policy "leave_admin_all" on leave_requests
  for all to authenticated using (
    app_current_role() = 'school_admin'
    and school_id = current_school_id()
  );

create policy "leave_coach_read" on leave_requests
  for select to authenticated using (
    app_current_role() = 'coach'
    and school_id = current_school_id()
    and group_id is not null
    and is_coach_for_group(group_id)
  );

create policy "leave_parent_own" on leave_requests
  for all to authenticated using (
    app_current_role() = 'parent'
    and parent_profile_id = auth.uid()
  );

-- =====================================================
-- AIDAT_INVOICES
-- =====================================================
create policy "aidat_super_admin_all" on aidat_invoices
  for all to authenticated using (app_current_role() = 'super_admin');

create policy "aidat_admin_all" on aidat_invoices
  for all to authenticated using (
    app_current_role() = 'school_admin'
    and school_id = current_school_id()
  );

create policy "aidat_parent_read" on aidat_invoices
  for select to authenticated using (
    app_current_role() = 'parent'
    and exists (
      select 1 from parent_student ps
      where ps.student_id = aidat_invoices.student_id
        and ps.parent_profile_id = auth.uid()
    )
  );

-- =====================================================
-- EQUIPMENT_INVOICES
-- =====================================================
create policy "equipment_super_admin_all" on equipment_invoices
  for all to authenticated using (app_current_role() = 'super_admin');

create policy "equipment_admin_all" on equipment_invoices
  for all to authenticated using (
    app_current_role() = 'school_admin'
    and school_id = current_school_id()
  );

create policy "equipment_parent_read" on equipment_invoices
  for select to authenticated using (
    app_current_role() = 'parent'
    and exists (
      select 1 from parent_student ps
      where ps.student_id = equipment_invoices.student_id
        and ps.parent_profile_id = auth.uid()
    )
  );

-- =====================================================
-- PAYMENTS
-- =====================================================
create policy "payments_super_admin_all" on payments
  for all to authenticated using (app_current_role() = 'super_admin');

create policy "payments_admin_all" on payments
  for all to authenticated using (
    app_current_role() = 'school_admin'
    and school_id = current_school_id()
  );

create policy "payments_parent_read" on payments
  for select to authenticated using (
    app_current_role() = 'parent'
    and exists (
      select 1 from parent_student ps
      where ps.student_id = payments.student_id
        and ps.parent_profile_id = auth.uid()
    )
  );

-- =====================================================
-- APPLICATIONS (sadece admin)
-- =====================================================
create policy "apps_super_admin_all" on applications
  for all to authenticated using (app_current_role() = 'super_admin');

create policy "apps_admin_all" on applications
  for all to authenticated using (
    app_current_role() = 'school_admin'
    and school_id = current_school_id()
  );

create policy "apps_history_super_admin_all" on application_status_history
  for all to authenticated using (app_current_role() = 'super_admin');

create policy "apps_history_admin_all" on application_status_history
  for all to authenticated using (
    app_current_role() = 'school_admin'
    and exists (
      select 1 from applications
      where id = application_status_history.application_id
        and school_id = current_school_id()
    )
  );

-- =====================================================
-- EXPENSES (sadece admin)
-- =====================================================
create policy "expenses_super_admin_all" on expenses
  for all to authenticated using (app_current_role() = 'super_admin');

create policy "expenses_admin_all" on expenses
  for all to authenticated using (
    app_current_role() = 'school_admin'
    and school_id = current_school_id()
  );

-- =====================================================
-- NOTIFICATIONS
-- =====================================================
create policy "notif_template_super_admin_all" on notification_templates
  for all to authenticated using (app_current_role() = 'super_admin');

create policy "notif_template_admin_all" on notification_templates
  for all to authenticated using (
    app_current_role() = 'school_admin'
    and (school_id = current_school_id() or school_id is null)
  );

create policy "notif_log_super_admin_all" on notification_log
  for all to authenticated using (app_current_role() = 'super_admin');

create policy "notif_log_admin_all" on notification_log
  for all to authenticated using (
    app_current_role() = 'school_admin'
    and school_id = current_school_id()
  );

create policy "notif_log_self" on notification_log
  for select to authenticated using (
    recipient_profile_id = auth.uid()
  );

-- =====================================================
-- AUDIT_LOG
-- =====================================================
create policy "audit_super_admin_all" on audit_log
  for all to authenticated using (app_current_role() = 'super_admin');

create policy "audit_admin_read" on audit_log
  for select to authenticated using (
    app_current_role() = 'school_admin'
    and school_id = current_school_id()
  );
