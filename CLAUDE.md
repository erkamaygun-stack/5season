# 5mevsim — Halısaha Yönetim Platformu

## Proje Özeti

Tek halısaha + futbol okulu için MVP SaaS platformu. Multi-tenant mimari (sonradan başka okullara satılabilecek şekilde).

**Stack:** Supabase (Postgres + Auth + Storage + RLS) + Next.js 14 App Router (web panel) + React Native (mobil)

---

## Mimari

```
5mevsim Süper Admin Paneli (Web)
         │
┌────────┼────────┐
▼        ▼        ▼
Okul     Antrenör  Veli
Paneli   App       App
(Web)    (RN)      (RN)
         │
    Supabase (Postgres + Auth + RLS + Storage + Edge Functions)
```

### Roller

| Rol | Erişim |
|-----|--------|
| `super_admin` | Tüm okullar, abonelikler, sistem geneli |
| `school_admin` | Kendi okulu — tüm modüller |
| `coach` | Sadece kendi gruplarının yoklaması (finansal erişim yok) |
| `parent` | Sadece kendi çocukları (program, yoklama, borç, izin) |

### Multi-tenant İzolasyon

Her tablo `school_id` taşır. Postgres RLS politikaları erişimi kilitler.  
`super_admin` için `school_id = NULL`.

---

## Monorepo Yapısı

```
5mevsim/
├── apps/
│   ├── web/          # Next.js 14 App Router — okul idarecisi + süper admin paneli
│   └── mobile/       # React Native (Expo) — veli + antrenör uygulaması
├── packages/
│   └── shared/       # Ortak tipler, utils, Supabase client
├── supabase/
│   ├── migrations/   # SQL migration dosyaları
│   └── seed.sql      # Geliştirme seed verisi (1 okul, 5 antrenör, 10 öğrenci, 3 grup)
└── CLAUDE.md
```

---

## Veritabanı Şeması (Özet)

| Tablo | Açıklama |
|-------|----------|
| `schools` | Her tenant = 1 okul |
| `profiles` | Supabase auth.users ile 1-1 |
| `students` | Öğrenciler |
| `parent_student` | Veli ↔ öğrenci M-N |
| `staff` | Antrenör + ek personel |
| `staff_salary_payments` | Aylık maaş ödemeleri |
| `groups` | Antrenman grupları |
| `group_schedule_slots` | Haftalık tekrar eden slotlar |
| `student_groups` | Öğrenci-grup atamaları (geçmiş dahil) |
| `attendance_sessions` | Gerçekleşmiş/planlı oturumlar |
| `attendance_records` | Öğrenci başına yoklama satırı |
| `leave_requests` | Veli izin bildirimleri |
| `aidat_invoices` | Aylık aidat faturaları |
| `equipment_invoices` | Forma + eşofman faturaları |
| `payments` | Tahsilat kayıtları |
| `applications` | Başvuru / deneme CRM |
| `application_status_history` | CRM durum geçmişi |
| `expenses` | Giderler |
| `notification_templates` | Bildirim şablonları |
| `notification_log` | Gönderim logu |
| `audit_log` | Kim ne zaman ne yaptı |

### RLS Yardımcı Fonksiyonlar

```sql
current_school_id()  -- auth.uid() → profiles → school_id
current_role()       -- auth.uid() → profiles → role
```

---

## Otomatik İşler (Cron / Trigger)

| İş | Zaman | Açıklama |
|----|-------|----------|
| Aidat üretimi | Ayın 1'i 00:05 | Aktif öğrencilere ay faturası açar |
| İlk ay yarım aidat | Kayıt trigger | `is_prorated=true`, `amount = monthly_fee / 2` |
| Payment → invoice | Insert trigger | `paid_amount` ve `status` günceller |
| Yoklama oturumu üretimi | Her gece | Ertesi günün `attendance_sessions`'larını üretir |
| Aidat hatırlatması | Her gün 09:00 | Ay başına 5 gün kala borçlu velilere bildirim |

---

## Önemli İş Kuralları

- **Antrenör çok dar yetkili:** Sadece yoklama alır. Telefon, veli, borç, finansal hiçbir şey göremez. `student_basic_view` kullanılır.
- **İlk ay her zaman yarım aidat** — ay içinde hangi gün kaydolursa olsun.
- **WhatsApp şimdilik kapalı** — bildirimler `notification_log`'a `queued` olarak düşer; WhatsApp onaylandığında otomatik gönderilir.
- **Dekont akışı:** Veli mobilden fotoğraf gönderir → Storage'a yüklenir → İdareci panelden onaylar → `payments` insert.
- **Antrenman iptali:** `attendance_session.status = 'cancelled'`, sebep kaydedilir, idareciye bildirim gider.

---

## Web Paneli — Sayfalar

```
/ (dashboard)          — KPI kartları, bugünün programı, grafikler
/ogrenciler            — Liste + filtreler
/ogrenciler/[id]       — Detay: Genel, Veliler, Gruplar, Yoklama, Aidat, Forma, Ödemeler, Notlar
/veliler               — Liste + detay
/personel              — Liste + detay + maaş
/gruplar               — Liste + slot yönetimi
/program               — Haftalık takvim (Pzt-Paz × saat)
/yoklama               — Bugün + Geçmiş
/aidat                 — Grid tablosu (12 ay × öğrenci) + Ödeme Al modali
/basvurular            — Kanban CRM
/giderler              — Liste + kategori grafikleri
/raporlar              — Gelir-gider, borç, devamsızlık, tahsilat, doluluk
/bildirimler           — Log + şablonlar
/ayarlar               — Okul bilgileri, varsayılanlar, kullanıcılar

/super-admin/          — Ayrı layout (sadece super_admin rolü)
/super-admin/okullar
/super-admin/abonelikler
/super-admin/sistem
```

---

## Mobil Uygulama — Ekranlar

### Veli
- Login (telefon + SMS OTP)
- Anasayfa (çocuk kartları, toplam borç, bu hafta programı)
- Çocuk Detay: Program / Yoklama takvimi / Borç & Ödeme / İzin Bildir
- Bildirimler
- Profil

### Antrenör
- Login (telefon + SMS OTP)
- Anasayfa (bugünkü gruplar)
- Yoklama Ekranı (tek kritik ekran — sadece ad/foto, 4 buton)
- Antrenman İptal
- Geçmiş Yoklamalar
- Profil (maaş bilgisi görünmez)

> **Not:** Antrenör web panele giremez. Login akışında `role === 'coach'` kontrolü yapılır ve mobil app'e yönlendirilir.

---

## Geliştirme Komutları

```bash
# Supabase local başlat
supabase start

# Migration uygula
supabase db push

# Seed verisi yükle
supabase db seed

# Web geliştirme
cd apps/web && npm run dev

# Mobil geliştirme
cd apps/mobile && npx expo start

# Tip üretimi (Supabase şemasından)
supabase gen types typescript --local > packages/shared/src/database.types.ts
```

---

## Sonraya Bırakılanlar (V2+)

- Saha kiralama modülü
- Online ödeme entegrasyonu
- Antrenman fotoğraf/video paylaşımı
- Etkinlik / maç / turnuva
- WhatsApp iki yönlü bot
- Excel toplu öğrenci import (V1.1)
- Manuel toplu bildirim ekranı (V1.5)
