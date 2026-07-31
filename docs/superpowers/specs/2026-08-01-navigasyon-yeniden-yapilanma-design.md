# Navigasyon Yeniden Yapılanması — Tasarım

**Tarih:** 2026-08-01
**Durum:** Onaylandı

## Amaç

Web panel sidebar'ını 6 öğeden (Ana Sayfa, Üyeler, Program, Finans, Hesap Ayarları, Okul Ayarları) 4 öğeye indirmek: Ana Sayfa, Üyeler, Finans, Ayarlar. `/program` sayfası kalkıyor, içeriği (Takvim, Gruplar, Yoklama, Personel) ilgili yerlere dağıtılıyor.

## Hedef Hiyerarşi

1. **Ana Sayfa (`/`)** — Bildirimler, grup kartları (+ Grup Ekle), Takvim
2. **Üyeler (`/ogrenciler`)** — Üyeler (grup bazlı filtreleme), Başvurular
3. **Finans (`/finans`)** — Aidat, Dekontlar, Giderler (+ Personel alt bölümü), Raporlar
4. **Ayarlar (`/ayarlar`)** — Okul, Hesabım

## Değişiklikler

### 1. Sidebar
`apps/web/components/layout/sidebar.tsx` — `navItems`: Ana Sayfa, Üyeler, Finans, Ayarlar (4 öğe). Alt kısımdaki okul logosu linki `/okul` yerine `/ayarlar`'a gider.

### 2. Ana Sayfa (`app/(admin)/page.tsx`)
- Mevcut: `NotificationBar` + grup kartları grid'i (aidat % ile).
- Grup kartları grid'inin üstüne `AddGroupModal` tetikleyen "Grup Ekle" butonu eklenir (`/program?tab=gruplar`'daki mantık taşınır).
- Altına Takvim eklenir: `program/ProgramClient.tsx` ve `program/actions.ts` (cancelWeekSessions, cancelDaySessions) `app/(admin)/` köküne taşınır (`ProgramClient.tsx`, isim çakışması varsa `takvim-client.tsx`), `getWeekData` çağrısı dashboard sunucu bileşenine eklenir. İçerideki `href="/program?week=..."` → `href="/?week=..."`.
- "Hızlı erişim" ve Raporlar eklenmiyor (kapsam dışı bırakıldı).

### 3. Üyeler (`app/(admin)/ogrenciler/page.tsx`)
- "Üyeler" sekmesinde, tablo üstüne grup chip/pill filtre satırı eklenir: "Tümü" + her grubun adı (aktif gruplar, `groups` sorgusu zaten sayfada mevcut).
- Seçili chip URL'e `?group_id=` olarak yazılır, sunucu tarafında `students` sorgusuna `student_groups` üzerinden filtre uygulanır.
- Mevcut `StudentFilters` (arama, telefon, durum, yaş, forma) kalır; component'teki `group_id` Select kaldırılır, chip satırıyla değiştirilir.
- "Başvurular" sekmesi değişmez.

### 4. Finans (`app/(admin)/finans/page.tsx`)
- Sekmeler aynı kalır: Aidat, Dekontlar, Giderler, Raporlar.
- Giderler sekmesine yeni "Personel" bloğu eklenir: `StaffTable` + `StaffFilters` + `AddStaffModal` (`/program?tab=personel`'den taşınır), personel verisi çekme mantığı `finans/page.tsx`'e taşınır. Altında mevcut gider tablosu (`GiderlerClient`, `AddExpenseModal`) aynen kalır.
- `/personel/[id]` detay sayfası değişmeden kalır; dönüş/link hedefleri `/finans?tab=giderler` olur.

### 5. Ayarlar (`app/(admin)/ayarlar/`)
- Yeni route: `page.tsx` + `tab-nav.tsx` (Okul / Hesabım sekmeleri, `finans/tab-nav.tsx` deseniyle aynı).
- `okul/okul-form.tsx` → `ayarlar/okul-form.tsx`, `hesabim/hesabim-client.tsx` + `actions.ts` → `ayarlar/` altına taşınır.
- Eski `/okul` ve `/hesabim` klasörleri silinir.

### 6. Grup Detay (`app/(admin)/gruplar/[id]/page.tsx`, `components/gruplar/grup-detail-tabs.tsx`)
- Yeni sekme: **"Bugünkü Yoklama"** (mevcut "Genel" sekmesinden hemen sonra).
- İçerik: o günün `attendance_sessions` kaydı bu grup için varsa `YoklamaClient` (present/absent/late/excused işaretleme) gösterilir; yoksa "Bugün planlanmış antrenman yok" mesajı.
- Bu gruptaki öğrencilere ait bekleyen izin talepleri `LeaveRequestsSection` ile gösterilir (mevcut bileşen site geneli sorgu yapıyor — gruba özel öğrenci id listesiyle filtrelenecek şekilde sayfa sorgusu güncellenir).
- `yoklama/yoklama-client.tsx`, `yoklama/leave-requests-section.tsx`, `yoklama/actions.ts` içeriği aynen kullanılır (import yolu değişebilir, mantık değişmez).

### 7. Route Temizliği
- `app/(admin)/program/` klasörü tamamen silinir.
- `gruplar/page.tsx`: redirect hedefi `/program?tab=gruplar` → `/`.
- `personel/page.tsx`: redirect hedefi `/program?tab=personel` → `/finans?tab=giderler`.
- `yoklama/page.tsx`: redirect hedefi `/program?tab=yoklama` → `/` (artık tekil karşılığı yok).
- `aidat/page.tsx`, `dekontlar/page.tsx`, `raporlar/page.tsx`: değişmeden kalır (zaten `/finans?tab=...`'a gidiyor).

## Kapsam Dışı

- "Hızlı erişim" bölümü (kullanıcı kararıyla ertelendi).
- Raporlar'ın Ana Sayfa'ya taşınması (kullanıcı kararıyla Finans'ta kalıyor).
- Coach mobil uygulamasında yoklama akışı — değişmiyor.
