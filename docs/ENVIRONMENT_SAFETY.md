# Ortam ve Dış Gönderim Güvenliği

Bu proje gerçek kullanıcı verisi içeren bağlı Supabase projesini **korunan production** kabul eder. Production project ref, servis anahtarı veya kullanıcı verisi bu belgeye ve repoya yazılmaz.

## Zorunlu ortam değişkenleri

Yerel Supabase için:

```text
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local anon key>
NEXT_PUBLIC_PROTECTED_DATA_MODE=false
PROTECTED_DATA_MODE=false
OUTBOUND_DELIVERY_MODE=disabled
```

Mobil personel uygulaması aynı kilidi Expo değişkenleriyle uygular:

```text
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<local anon key>
EXPO_PUBLIC_PROTECTED_SUPABASE_PROJECT_REFS=<protected production project ref; uzak hedeflerde zorunlu>
EXPO_PUBLIC_PROTECTED_DATA_MODE=false
```

Uzak staging için ayrıca production project ref'i yalnızca secret/config olarak tanımlanır:

```text
NEXT_PUBLIC_APP_ENV=staging
NEXT_PUBLIC_PROTECTED_SUPABASE_PROJECT_REFS=<protected production project ref>
NEXT_PUBLIC_PROTECTED_DATA_MODE=false
PROTECTED_DATA_MODE=false
OUTBOUND_DELIVERY_MODE=disabled
```

`development`, `test`, `preview`, `staging` veya tanımsız bir ortam uzak Supabase URL'si kullanıyorsa `NEXT_PUBLIC_PROTECTED_SUPABASE_PROJECT_REFS` olmadan uygulama açılmaz. URL bu listedeki bir project ref'e aitse bağlantı daha ilk istemci oluşturulurken reddedilir.

## Veri koruma modu

`PROTECTED_DATA_MODE` ve `NEXT_PUBLIC_PROTECTED_DATA_MODE` açıkça `false` yapılmadığı sürece varsayılan **açıktır**. Bu mod Supabase REST, Storage, Edge Function ve Auth Admin mutasyonlarını ortak fetch sınırında engeller. Normal kullanıcı giriş/çıkış istekleri engellenmez.

Staging/local ortamında sentetik veriyle yazma testi yapılacağı zaman iki değişken de açıkça `false` olmalıdır. Production panelinde koruma kaldırılması ayrı release kararıdır.

## Dış gönderim modu

`OUTBOUND_DELIVERY_MODE` varsayılan olarak `disabled` kabul edilir:

- `disabled`: Her gönderim server tarafında reddedilir.
- `sink`: Sağlayıcı yerine yerel/sentetik sink kullanılabilir.
- `allowlist`: Yalnızca `OUTBOUND_RECIPIENT_ALLOWLIST` içindeki test alıcılarına izin verir.
- `production`: Yalnızca production ortamı, aktif tenant ve doğrulanmış izin/hukuki dayanak birlikte varsa değerlendirilebilir.

Production Meta, SMTP, SMS veya push kimlik bilgileri local/staging ortamına eklenmez. Karantina sırasında bastırılmış olaylar daha sonra otomatik olarak yeniden oynatılmaz.
