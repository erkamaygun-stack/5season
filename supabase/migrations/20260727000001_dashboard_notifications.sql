-- =====================================================
-- ANASAYFA BİLDİRİM ÇUBUĞU İÇİN ŞEMA EKLEMELERİ
-- =====================================================

-- Okulun aylık aidat tahsilat günü (1-28)
alter table schools add column if not exists collection_day int default 1
  check (collection_day between 1 and 28);

-- İptal edilen antrenman bildirimi idareci tarafından onaylandığında damgalanır
alter table attendance_sessions add column if not exists acknowledged_at timestamptz;

-- Devamsızlık bildirimi: veliye mesaj kuyruğa alındığında / bildirim listeden
-- kaldırıldığında damgalanır
alter table attendance_records add column if not exists notified_at timestamptz;
alter table attendance_records add column if not exists dismissed_at timestamptz;
