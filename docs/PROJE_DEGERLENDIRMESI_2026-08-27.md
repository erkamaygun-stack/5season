# 5mevsim Proje Değerlendirmesi

**Tarih:** 27 Ağustos 2026  
**Ürün yönü revizyonu:** 27 Ağustos 2026 — SMS OTP kaldırıldı; antrenör girişi e-postaya, veli deneyimi WhatsApp'a taşındı.  
**İnceleme kapsamı:** Web uygulaması, mobil uygulama, Supabase migration'ları, bağlı Supabase projesi, mevcut çalışma ağacı ve yerel doğrulama komutları

## Yönetici özeti

5mevsim; futbol okullarının öğrenci, veli iletişimi, grup, program, yoklama, aidat, dekont, personel, gider ve başvuru süreçlerini tek sistemde yönetmesini hedefleyen çok kiracılı bir SaaS ürünüdür. İlk kullanım tek bir okul üzerinde kurgulanmış olsa da veri modeli başka okulların da aynı altyapıda güvenli biçimde çalışmasına göre tasarlanmıştır.

Revize edilen hedefte veli için ayrı bir uygulama ve SMS OTP bulunmaz. Okul yöneticisi web panelini, antrenör e-posta ile giriş yaptığı personel mobil uygulamasını, veli ise WhatsApp hattını kullanır. Bu sadeleşme doğru yöndedir: iki ayrı mobil kullanıcı deneyimi ve telefon Auth operasyonu yerine tek personel uygulaması ile konuşma tabanlı veli kanalı işletilir. Karşılığında WhatsApp entegrasyonu artık yardımcı özellik değil, kritik ürün altyapısı haline gelir.

Ürün yalnızca bir arayüz taslağı değildir. Veritabanı şeması, RLS politikaları, cron işleri, yönetim paneli ve gerçek Supabase verisi kullanan veli/antrenör mobil akışları önemli ölçüde geliştirilmiştir. Bununla birlikte proje bugün için **işlevsel bir iç alfa / ileri MVP prototipi** seviyesindedir; güvenli bir pilot veya üretim yayınına hazır değildir.

En güçlü taraflar kapsamlı alan modeli, rol bazlı veri izolasyonu yaklaşımı ve ana operasyon ekranlarının büyük bölümünün mevcut olmasıdır. Yayın önündeki temel engeller ise ödeme ve kimlik doğrulama güvenliği, UI-veritabanı sözleşme uyuşmazlıkları, mobil proje uyumsuzlukları, tamamlanmamış bildirim teslimatı ve otomatik test/CI eksikliğidir.

## Projeyi nasıl anlıyorum

### Ürünün bugünkü amacı

V1'in ana ürünü bir **futbol okulu operasyon platformudur**. Halı saha kiralama modülü mevcut kapsamda değildir ve proje notlarında V2'ye bırakılmıştır.

Temel kullanıcılar ve kanallar şunlardır:

| Kullanıcı | Kanal | Temel ihtiyaç |
|---|---|---|
| Okul yöneticisi | Next.js web paneli | Üyeler, gruplar, program, yoklama, finans, personel ve okul ayarları |
| Antrenör | Expo personel mobil uygulaması; e-posta ile Auth | Günlük antrenmanları görmek, yoklama almak, antrenman iptal etmek, geçmişi görmek |
| Veli | WhatsApp Business hattı; uygulama hesabı yok | Borç/hatırlatma almak, dekont göndermek, gerektiğinde öğrenci/fatura seçmek ve sonucu öğrenmek |
| Süper yönetici | Ayrı web paneli | Okulları ve ileride abonelik/sistem ayarlarını yönetmek |

Hedeflenen ana iş akışı şu şekildedir:

1. Başvuru CRM'e gelir ve deneme/kayıt sürecinden geçer.
2. Öğrenci ile veli iletişim kaydı oluşturulur, öğrenci bir gruba atanır; veli için Auth hesabı açılmaz.
3. Haftalık programdan gerçek yoklama oturumları üretilir.
4. Antrenör e-posta ile mobil uygulamaya girip yoklama alır.
5. Aidat ve ekipman faturaları oluşur; sistem WhatsApp'tan hatırlatma gönderir, veli aynı hatta dekont yollar.
6. Personel maaşları giderlere yansır; gelir-gider ve borç raporlanır.
7. Dekont telefon numarası, öğrenci ve faturayla eşleştirilir; yönetici kararı sonrası görsel temizlenir ve sonuç WhatsApp'tan iletilir.

