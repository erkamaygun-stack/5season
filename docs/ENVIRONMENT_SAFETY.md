# Ortam Güvenliği

Gerçek Supabase projesinin URL ve anahtarları yalnızca yerel `.env` dosyalarında veya Cloudflare secret alanında tutulur. Bu değerler repoya, dokümana ve loglara yazılmaz.

## Yerel geliştirme

`npm run dev` hedef ortamı başlamadan önce denetler:

- Yerel Supabase hedefi yazılabilir.
- Uzak ve korunan gerçek veri hedefi varsayılan olarak salt okunur açılır.
- Tanımsız veya çelişkili ortam ayarlarında uygulama başlamaz.
- Dış gönderim açıkça etkinleştirilmedikçe kapalıdır.

Gerçek veriyi açıkça salt okunur görmek için `npm run dev:real-data:readonly` kullanılabilir. Bu mod kaydetme, silme, RPC, Storage yazma ve yönetici Auth değişikliklerini engeller.

## Canlı beta

Canlı panelde veri değişiklikleri için uygulama ortamı `production` ve veri koruma modu `false` olmalıdır. Korunan proje listesi yine tanımlı kalır; böylece aynı anahtar development veya staging etiketiyle kullanılamaz.

Beta başlangıç ayarları:

```text
NEXT_PUBLIC_APP_ENV=production
PROTECTED_DATA_MODE=false
NEXT_PUBLIC_PROTECTED_DATA_MODE=false
OUTBOUND_DELIVERY_MODE=disabled
ATTENDANCE_ENABLED=false
NEXT_PUBLIC_ATTENDANCE_ENABLED=false
```

## Dış gönderim

`OUTBOUND_DELIVERY_MODE` varsayılan olarak `disabled` kabul edilir:

- `disabled`: Gönderim sunucuda reddedilir.
- `sink`: Mesaj ağ üzerinden gönderilmeden sentetik hedefe yazılır.
- `allowlist`: Yalnızca açıkça tanımlanan test alıcılarına izin verilir.
- `production`: Aktif kulüp, hukuki dayanak ve gerekli sağlayıcı ayarları birlikte doğrulanır.

WhatsApp, SMTP, SMS veya push anahtarları yalnızca sunucu secret alanında bulunabilir. İstemciye gönderilen `NEXT_PUBLIC_` veya `EXPO_PUBLIC_` değişkenlerinde gizli anahtar tutulmaz.

## Yayın kontrolü

Yayın öncesinde lint, TypeScript, test, Next.js derlemesi ve Cloudflare derlemesi geçmelidir. Git’e eklenecek dosyalar ayrıca incelenir; `.env`, derleme çıktıları ve secret dosyaları commit edilmez.
