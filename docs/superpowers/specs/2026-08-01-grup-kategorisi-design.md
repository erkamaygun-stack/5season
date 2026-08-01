# Grupları Spor Okulu / Altyapı Olarak Ayırma — Tasarım

**Tarih:** 2026-08-01
**Durum:** Onaylandı

## Amaç

Yönetici panelindeki gruplar tek liste yerine iki kategoriye ayrılacak: **Spor Okulu** ve **Altyapı**. Bu ayrım sadece görsel/organizasyonel — aidat hesaplama, cron işleri, RLS politikaları ve diğer iş mantığı değişmiyor.

## Veri Modeli

`groups` tablosuna yeni kolon eklenir (yeni migration):

```sql
alter table groups
  add column category text not null default 'spor_okulu'
  check (category in ('spor_okulu', 'altyapi'));
```

- Mevcut tüm gruplar migration sonrası otomatik `spor_okulu` olur; idareci yanlış olanları grup düzenleme ekranından tek tek `altyapi`'ye çevirir.
- `packages/shared/database.types.ts` içindeki `groups` tablosu tipi (`Row`/`Insert`/`Update`) elle güncellenir — `category: string` (Insert'te `category?: string` varsayılan değer olduğu için optional).
- Migration dosyası oluşturulur ama `supabase db push` bu oturumda çalıştırılmaz; canlı veritabanına uygulamak kullanıcıya bırakılır.

## Değişiklikler

### 1. Backend actions (`app/(admin)/gruplar/actions.ts`)
- `createGroup`: parametrelere `category: 'spor_okulu' | 'altyapi'` eklenir, insert'e geçirilir.
- `updateGroup`: aynı şekilde `category` parametresi eklenir, update'e geçirilir.

### 2. Grup Ekle modalı (`components/gruplar/add-group-modal.tsx`)
- Forma "Kategori" Select'i eklenir: "Spor Okulu" / "Altyapı", varsayılan `spor_okulu`.
- `createGroup` çağrısına `category` eklenir.

### 3. Grup Düzenle modalı (`components/gruplar/grup-detail-tabs.tsx` içindeki `EditGroupModal`)
- Aynı Select eklenir, mevcut grubun `category` değeriyle önceden dolu gelir.
- "Genel Bilgiler" kartındaki alan listesine (`Grup Adı`, `Antrenör`, `Aylık Ücret`, `Durum`) "Kategori" satırı eklenir (etiketler: "Spor Okulu" / "Altyapı").
- `Group` interface'ine `category: string` eklenir; sayfa sorgusuna (`gruplar/[id]/page.tsx`) `category` kolonu eklenir.

### 4. Ana Sayfa (`app/(admin)/page.tsx`)
- `groups` sorgusuna `category` kolonu eklenir.
- Gruplar `category`'ye göre iki diziye ayrılır.
- Tek "Gruplar" başlığı yerine iki ayrı başlıklı bölüm art arda: "Spor Okulu" ve "Altyapı". Her bölümün kendi kart grid'i (`grid gap-4 sm:grid-cols-2 lg:grid-cols-4`) ve kendi boş-durum mesajı ("Henüz grup eklenmedi") olur.
- "Yeni Grup" butonu (`AddGroupModal`) sayfada tek yerde, üstte kalır (hangi kategoriye ekleneceği modal içindeki Select ile belirlenir).

### 5. Üyeler sayfası filtre chip'leri (`app/(admin)/ogrenciler/page.tsx`, `components/ogrenciler/group-filter-chips.tsx`)
- `ogrenciler/page.tsx`'teki `groups` sorgusuna `category` eklenir.
- `GroupFilterChips` bileşeni `Group` interface'ine `category: string` eklenir; chip'ler "Tümü" chip'inin altında "Spor Okulu" ve "Altyapı" alt başlıklarıyla iki satıra ayrılır. Filtreleme mantığı (`?group_id=`) değişmez.

## Kapsam Dışı

- Aidat hesaplama, raporlama, cron işleri — kategoriye göre farklılaşmıyor.
- RLS politikaları — değişmiyor (kategori sadece görüntüleme amaçlı, erişim kontrolü yapmıyor).
- Mevcut gruplara toplu/otomatik doğru kategori ataması — idareci elle düzeltecek.
- `supabase db push` ile migration'ın canlı veritabanına uygulanması — bu oturumda yapılmıyor.