### Önerdiğim ilk teslim hedefi

İlk hedefin, **tek okulda kontrollü pilot** olması en güvenli ve hızlı yoldur. Çok kiracılı şema ve RLS korunmalı; ancak abonelik yönetimi, otomatik okul onboarding'i ve sistem yönetimi ilk pilotun kabul koşulu yapılmamalıdır. Pilot WhatsApp hattı tek okula bağlanmalı; veri modeli baştan `phone_number_id → school_id` eşlemesini destekleyerek ileride birden çok okul/hat kullanımına açık bırakılmalıdır.

## Mevcut mimari ve kapsam

### Teknik yapı

- `apps/web`: Next.js 14 App Router, React 18, Supabase SSR, Tailwind/shadcn tabanlı okul ve süper yönetici paneli.
- `apps/mobile`: Expo SDK 54, React Native 0.81, Expo Router, TanStack Query ve doğrudan Supabase bağlantısı kullanan veli/antrenör uygulaması.
- `supabase`: 18 migration, RLS politikaları, Storage bucket'ları, cron işleri, trigger'lar ve seed verisi.
- `packages/shared`: Şu anda yalnızca ayrı bir `database.types.ts` dosyası içeriyor; web veya mobil tarafından gerçek bir ortak paket olarak kullanılmıyor.

Proje yaklaşık olarak 96 web kaynak dosyası / 11 bin satır, 29 mobil kaynak dosyası / 3 bin satır ve 1.8 bin satır SQL migration içeriyor. Bazı bileşenler çok büyümüş durumda; öğrenci detay bileşeni yaklaşık 1.750 satırdır.

### Okul yönetim paneli

Mevcut ana navigasyon dört başlıkta toplanmıştır:

- Ana Sayfa: bildirim çubuğu, Spor Okulu/Altyapı grup kartları, haftalık takvim ve grup ekleme.
- Üyeler: öğrenci listesi, grup chip'leri ve başvuru kanbanı.
- Finans: aidat, dekont, gider/personel ve temel raporlar.
- Ayarlar: okul ve hesap bilgileri.

Öğrenci, grup ve personel detay ekranları; ödeme, fatura, grup ataması, yoklama ve belge alanlarının önemli bölümü kodda mevcuttur. Eski route'lar yeni sekmelere yönlendiren uyumluluk route'ları olarak korunmuştur.

### Mobil uygulama

Mevcut kod hem veli hem antrenör route'larını içeriyor ve aktif ekranlar mock veri yerine Supabase servislerini kullanıyor. Revize hedefte parent route'ları ve servisleri kaldırılacak; `apps/mobile` antrenör odaklı bir **personel uygulamasına** dönüşecek ve ileride `(admin)` route grubu eklenebilecek şekilde korunacak. Eski `lib/mock/data.ts` dosyası aktif akışlarda kullanılmıyor; yalnızca ortak bir yoklama tipi eski `mock-data.ts` dosyasından import ediliyor.

Bugünkü veli uygulamasında çocuk listesi/detayı, program, son yoklama durumu, aidat-ekipman borcu, izin bildirimi, dekont yükleme ve bildirim listesi bulunuyor. Revize kararla veli programı, yoklama görünümü ve izin bildirimi V1 kapsamından tamamen çıkarılmıştır; WhatsApp'a taşınmayacaktır. Parent route/servis/push/Auth kodu, veli iletişim verisi güvenli migration ile `guardians` modeline alındıktan sonra kaldırılmalıdır. Antrenör tarafındaki günlük oturumlar, haftalık program, yoklama, iptal ve geçmiş ekranları korunacaktır.

### Revize veli deneyimi

Hedef akış şöyledir:

1. Sistem onaylı bir utility şablonuyla aidat/borç/hatırlatma mesajını WhatsApp'tan gönderir.
2. Veli aynı WhatsApp hattına dekont görselini yollar.
3. Webhook gönderen `wa_id`/telefon numarasını ve mesajın geldiği `phone_number_id` üzerinden okulu bulur.
4. Tek bir açık fatura varsa otomatik eşleme yapılır; birden fazla öğrenci/fatura varsa WhatsApp liste veya buton mesajıyla seçim istenir.
5. Görsel private geçici Storage alanına alınır ve admin panelinde bekleyen dekont olur.
6. Admin onaylar veya reddeder; finansal işlem atomik olarak güncellenir.
7. Görsel Storage'dan silinir; mesaj kimliği, hash, eşleme, karar, inceleyen kullanıcı ve zaman damgaları audit amacıyla tutulur.
8. Veliye WhatsApp'tan sonuç gönderilir. Karar 24 saatlik hizmet penceresinden sonra verilmişse onaylı sonuç şablonu kullanılır.

