-- =====================================================
-- 5mevsim — Antrenör student_basic_view Zorunluluğu
-- Coach'ların students tablosuna direkt erişimi kapatılır.
-- Hassas alanlar (blood_type, health_doc_url, consent_doc_url,
-- notes) yalnızca school_admin görebilir.
-- Antrenörler sadece student_basic_view üzerinden okur.
-- =====================================================

-- 1. Coach'un students tablosundaki direkt SELECT politikasını kaldır
drop policy if exists "students_coach_read" on students;

-- 2. View'u yeniden tanımla: security_invoker=false (varsayılan) → view,
--    postgres (owner) yetkisiyle çalışır; students RLS'ini bypass eder.
--    Satır filtresi view'un kendi WHERE clause'u tarafından sağlanır.
--    auth.uid() / app_current_role() session değişkenlerini okur,
--    bu yüzden bypass güvenli — sadece izin verilen satırlar döner.

create or replace view student_basic_view
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
  from students s
  where
    -- school_admin her öğrenciyi görebilir
    (app_current_role() = 'school_admin' and s.school_id = current_school_id())
    or
    -- coach sadece kendi grubundaki öğrencileri görür (students_coach_read ile aynı kural)
    (
      app_current_role() = 'coach'
      and s.school_id = current_school_id()
      and exists (
        select 1
        from student_groups sg
        join groups g on g.id = sg.group_id
        join staff st on st.id = g.primary_coach_id
        where sg.student_id = s.id
          and sg.is_active = true
          and st.profile_id = auth.uid()
      )
    )
    or
    -- parent kendi çocuğunu görür
    (
      app_current_role() = 'parent'
      and exists (
        select 1 from parent_student ps
        where ps.student_id = s.id
          and ps.parent_profile_id = auth.uid()
      )
    );

comment on view student_basic_view is
  'Hassas alanlar (blood_type, health_doc_url, consent_doc_url, notes) gizlendi. Satır filtresi view içinde; coach sadece kendi grubunu görür.';

-- 3. View'a okuma izni ver (Supabase varsayılan grant'ı bu view'u
--    kapsamayabilir; açık grant daha güvenli)
grant select on student_basic_view to authenticated;
