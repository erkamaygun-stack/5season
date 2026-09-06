# 5mevsim

Futbol okulları için yönetim platformu. Güncel beta, tek kulübün gerçek verileriyle çalışan web yönetim panelidir.

## Beta kapsamı

- Öğrenci ve veli iletişim bilgileri
- Grup, program ve personel yönetimi
- Aidat, ödeme, gider ve finans raporları
- Başvuru takibi
- Kulüp yöneticisi ve üst yönetici rolleri

Mobil antrenör uygulaması sonraki aşamaya ertelenmiştir. Yoklama alma ve veli iletişimi beta başlangıcında kapalıdır.

## Teknoloji

- Web: Next.js 16, React 19 ve TypeScript
- Veri ve kimlik: Supabase/PostgreSQL, Auth, Storage ve RLS
- Yayın: Cloudflare Workers
- Mobil: Expo/React Native

## Yerel geliştirme

Node.js 22 ve npm kullanılır.

```powershell
cd apps/web
npm ci
npm run dev
npm run check
```

Cloudflare paketi ayrıca şu komutla doğrulanır:

```powershell
npm run build:cloudflare
```

Mobil uygulama yeniden ele alındığında:

```powershell
cd apps/mobile
npm ci
npm run typecheck
```

## Güvenlik

Ortam anahtarları repoya yazılmaz. Yerel geliştirme uzak gerçek veri hedefine bağlanırsa varsayılan olarak salt okunur çalışır. Dış mesaj gönderimi `OUTBOUND_DELIVERY_MODE=disabled`, yoklama alma ise `ATTENDANCE_ENABLED=false` ile kapalı tutulabilir.

Ayrıntılar [ortam güvenliği belgesinde](docs/ENVIRONMENT_SAFETY.md), beta kullanım adımları [web pilot rehberinde](docs/WEB_PILOT_REHBERI.md), gelecekteki WhatsApp kurulumu [operasyon rehberinde](docs/WHATSAPP_OPERATIONS_RUNBOOK.md) bulunur.

## Dizinler

- `apps/web`: Yönetim paneli
- `apps/mobile`: Ertelenen antrenör uygulaması
- `supabase/migrations`: Veritabanı şema geçmişi
- `supabase/seed.sql`: Yalnızca yerel/sentetik başlangıç verisi