### Supabase

Bağlı projedeki 18 migration'ın tamamı yerel migration geçmişiyle eşleşiyor. Uzak şema için `supabase db lint --linked --level warning` sonucu temizdir.

Veritabanında şu altyapılar bulunuyor:

- 4 rol: `super_admin`, `school_admin`, `coach`, `parent`.
- Tenant izolasyonu için `school_id` ve RLS politikaları.
- İlk ay yarım aidat ve ekipman faturası trigger'ı.
- Aylık aidat, günlük yoklama oturumu ve aidat hatırlatma cron işleri.
- Ödeme ile fatura durumunu güncelleyen trigger.
- Maaş ödemesinden gider üreten trigger.
- Öğrenci, ödeme, aidat ve personel için audit log trigger'ları.
- Sağlık belgesi, onay belgesi, dekont, gider dekontu ve okul logosu bucket'ları.

Uzak Storage kontrolünde `receipts`, sağlık/onay belgeleri ve gider dekontu bucket'ları private; yalnızca okul logoları public görünmektedir. Bu, amaçlanan bucket görünürlüğüyle uyumludur.

## Canlı/bağlı veri hakkında gözlem

Kişisel veri içeriği okunmadan yalnızca toplu kayıt sayıları kontrol edilmiştir. Bağlı projede 1 okul, 57 öğrenci, 7 personel, 12 grup, 91 yoklama oturumu ve 58 aidat faturası vardır. Buna karşılık yoklama kaydı, ödeme, izin talebi ve bildirim logu sayıları sıfırdır. Ürün sahibi daha sonra isim ve telefonlar dahil bu kayıtların gerçek kullanıcı verisi olduğunu doğrulamıştır.

Bu nedenle bağlı proje artık demo/staging değil **korunan production-veri kaynağı** kabul edilmelidir. Geliştirme bu projede veya bu verinin ham kopyasıyla yapılmamalı; ayrı staging/local ortam schema-only migration ve sentetik seed ile kurulmalıdır. Gerçek kayıtları geçici arşiv tablolarına taşımak yerine ortamı izole etmek, dış gönderimleri karantinaya almak ve production panelini gerekirse salt okunur/maskeli moda geçirmek daha düşük risklidir.

İlk uygulama adımı herhangi bir feature geliştirmek değil; production DB ile Storage'ı ayrı ayrı yedeklemek, geri dönüşü doğrulamak ve WhatsApp/e-posta/push/SMS/webhook yollarını çoklu emniyet kilidiyle gerçek alıcılara kapatmaktır. Supabase'in veritabanı backup'ları Storage API nesnelerinin kendisini içermediğinden belgeler ayrıca yedeklenmelidir.

## Doğrulama sonuçları

| Kontrol | Sonuç | Yorum |
|---|---|---|
| Web TypeScript (`npx tsc --noEmit`) | Başarılı | Mevcut çalışma ağacı tip kontrolünden geçiyor. |
| Web production build (`npm run build`) | Başarılı | 21 route derlendi ve statik/dinamik sayfa üretimi tamamlandı. |
| Web lint (`npm run lint`) | Başarısız/yapılandırılmamış | `next lint` ESLint kurulumu için etkileşimli soru açıyor; CI'da kullanılamaz. |
| Mobil TypeScript (`npx tsc --noEmit`) | Başarısız | `coach.service.ts:182` iç içe Supabase ilişki tipinde hata veriyor. |
| Mobil Android bundle (`expo export`) | Başarılı | Metro 1.514 modülü bundle edebildi; bu, tip hatasını yakalamıyor. |
| Expo Doctor | 14/18 kontrol başarılı | Geçersiz `scheme`, eksik/çift `expo-font` ve Expo SDK sürüm uyumsuzlukları var. |
| Supabase migration eşleşmesi | Başarılı | 18 yerel migration'ın tamamı uzakta mevcut. |
| Supabase DB lint | Başarılı | Şema düzeyinde lint hatası bulunmadı. |
| Web production dependency audit | 11 bulgu | 8 yüksek, 3 orta; doğrudan bağımlılıklarda Next/PostCSS/Tailwind zinciri etkileniyor. |
| Mobil production dependency audit | 28 bulgu | 2 kritik, 14 yüksek, 11 orta, 1 düşük; önemli bölümü Expo/Metro araç zincirinden geliyor ve tek tek etki analizi gerektiriyor. |

Henüz doğrulanmayanlar:

- Gerçek kullanıcılarla `school_admin`, `super_admin` ve `coach` uçtan uca oturumları.
- Antrenör e-posta daveti, parola belirleme/sıfırlama ve özel SMTP teslimatı.
- Gerçek WhatsApp hattında şablon gönderimi, webhook, dekont alma ve sonuç bildirimi.
- iOS/Android native release build ve mağaza imzalama süreçleri.
- Tarayıcı tabanlı görsel/regresyon testi.
- Tenant'lar arası negatif yetki testleri.

## Güçlü taraflar

1. **Alan modeli olgun:** Öğrenci, veli, grup, oturum, yoklama, aidat, ekipman, ödeme, personel, maaş, gider, CRM ve bildirim tabloları birbirini tamamlıyor.
2. **RLS temel yaklaşımı doğru:** İstemcilerin Supabase'e eriştiği bir yapıda tenant ve rol izolasyonunun veritabanında ele alınmış olması değerlidir.
3. **Ana ürün yüzeyleri mevcut:** Yönetici, veli ve antrenör deneyimleri yalnızca statik mock ekranlar değildir.
4. **Otomasyon temeli kurulmuş:** Cron ve trigger'lar aidat/yoklama gibi zaman bazlı işlerin iskeletini oluşturuyor.
5. **Son yeniden yapılanma tutarlı:** Navigasyon sadeleştirilmiş, program ana sayfaya taşınmış ve grup kategorileri veri modeline kadar işlenmiştir.
6. **Web derlenebilir durumda:** Commitlenmemiş değişikliklere rağmen production build başarıyla tamamlanıyor.

## Yayın engelleyici bulgular

### P0 — Güvenlik ve veri bütünlüğü

1. **Veli hesaplarında bilinen varsayılan parola kullanılıyor.** Öğrenci ekleme action'ı yeni veli hesabını türetilmiş bir e-posta ve sabit `111111` parolasıyla oluşturuyor. Revize mimaride velinin Auth hesabı olmayacağı için bu kod tamamen kaldırılmalı; mevcut veli Auth kullanıcıları iletişim kayıtlarına güvenli migration yapıldıktan sonra açık onayla devre dışı bırakılmalıdır.

2. **Anonim telefon kontrol RPC'si e-posta döndürüyor.** SMS OTP ve veli/coach telefon girişi tamamen kaldırılacağı için `check_mobile_phone` RPC'si istemci erişimine kapatılmalı ve kullanım kalmadığında drop edilmelidir.

3. **Veli ödeme insert politikası finansal olarak yeterince sıkı değil.** Mevcut RLS, öğrencinin veliye bağlı olduğunu kontrol ediyor; fakat `amount = 0`, `school_id`, `invoice_id`, `invoice_type` ve faturanın aynı öğrenciye ait olmasını zorlamıyor. Kötü niyetli bir istemci onaysız pozitif ödeme ekleyerek fatura durumunu trigger üzerinden değiştirebilir. Dekont başvurusu doğrudan tablo insert'i yerine doğrulamalı bir RPC/Edge Function üzerinden yapılmalıdır.

4. **Eski geniş dekont Storage politikaları migration zincirinde kalıyor.** Daha dar veli/admin politikaları eklenmiş, ancak önceki `receipts_authenticated_upload` ve `receipts_authenticated_read` politikalarını düşüren bir migration yok. PostgreSQL politikaları OR ile birleştiği için bu eski politikalar uzakta manuel olarak kaldırılmadıysa tüm authenticated kullanıcılar için gereğinden geniş erişim verir. Bucket'ın kendisi uzakta private olarak doğrulandı; politika durumu ayrıca SQL düzeyinde teyit edilip idempotent migration ile düzeltilmelidir.

5. **`SECURITY DEFINER` fonksiyon yetkileri açıkça daraltılmamış.** Cron/toplu oturum üretimi gibi fonksiyonlar için `PUBLIC` execute varsayımı denetlenmeli, yalnızca gerekli roller ve servis süreçleri yetkilendirilmelidir.

6. **Service-role kullanan action'lar hedef bağını ayrıca doğrulamalı.** Özellikle `deleteStaff(staffId, profileId)` istemciden gelen `profileId` ile Auth kullanıcısı siliyor. Silinecek profilin gerçekten aynı staff kaydına ve aynı okula ait olduğu server tarafında bulunarak doğrulanmalıdır.

### P0 — Çalışan özellik ile veritabanı sözleşmesi uyuşmazlıkları

1. **Öğrenci pasif durumu uyuşmuyor:** Veritabanı `passive` kabul ederken liste, filtre ve düzenleme ekranları `inactive` yazıyor. Pasife alma işlemi constraint hatası verir.
2. **Başvuru kanban durumları uyuşmuyor:** Veritabanı `trialed`, `rejected`, `no_show` kabul ederken UI `trial_done` ve `dropped` gönderiyor. İki kolona kart taşımak veritabanında başarısız olur.
3. **Ödeme update/delete bütünlüğü eksik:** DB trigger yalnızca insert'te çalışıyor. Web action'ı aidat ödemesini manuel yeniden hesaplıyor, fakat ekipman ödemesi için aynı düzeltmeyi yapmıyor. Finansal durum zamanla yanlış kalabilir.

### P1 — Derleme, bağımlılık ve kalite kapıları

1. Mobil TypeScript hatası kapatılmalı ve mobil Auth e-posta+parola akışına çevrilmeli.
2. Expo `scheme` rakamla başladığı için geçersiz; paket sürümleri SDK 54 ile hizalı değil.
3. `expo-font` bağımlılığı eksik/çift sürümlü.
4. Güncel dependency audit bulguları yükseltme ve etki analizi gerektiriyor; özellikle eski Next.js sürümü doğrudan etkileniyor.
5. ESLint yapılandırması, otomatik testler ve CI yok.
6. İki `database.types.ts` dosyası birbirinden farklı ve ikisi de güncel şemayı tam temsil etmiyor. Web tipi `groups.category` alanını kaçırırken shared tip yeni dashboard alanlarını kaçırıyor; mobil istemci ise Database generic'i kullanmıyor.

### P1 — Ürün akışındaki eksikler

1. **WhatsApp teslimat katmanı yok:** Cron ve UI bildirim kayıtları üretebiliyor, fakat repoda WhatsApp webhook'u, outbound worker veya Meta Cloud API istemcisi yok. Yeni ürün yönünde bu katman veli deneyiminin çekirdeğidir.
2. **Süper admin kısmi:** Okullar ve şablonlar salt okunur; abonelik ve sistem sayfaları açıkça placeholder.
3. **Personel penceresi devam eden prototip:** Çalışma ağacındaki yeni detay penceresinde Düzenle ve Maaş Öde düğmeleri bağlı değil.
4. **Üye filtre bileşeni kullanılmıyor:** Arama, telefon, durum, yaş ve forma filtrelerini içeren bileşen mevcut ama güncel Üyeler sayfasında render edilmiyor.
5. **Çok adımlı işlemler transaction değil:** Öğrenci+veli iletişim kaydı+grup, personel+Auth profili, WhatsApp medya indirme+dekont eşleme+onay gibi akışlar ortada hata olduğunda kısmi kayıt bırakabilir.
6. **Hatalar sıkça boş listeye çevriliyor:** Birçok server component ve mobil servis Supabase hatasını kullanıcıya/telemetriye taşımadan `[]` veya `null` döndürüyor; boş durum ile sistem hatası ayırt edilemiyor.
7. **Tarih/saat standardı tutarsız:** Bazı yerlerde yerel tarih helper'ı, birçok yerde `toISOString().split('T')[0]` kullanılıyor. Türkiye saatinde gece 00:00–03:00 arasında gün kayması oluşabilir.

### P2 — Mimari ve bakım borcu

Proje dokümanı bütün kritik iş kurallarının Edge Function katmanında olmasını şart koşuyor; uygulama ise pratikte doğrudan Supabase sorguları, client-side yazmalar ve Next server action'larını birlikte kullanıyor. Repoda Edge Function yoktur.

Tüm basit okumaları Edge Function'a taşımak gerekli değildir. Önerilen hedef mimari şudur:

- Basit ve güvenli okumalar: doğrudan Supabase + RLS.
- Basit yönetici CRUD yazmaları: doğrulanmış Next server action + RLS.
- Finansal, ayrıcalıklı veya çok adımlı işlemler: transaction içeren Postgres RPC ya da Edge Function.
- Harici servis çağrıları ve kuyruk tüketimi: Edge Function/worker.

Kod ve mimari belgesi bu kararda birleştirilmelidir.

## Çalışma ağacının durumu

İnceleme başında 12 değiştirilmiş ve 2 izlenmeyen dosya vardı. Bunlar kullanıcı çalışması kabul edilerek değiştirilmedi veya geri alınmadı.

Devam eden değişiklikler ağırlıklı olarak şunları kapsıyor:

- Takvimde tek antrenman/gün/hafta iptal akışları.
- Grup renkleri ve sıralama iyileştirmeleri.
- Grup kategori fallback düzenlemeleri.
- Personeli ayrı sayfa yerine modal pencerede açan prototip.

Web build bu çalışma ağacıyla başarılıdır; fakat personel modalındaki bazı aksiyonlar bilinçli olarak bağlı değildir. Uygulamaya devam etmeden önce bu değişikliklerin ürün yönü olarak kabul edilmesi ve tek bir kontrollü baseline commit'inde toparlanması gerekir.

## Sonuç

5mevsim'in çekirdeği değerlidir ve yeniden yazılması gereken bir proje değildir. Veli uygulaması/SMS OTP'nin kaldırılması toplam ürün yüzeyini küçültür; buna karşılık WhatsApp webhook ve mesaj orkestrasyonu yeni bir backend iş akışı olarak dikkatle kurulmalıdır. Doğru yaklaşım, önce kimlik/veri modelini sadeleştirip güvenlik ve kalite kapılarını düzeltmek, sonra WhatsApp dekont akışını uçtan uca kurmak ve gerçek rollerle pilot doğrulaması yapmaktır.

Benim mevcut yorumumla:

- Demo ve ürün yönü göstermek için yeterli kapsam var.
- Tek okul pilotuna yaklaşmış durumda, ancak P0 maddeleri çözülmeden gerçek finansal/kişisel veriyle kullanılmamalı.
- Dış müşterilere açık çok kiracılı SaaS ve mağaza yayını için ayrıca operasyon, bildirim, test, gözlemleme ve onboarding çalışması gerekiyor.

## Kesinleşen ürün kararları

1. SMS OTP tamamen kaldırılacak.
2. Antrenörler mobil uygulamaya e-posta ile giriş yapacak.
3. Veli uygulaması kaldırılacak; veli iletişimi WhatsApp üzerinden yürütülecek.
4. WhatsApp dekontu admin onayı/reddi sonrasında geçici depodan silinecek; karar ve eşleme audit metadatası kalacak.
5. Web yönetim panelinin iş mantığı UI'dan ayrılarak ileride personel mobil uygulamasına yönetici rolü eklenmesine açık tutulacak.
6. Veli programı, yoklama geçmişi ve izin talebi V1'den çıkarılacak ve WhatsApp'a taşınmayacak.
7. Bağlı Supabase projesindeki gerçek kullanıcı verisi production verisi olarak korunacak; geliştirme ayrı ve sentetik veri içeren staging/local ortamda yapılacak.

## Kapanan plan varsayımları ve zorunlu uyum kapıları

1. Pilot tek merkezi 5mevsim WhatsApp numarasıyla başlayacak; veri modeli çoklu kanal/okulu destekleyecek.
2. Dekont için varsayılan ürün davranışı admin kararı ve başarılı audit kaydından sonra silmedir. Görsel TTK/VUK kapsamında saklanması gereken dayanak belge sayılırsa mali müşavir ve avukatın belirlediği yasal arşiv kuralı önceliklidir.
3. Meta ve Supabase üzerinden düzenli yurt dışı veri aktarımı için KVKK madde 9'a uygun sözleşmesel mekanizma yazılı olarak doğrulanmadan gerçek veli verisiyle WhatsApp açılmayacak. Sürekli entegrasyon, yalnızca velinin açık rızasına dayalı “arızi aktarım” olarak kabul edilmeyecektir.
4. Borç/tahsilat bildirimleri tanıtımdan tamamen ayrılacak. Türk mevzuatındaki ön onay istisnasına rağmen Meta'nın WhatsApp opt-in şartı ayrıca ve ispatlanabilir biçimde karşılanacaktır.
5. Gerçek veriler tablolardan geçici arşive taşınmayacak. Production ortamı izole edilecek, panel gerekirse salt okunur/maskeli olacak ve kullanıcı talimatı olmadan hiçbir dış bildirim veya production migration çalıştırılmayacaktır.
