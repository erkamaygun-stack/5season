# 5mevsim Ürünleştirme Planı — WhatsApp Merkezli Revizyon

**Tarih:** 27 Ağustos 2026  
**Durum:** Güvenli gece paketi yerel branch'te tamamlandı; migration uygulaması, staging, production ve gerçek gönderim kapalı
**Başlangıç varsayımı:** İlk hedef tek okulda kontrollü pilot; çok kiracılı altyapı korunur.  
**Kural:** Production Supabase, gerçek veri, dış bildirim, deploy ve push ancak ayrıca ve açıkça yetkilendirilmiş release sürecinde ele alınır.

## 0. Uygulama durumu — 28 Ağustos 2026

Bu planın ilk güvenli paketi `codex/safe-overnight-20260828` branch'inde, yalnızca yerel kod ve sentetik/localhost yapılandırmasıyla uygulanmıştır.

Tamamlananlar:

- Production hedefini development/preview/staging'de fail-closed engelleyen ortam doğrulaması ve varsayılan açık veri koruma modu.
- Varsayılan kapalı dış-gönderim policy'si; yalnızca `disabled` ve ağ çağrısı yapmayan `sink` WhatsApp sağlayıcısı.
- Mobil SMS OTP, veli route/servisleri, push/dekont bağımlılıkları ve sabit veli parolası akışının kaldırılması.
- Antrenör mobil uygulamasının e-posta/parola girişine geçirilmesi; personel davet metadatası ve güvenli davet sınırı.
- Auth hesabı olmayan `guardians` modeli, WhatsApp kanal/konuşma/mesaj, bekleyen dekont ve outbox şeması.
- Bekleyen dekont admin inceleme ekranı, atomik ödeme/dekont karar RPC'si ve karar sonrası `cleanup_pending` akışı.
- Öğrenci/personel için fiziksel silme yerine arşivleme; ödeme yazmalarında tenant doğrulayan RPC ve iptal kaydı.
- Web build/typecheck, 11 güvenlik testi; mobil Expo Doctor 18/18, typecheck ve Android bundle export doğrulaması.

Bilerek tamamlanmayan ve kapalı kalanlar:

- Migration hiçbir veritabanına uygulanmadı. Docker motoru WSL2/sanallaştırma eksikliği nedeniyle çalışmadığından gerçek PostgreSQL migration/RLS testi yapılmadı.
- Legacy veli/telefon verisi okunmadı, kopyalanmadı veya silinmedi. Yeni şema migration'ı eski satırları korur; panel yeni `guardians` modelini kullanır.
- Meta webhook'u, canlı sağlayıcı, worker, Storage temizleme işi, SMTP teslimatı ve gerçek alıcı gönderimi uygulanmadı/açılmadı.
- Hukuk ve uyum kapısı kapanmadı; Meta/Supabase yurt dışı aktarım mekanizması ile dekont saklama sınıflandırması yazılı onay bekler.
- Production deploy, migration, veri erişimi, dış mesaj ve git push yapılmadı.

Ayrıntılı sonuç ve kalan kapılar: `docs/GECE_CALISMA_RAPORU_2026-08-28.md` ve `docs/STAGING_RELEASE_CHECKLIST.md`.

## 1. Onaylanan ürün yönü

1. SMS OTP bütünüyle kaldırılacak; SMS sağlayıcısı ve telefonla Auth akışı kullanılmayacak.
2. Antrenörler yönetici tarafından davet edilecek ve e-posta/parola ile giriş yapacak.
3. Veli için mobil uygulama ve kullanıcı hesabı olmayacak; veli iletişimi WhatsApp üzerinden yürütülecek.
4. Aidat/borç/hatırlatma, dekont gönderimi, öğrenci/fatura seçimi ve sonuç bildirimi WhatsApp akışında tamamlanacak.
5. Dekont admin onayı veya reddinden sonra depodan silinecek; denetim için görselin kendisi yerine hash ve işlem metadatası tutulacak.
6. Web admin bugün ana yönetim yüzeyi olacak; iş kuralları web bileşenlerine gömülmeyerek gelecekte mobil admin istemcisi eklenebilecek.
7. Veli uygulamasındaki program görüntüleme, yoklama geçmişi ve izin talebi V1'den tamamen çıkarılacak; WhatsApp'a da taşınmayacak.

## 2. Kapanan kapsam kararları ve sabit varsayımlar

Bu plan açısından açık ürün kararı kalmamıştır:

1. Program, yoklama geçmişi ve izin talebi veli kanalından çıkarılmıştır.
2. İlk pilot tek 5mevsim WhatsApp numarasıyla çalışacaktır; veri modeli birden fazla okul/numarayı baştan destekleyecektir.
3. Dekont görseli admin kararı ve başarılı denetim kaydı sonrasında silinecektir. Muhasebe/hukuk incelemesi görselin kanunen saklanması gereken bir belge olduğunu belirlerse otomatik silme yerine ilgili yasal saklama süresi uygulanır; bu kontrol canlıya çıkış kapısıdır.
4. Teknik tercih doğrudan Meta WhatsApp Cloud API'dir. KVKK yurt dışı aktarım mekanizması sözleşmesel olarak kurulamıyorsa sağlayıcı seçimi yeniden yapılır ve canlı WhatsApp kullanımı başlatılmaz.

## 3. Hedef mimari

```text
Web admin (bugün) ───────┐
                         ├─> Ortak komut/API/RPC katmanı ─> Supabase DB
Mobil personel (bugün) ──┤                               └> Private Storage
Mobil admin (gelecek) ───┘

WhatsApp Cloud API
    │ webhook
    v
Edge Function / entegrasyon servisi
    ├─> kanal + veli eşleme
    ├─> konuşma/dekont durum makinesi
    ├─> private geçici dosya alanı
    └─> outbox/worker ─> WhatsApp mesajları
```

### Mimari kurallar

- WhatsApp sağlayıcısı doğrudan UI kodundan çağrılmayacak; değiştirilebilir bir sağlayıcı arayüzünün arkasında tutulacak.
- Pilot için doğrudan Meta WhatsApp Cloud API önerilir. Ek bir BSP ancak operasyon, destek veya yerel faturalama ihtiyacı doğarsa seçilir.
- Tenant, gönderen telefonundan değil webhook'taki `phone_number_id` kanalından belirlenecek.
- Gelen her WhatsApp mesajı `wamid` ile idempotent işlenecek; tekrar teslim aynı ödeme/dekontu üretmeyecek.
- Kritik finansal değişiklikler transaction/RPC ile yapılacak. WhatsApp ve Storage gibi dış sistem adımları DB transaction'ına sokulmayacak; outbox ve telafi/tekrar deneme işleri kullanılacak.
- Native uygulamaların kullanamayacağı Next.js server action'ları tek iş kuralı arayüzü olmayacak.
- Yetki yalnızca arayüzde gizlenmeyecek; RLS, RPC veya API katmanında rol ve tenant ile zorlanacak.

## 4. Önerilen veri modeli

Kesin kolonlar migration hazırlığında mevcut şemaya göre netleştirilecek.

### Kimlik ve ilişkiler

- `profiles`: yalnızca giriş yapan `school_admin`, `super_admin` ve `coach` kullanıcıları.
- `guardians`: okul, E.164 biçiminde telefon, WhatsApp `wa_id`, durum ve iletişim tercihleri. Auth hesabı değildir.
- `guardian_students`: bir velinin birden fazla öğrenciye, bir öğrencinin birden fazla veliye bağlanması.
- `whatsapp_channels`: `phone_number_id`, WABA bilgisi, bağlı okul, durum ve şablon yapılandırması.
- `guardian_consents`: izin/ret zamanı, kaynak, kapsam ve kanıt kaydı.

### Mesaj ve dekont işleme

- `whatsapp_conversations`: gönderen, kanal, mevcut adım, 24 saatlik hizmet penceresi ve insan desteğine aktarım durumu.
- `whatsapp_messages`: Meta mesaj kimliği, yön, tür, teslimat durumu ve minimum gerekli metadata.
- `receipt_submissions`: gönderen, öğrenci/fatura, geçici dosya yolu, hash, durum, karar ve denetim alanları.
- `integration_outbox`: gönderilecek mesaj, tekrar deneme sayısı, sonraki deneme zamanı ve son hata.

Önerilen dekont durumları:

```text
received
  -> identifying
  -> awaiting_selection
  -> pending_review
  -> approved | rejected
  -> cleanup_pending
  -> completed
```

## 5. Gerçek kullanıcı verisi koruma ve iletişim karantinası

**Öncelik:** Uygulama başlamadan önce zorunlu P0  
**Kapsam:** Mevcut isim, telefon, e-posta, öğrenci/veli ilişkileri, Auth kayıtları, finansal kayıtlar ve Storage nesneleri

### Temel karar

Mevcut bağlı Supabase projesi bundan sonra **korunan production-veri kaynağı** kabul edilecek. Gerçek kayıtlar geçici arşiv tablolarına taşınmayacak ve ilişkiler bozulmayacak; geliştirme paneli production'a bağlanmayacağı için kayıtlar fiilen geliştirme yüzeyinden kaldırılmış olacak. Veriyi tablo tablo taşımak geri yükleme, foreign key, RLS ve Auth eşleşmesi riski yarattığından önerilmez.

Production panelinin erişilebilir kalması gerekiyorsa panel `PROTECTED_DATA_MODE` ile salt okunur/kapalı tutulacak; telefon ve e-posta varsayılan olarak maskelenecek. Yetkili kişinin veriyi daha sonra yeniden kullanması için bir geri taşıma gerekmeyecek, yalnızca koruma modu kontrollü biçimde kaldırılacak.

### 5.1 Ortam ayrımı ve erişim sınırı

1. Mevcut Supabase project ref, bölge, plan, backup durumu ve bağlı deployment'ları **production** olarak envantere kaydet; gerçek project ref'i dokümana veya repoya yazma.
2. Local geliştirme ve staging için ayrı Supabase projesi ya da local Supabase kullan. Staging yalnızca migration'lardan üretilmiş şema ve sentetik seed içersin.
3. Yerel `.env`, preview deployment ve geliştirici CLI bağlantısı varsayılan olarak yalnızca staging/local hedeflesin. Production `service_role`, DB parolası, Meta token'ı ve SMTP anahtarı geliştirici makinelerinde bulunmasın.
4. Production erişimini owner/az sayıda yetkiliyle sınırla; MFA, ayrı kişisel hesap, kısa ömürlü erişim ve düzenli yetki incelemesi uygula. Ortak hesap kullanma.
5. Production migration'ları yerel makineden ad hoc çalıştırma. Staging doğrulaması sonrası yalnızca korumalı CI işi veya açıkça onaylanmış tek seferlik release prosedürü kullan.
6. Uygulama başlarken ortam kimliğini doğrulasın. `development/preview` build'i production Supabase URL'si görürse fail-fast ile açılamasın.

### 5.2 Değişiklik öncesi yedek ve geri dönüş

1. İlk kod/şema değişikliğinden önce production veritabanı için zaman damgalı managed backup veya mantıksal dump al; plan uygunsa değişiklik dönemi boyunca PITR etkinleştir.
2. Supabase veritabanı backup'larının Storage API nesnelerini içermediğini kabul et. Private bucket nesnelerini metadata, bucket ayarları ve object checksum manifest'iyle ayrıca yedekle.
3. Auth, database, Storage, Edge Function secret/config ve cron/webhook yapılandırmalarının hangi araçla geri döneceğini ayrı runbook'ta yaz; tek bir DB dump'ını “tam yedek” sayma.
4. Yedekleri workspace/repo veya kişisel Downloads klasöründe tutma. Şifreli, erişim loglu, production ile aynı KVKK aktarım/saklama kurallarına tabi korumalı alanda sakla; şifreleme anahtarını yedekten ayrı tut.
5. Her yedek için kaynak ortam, saat dilimi, tablo/kayıt sayıları, migration sürümü, Storage nesne sayısı/boyutu, checksum ve sorumlu kişiyi manifest'e yaz.
6. Geri dönüşü yalnızca dokümanda varsayma: dış iletişim kimlik bilgileri bulunmayan izole recovery ortamına restore testi yap ve örnek ilişkiler/nesnelerle doğrula. Restore edilen gerçek kopyayı test biter bitmez kayıtlı imha prosedürüyle kaldır.

### 5.3 Geliştirme ve test verisi

1. Varsayılan yöntem schema-only migration + tamamen sentetik seed'dir. Gerçek isim, telefon, e-posta, adres, dekont, sağlık/onay belgesi veya serbest metin local/staging'e kopyalanmaz.
2. Telefon alanlarında gerçek bir aboneye yönlenebilecek “rastgele gerçekçi” numara kullanma. Dış gönderim gerektiren testler yalnızca Meta'nın tanımlı test numarası ve ekip allowlist'iyle yapılır; diğer sentetik değerler gönderilemez biçimde olur.
3. Üretim veri şekline zorunlu olarak ihtiyaç duyulursa ham kopyayı geliştiriciye açma. İzole ve dış ağ gönderimi kapalı bir işlemde geri döndürülemez sanitizasyon uygula; geliştirici yalnızca temizlenmiş çıktıyı görsün.
4. Sanitizasyon en az ad/soyad, telefon, e-posta, adres, doğum tarihi, serbest metin, dosya adı/path, Auth metadata, audit payload ve mesaj içeriğini kapsasın. Belge/dekont nesneleri staging'e hiç alınmasın.
5. İlişkisel testler için aynı girdiyi aynı sentetik değere çeviren deterministik eşleme kullanılabilir; eşleme anahtarı ve orijinal-sentetik karşılık tablosu çıktı ortamında tutulmaz.
6. Sanitizasyon sonrası orijinal telefon/e-posta HMAC kümeleriyle otomatik çakışma kontrolü yap; herhangi bir eşleşmede seed/release başarısız olsun. Loglarda yalnızca sayısal sonuç bulunsun, gerçek değer yazılmasın.

### 5.4 Dış bildirimler için çoklu emniyet kilidi

Tek bir UI butonunu gizlemek yeterli değildir. WhatsApp, e-posta, eski push/SMS kodu ve harici webhook gönderimi aşağıdaki bağımsız kilitlerin tamamı açılmadan gerçekleşemez:

1. **Ortam kilidi:** `OUTBOUND_DELIVERY_MODE=disabled|sink|allowlist|production` değerinin varsayılanı `disabled` olsun. Değer DB'de değil deployment secret/config katmanında dursun; DB restore edilmesi kilidi açamasın.
2. **Kimlik bilgisi kilidi:** Local/preview/staging'de production Meta, SMTP, SMS veya push anahtarı bulunmasın. Staging ayrı test WABA/SMTP sandbox kullansın.
3. **Alıcı kilidi:** Production dışındaki ortamlarda worker yalnızca kodda değil güvenli ortam ayarında bulunan küçük ekip allowlist'ine gönderim yapabilsin; diğer bütün alıcılar fail-closed reddedilsin.
4. **Tenant kilidi:** Okul için `communications_status = quarantined` varsayılanı kullanılsın. Production gönderimi ancak sistem modu ve tenant modu birlikte açıldığında mümkün olsun.
5. **Kuyruk kilidi:** Quarantine sırasında cron/outbox olayları dış sağlayıcıya gitmesin; `suppressed`/`dry_run` olarak neden ve sayımla kaydedilsin. Kilit açıldığında eski birikmiş olaylar otomatik gönderilmesin, açıkça iptal edilsin veya yeniden onaylansın.
6. **UI kilidi:** Production koruma modunda toplu gönder, davet e-postası, hatırlatma ve yeniden dene aksiyonları gizlenmekle kalmasın; server tarafı da `403/blocked_by_safety_mode` döndürsün.
7. **Son alıcı doğrulaması:** Sağlayıcı çağrısından hemen önce ortam, tenant, amaç kodu, opt-in, suppression ve allowlist kontrolleri tek merkezî policy fonksiyonunda tekrar yapılsın.
8. **Test:** Gerçek veri kümesindeki telefon/e-posta hash'lerinden seçilen kontrollü örneklerle, hiçbir kişisel değeri loglamadan, staging ve quarantine production gönderimlerinin bloke edildiğini otomatik doğrula.

Bu kilitler kullanıcı açıkça gerçek bildirim pilotuna geçilmesini istemeden `production` moduna alınmayacak.

### 5.5 Production veri değişikliği güvenliği

1. İlk uygulama paketinde production için genel yazma dondurması uygula; geliştirme, manuel panel denemesi ve E2E testleri production'da yapılmasın.
2. Her production migration öncesinde backup/PITR noktası, schema diff, etkilenecek satır tahmini, geri alma veya ileri düzeltme adımı ve sorumlu kişi kayıt altına alınsın.
3. `DROP`, `TRUNCATE`, toplu `DELETE/UPDATE`, Auth user silme ve Storage recursive delete komutlarını ayrı destructive-change incelemesine bağla. Hedef ID/tenant ve beklenen satır sayısı açıkça doğrulanmadan çalıştırma.
4. Veri migration'larını küçük, idempotent ve mümkünse eklemeli yap: önce yeni şema, sonra kopyala/doğrula, uygulamayı geçir, en son eski alanı kaldır.
5. Veli Auth kullanıcıları ile eski parent tabloları yalnızca `guardians` geçişinde kaynak/hedef sayıları, ilişki bütünlüğü, örnek kontroller ve geri dönüş doğrulandıktan sonra devre dışı bırakılacak. Fiziksel silme ayrıca kullanıcı talimatı gerektirir.
6. Migration öncesi/sonrası okul, öğrenci, veli ilişkisi, personel, fatura, ödeme ve Storage nesne sayıları karşılaştırılsın; beklenmeyen farkta release durdurulsun.
7. Production'da çalıştırılan her ayrıcalıklı işlem için aktör, zaman, amaç, migration/commit ve etki özeti audit kaydına yazılsın.

### 5.6 Panelde görünürlük

1. Development ve staging paneli yalnızca sentetik veriyi gösterir; gerçek kullanıcılar bu panellerden tamamen kaybolmuş olur.
2. Production web paneli pilot başlayana kadar kapatılabilir veya salt okunur `PROTECTED_DATA_MODE` kullanabilir. Bu modda PII varsayılan maskeli, export ve mutasyonlar kapalıdır.
3. Zorunlu destek erişiminde `pii_view` gibi ayrı capability, gerekçe girişi, kısa süreli yetki ve görüntüleme audit'i kullanılır.
4. Veriyi “saklamak” için uygulama tablolarından arşiv tablosuna taşımak yerine production ortamını izole et. Bu sayede daha sonra aynı ilişkiler ve geçmiş korunarak kontrollü biçimde yeniden kullanılabilir.

**Kabul ölçütleri:**

- Local, preview ve staging hiçbir production secret veya gerçek kullanıcı verisi içermiyor.
- Ayrı staging/local şema sentetik seed ile çalışıyor; gerçek telefon/e-posta çakışma taraması temiz.
- Production DB ve tüm Storage nesneleri için şifreli yedek, manifest ve başarılı izole restore kanıtı var.
- Staging ve production quarantine modunda WhatsApp/e-posta/push/SMS/webhook çağrıları gerçek alıcılara ulaşamıyor; server-side negatif testler geçiyor.
- Production veri sayıları ve ilişkileri korunmuş; hiçbir veli/öğrenci/Auth kaydı taşınmamış, devre dışı bırakılmamış veya silinmemiş.
- Gerçek bildirim ve production yazma kilitleri yalnızca ayrı kullanıcı talimatı ve kayıtlı release kontrolüyle açılabiliyor.

## 6. Faz 0 — Kapsam ve güvenli baseline

**Öncelik:** P0  
**Tahmini efor:** 0,5–1 gün

1. Bölüm 2'deki sabit kapsamı README ve mimari karar kayıtlarına geçir.
2. Çalışma ağacındaki mevcut kullanıcı değişikliklerini iş bazında ayır ve koru.
3. Pilot tenant, test kullanıcıları ve test numaralarını belirle.
4. Bağlı Supabase projesinin geliştirme, staging veya production niteliğini doğrula.
5. Mevcut şema, RLS, Storage politikaları ve canlı veri için geri dönüş noktası oluştur.
6. WhatsApp entegrasyonu ve Auth dönüşümü için kısa mimari karar kayıtlarını ekle.

**Kabul ölçütü:** Pilot kapsamı, dış sistemler ve geri dönüş sınırı yazılı; mevcut kullanıcı işi kaybolmadan baseline doğrulanmış olmalı.

## 7. Faz 1 — Auth ve veli modelini sadeleştir

**Öncelik:** P0  
**Tahmini efor:** 2–4 gün

### 7.1 Antrenör e-posta girişi

1. Personel oluştururken antrenör e-postasını zorunlu ve okul içinde benzersiz yap.
2. Yalnızca güvenilir server kodundan Supabase davet akışı çalıştır; istemcide service-role anahtarı kullanma.
3. Davet bağlantısında parola belirleme, süresi dolmuş bağlantı ve yeniden davet akışlarını ekle.
4. E-posta/parola girişi ve parola sıfırlamayı mobil personel uygulamasına bağla.
5. Üretim için özel SMTP, gönderen alan adı ve Auth redirect allowlist'i yapılandır.
6. Açık self-signup'ı kapalı tut; Auth kullanıcısını `staff` kaydı ve okul üyeliğiyle server tarafında eşleştir.

### 7.2 SMS ve veli Auth temizliği

1. Mobil telefon/OTP ekranlarını, servislerini ve bağımlılıklarını kaldır.
2. Supabase telefon sağlayıcısını ve artık kullanılmayan `check_mobile_phone` gibi keşif RPC'lerini kapat.
3. Yeni veli oluştururken Auth hesabı ve sabit parola üretimini kaldır.
4. Mevcut veli profil verisini `guardians` ve `guardian_students` tablolarına güvenli migration ile taşı.
5. Eski veli Auth kullanıcılarını önce devre dışı bırak; doğrulama ve açık onay sonrasında silme adımını ayrıca uygula.
6. Parent route, program/yoklama/izin/dekont servisleri ve veli push-token kodunu veri geçişi doğrulandıktan sonra kaldır.

**Kabul ölçütleri:**

- Antrenör davet, parola belirleme, giriş ve sıfırlama akışlarını e-posta ile tamamlıyor.
- SMS OTP ve sabit veli parolası yok.
- Veli telefon/öğrenci ilişkileri veri kaybı olmadan Auth'tan bağımsız çalışıyor.
- Anonim kullanıcı telefon veya e-posta varlığını sorgulayarak hesap keşfi yapamıyor.

## 8. Faz 2 — WhatsApp entegrasyon temeli

**Öncelik:** P0  
**Tahmini efor:** 3–5 gün; Meta işletme/şablon onay süreleri hariç

1. Meta Business Portfolio, WABA, uygulama ve pilot numarayı hazırla.
2. Kalıcı erişim belirtecini yalnızca server secret alanında sakla; düzenli anahtar yenileme prosedürü yaz.
3. `whatsapp_channels` ile `phone_number_id -> school_id` eşlemesini kur.
4. Webhook doğrulama challenge'ı, imza doğrulaması, ham gövde kaydı ve hızlı `2xx` dönüşünü uygula.
5. Gelen mesajları kuyruğa al; `wamid` unique constraint'iyle tekrar teslimi güvenli yap.
6. Outbox/worker, teslimat durumları, üstel retry ve dead-letter/manual retry akışını kur.
7. Aşağıdaki utility şablonlarını hazırlayıp Meta onayına gönder:
   - Aidat/borç hatırlatması.
   - Dekont onaylandı.
   - Dekont reddedildi ve gerekçe.
   - Eşleşme bulunamadı / insan desteği.
8. Opt-in, opt-out ve iletişim tercihi kaydını ekle; `DUR` benzeri vazgeçme mesajlarını işle.
9. Otomasyondan insan desteğine açık aktarım ve admin operasyon kuyruğu oluştur.
10. Bölüm 9'daki hukuk ve uyum kapısını tamamlamadan gerçek veli verisiyle gönderim açma.

**Kabul ölçütleri:**

- İmzalı gerçek test webhook'u doğru tenant'a ve yalnızca bir kez işleniyor.
- Onaylı şablonla test mesajı gönderiliyor; gönderildi/teslim edildi/okundu/başarısız durumları kaydediliyor.
- Opt-out sonrasında proaktif mesaj gönderilmiyor.
- Bilinmeyen numaraya öğrenci, borç veya okul bilgisi açıklanmıyor; kayıt insan kuyruğuna düşüyor.

## 9. Hukuk ve uyum kapısı

**Öncelik:** Canlı WhatsApp kullanımı öncesi zorunlu P0  
**Durum:** 27 Ağustos 2026 tarihli resmî kaynaklara dayalı ürün/teknik kontrol listesi; avukat ve mali müşavir görüşünün yerine geçmez

Bu kapı kapanmadan gerçek veli numarası, borç bilgisi veya dekont Meta'ya gönderilmeyecek. Staging testleri sentetik veri ve açıkça ayrılmış test numaralarıyla yapılacak.

### 9.1 Veri sorumlusu ve veri işleyen rolleri

1. Her okulun öğrenci, veli, fatura ve tahsilat amaçlarını belirleyen **veri sorumlusu**; 5mevsim'in okul talimatıyla altyapı işleten **veri işleyen** olduğu başlangıç modeliyle bir rol/RACI matrisi hazırla.
2. 5mevsim'in kendi hesap güvenliği, ürün faturalaması, zorunlu güvenlik logları veya kendi analitiği için amaç/vasıta belirlediği faaliyetleri ayrıca değerlendir; bu alanlarda bağımsız ya da ortak veri sorumluluğu doğabileceğini sözleşmede gizleme.
3. Okul–5mevsim veri işleme sözleşmesine en az talimat sınırı, veri/kişi kategorileri, gizlilik, alt işleyenler, teknik-idari tedbirler, ihlal bildirimi, ilgili kişi talepleri, denetim, hizmet sonunda iade/silme ve yurt dışı aktarım sorumluluklarını yaz.
4. Meta/WhatsApp ve Supabase'in yürürlükteki DPA, veri aktarım eki, alt işleyen listesi, saklama/silme koşulları ve sözleşen tüzel kişisini arşivle; sürüm ve kabul tarihini denetim kaydına bağla.
5. Bir BSP veya entegratör kullanılacaksa yalnızca yetkili erişimi olan ve Business Solution Data'yı okul/5mevsim talimatı dışında kullanmayacağını yazılı kabul eden sağlayıcı seç.

### 9.2 KVKK işleme şartı, aydınlatma ve ilgili kişi hakları

1. Aşağıdaki her faaliyet için veri kategorisi, amaç, veri sorumlusu, alıcı, saklama süresi ve KVKK madde 5/6 işleme şartını ayrı ayrı veri envanterine yaz:
   - Veli iletişim ve öğrenci bağı.
   - Fatura/borç hatırlatması.
   - WhatsApp konuşma ve teslimat metadatası.
   - Dekont görseli ve finansal işlem kaydı.
   - Admin/antrenör hesap ve güvenlik logları.
2. Sözleşmenin kurulması/ifası, hukuki yükümlülük, bir hakkın tesisi-kullanılması-korunması veya meşru menfaat gibi uygun bir işleme şartı varsa gereksiz açık rıza isteme. Her amaç için hukuki sebebi hukuk danışmanı kesinleştirsin; tek bir “her şeyi kabul ediyorum” metni kullanma.
3. KVKK aydınlatmasını kayıt sırasında ver; veli bilgisi başka kişiden alınmışsa makul sürede ve en geç ilk iletişim/ilk aktarım anında ulaştır. Veri sorumlusunun kimliği, amaç, alıcılar ve yurt dışı aktarım, toplama yöntemi/hukuki sebep, ilgili kişi hakları ve başvuru kanalını içersin.
4. Aydınlatma ile açık rıza/WhatsApp opt-in'i ayrı işlem ve ayrı kanıt olarak tut. Aydınlatmanın “onaylanmasını” hizmet şartı yapma.
5. KVKK başvurularını kimlik doğrulamalı bir kanaldan alıp yasal süre içinde cevaplayan süreç kur; silme talebinde diğer kanuni saklama zorunluluklarını ve işlem kısıtlamasını kontrol et.
6. Çocuk verisini en aza indir: program, yoklama ve izin verisi WhatsApp'a hiç taşınmayacak; mesajlarda tam öğrenci adı yerine doğrulanmış veli için gereken en az tanımlayıcı kullanılacak.

### 9.3 Ticari elektronik ileti ve IYS ayrımı

Mesajlar teknik olarak amaç koduyla sınıflandırılacak; serbest metin toplu gönderim yapılmayacak.

| Mesaj sınıfı | Türk mevzuatı için planlanan yaklaşım | Ürün kuralı |
|---|---|---|
| Devam eden üyeliğe ait tahsilat/borç hatırlatma | Yönetmelik madde 6/2 kapsamında ön onay istisnası değerlendirilebilir | Yalnızca mevcut borç; kampanya, çapraz satış, yeni dönem tanıtımı veya özendirme eklenemez |
| Dekont alındı/onaylandı/reddedildi | İşlemsel hizmet bildirimi olarak değerlendirilir | Yalnızca ilgili işlem ve destek bilgisi |
| Kampanya, indirim, yeni sezon, etkinlik satışı | Ön onay ve IYS süreci gerekir | V1'de gönderilmeyecek; aynı utility şablonuna karıştırılamaz |
| Mevzuat gereği zorunlu bildirim | İlgili özel mevzuat kapsamında değerlendirilir | Hukuki dayanak ve mesaj türü kayıt altına alınır |

Ek kurallar:

1. Türk mevzuatındaki ön onay istisnası Meta politikasındaki opt-in gerekliliğini kaldırmaz. İlk proaktif WhatsApp mesajından önce Meta'ya uygun, kanıtlanabilir bir WhatsApp opt-in'i kayıt formu, sözleşme ekranı veya velinin başlattığı konuşma üzerinden al.
2. İlk kez WhatsApp mesajı göndererek pazarlama onayı isteme. Opt-in kaydında numara, zaman, kaynak, kapsam, metin sürümü ve geri alma durumu bulunsun.
3. İşletme başlatmalı mesajlarda onaylı template kullan; veli mesajından sonra açılan 24 saatlik hizmet penceresini server tarafında hesapla.
4. Her ileti gönderen okulu açıkça tanıtsın, erişilebilir iletişim/destek kanalı sunsun ve aynı kanalda kolay/ücretsiz ret olanağı versin. `DUR`, `İPTAL` ve eş anlamlıları suppression listesine al; ret talebini en geç üç iş günü içinde bütün proaktif ticari iletilere uygula.
5. Ret, vazgeçme veya kalite kısıtı sonrası WhatsApp'ı zorunlu tek tahsilat kanalı yapma; adminin manuel iletişim/fiziksel süreç fallback'i olsun.

### 9.4 Yurt dışına veri aktarımı — kritik canlıya çıkış engeli

1. Meta/WhatsApp, Supabase, SMTP, hata izleme, hosting, yedekleme ve destek araçları için doğrudan ve sonraki aktarım haritası çıkar; telefon, öğrenci tanımlayıcısı, borç, mesaj, dekont, IP/log ve kullanıcı hesap verilerini tek tek işaretle.
2. Supabase proje bölgesini ve tüm alt hizmetlerin veri konumunu doğrula. Birincil verinin Avrupa bölgesinde olması Türkiye açısından yine yurt dışı aktarımdır ve tek başına KVKK uyumu sağlamaz.
3. WhatsApp'ın sürekli kullanımı olağan iş akışında düzenli aktarım olacağından KVKK madde 9'daki **arızi/istisnai aktarım** ve yalnızca açık rıza çözümüne dayandırma.
4. Her veri alıcısı için sırasıyla yeterlilik kararı, uygun güvence veya gerçekten arızi istisna değerlendirmesi yap. Düzenli bulut/WhatsApp aktarımında uygulanabilir uygun güvence bulunmadan canlıya çıkma.
5. Standart sözleşme kullanılacaksa veri sorumlusu→veri işleyen gibi doğru modülü seç, Kurum metnini değiştirmeden yetkili taraflara imzalat ve imzaların tamamlanmasından itibaren beş iş günü içinde KVKK bildirim modülünden bildir.
6. Meta'nın kendi Business Data Processing Terms veya GDPR odaklı Data Transfer Addendum'unu kendiliğinden Türk KVKK standart sözleşmesi sayma. Meta/Supabase'in Türkiye için gerekli sözleşmeyi imzalayıp imzalamadığı hukuk danışmanı tarafından yazılı doğrulanmalı; mümkün değilse Kurul onaylı taahhütname, yurt dışı aktarımı azaltan uygun mimari veya entegrasyonu erteleme seçeneklerinden biri seçilmeli. Yerel bir BSP kullanmak, mesaj yine Meta altyapısına gidiyorsa bu aktarım sorununu tek başına çözmez.
7. Alt işleyen veya veri merkezi değişikliklerini izleyen yıllık ve olay bazlı sözleşme kontrolü kur. WhatsApp işletme şartlarının **23 Eylül 2026** tarihinde değişeceği ilan edildiğinden geliştirme başlamadan ve canlıya çıkmadan yürürlükteki sürümü tekrar incele.

### 9.5 Dekont, muhasebe belgesi ve saklama/imha

1. Dekontu karar verilene kadar private ve kısa ömürlü geçici nesne olarak işle; yalnızca yetkili finans personeline süreli signed URL ile göster.
2. Admin kararı tek başına silmeyi tetiklemesin: önce ödeme kaydı, banka/işlem referansı, görsel hash'i, karar, inceleyen ve zaman damgası kalıcı denetim kaydına başarıyla yazılsın.
3. Yüklenen dekontun TTK/VUK kapsamında “kaydın dayanağı belge” veya saklanması gereken muhasebe belgesi olup olmadığını okulun mali müşaviri ve avukatı yazılı belirlesin. Böyle sayılıyorsa kullanıcı talebindeki hemen silme uygulanamaz; görsel ayrı, erişimi kısıtlı yasal arşivde belirlenen süre tutulur. Banka hareketi ve sistem kaydı yeterli görülüyorsa geçici görsel karar sonrasında yok edilir.
4. Ret edilen dekontta hukuki saklama sebebi bulunmuyorsa görseli karardan sonra yok et; itiraz için hash ve karar kaydı tutmanın yeterliliğini hukuk görüşüne bağla.
5. Storage silme, CDN/cache, log, geçici dosya ve yedek kopyaların imha davranışını belgele. Silme işi tamamlanmadan `completed` durumuna geçme.
6. İmha işleminin kim/ne zaman/hangi nesne üzerinde yapıldığını kaydet ve imha kayıtlarını KVKK yönetmeliğindeki asgari süreye uygun biçimde en az üç yıl sakla.
7. Mesaj içeriği, teslimat metadata, ödeme/audit ve güvenlik logları için ayrı saklama matrisi oluştur; “süresiz” saklama kullanma ve yasal süre/amaç sona erdiğinde otomatik imha çalıştır.

### 9.6 Teknik ve idari tedbirler

1. Private bucket, kısa süreli signed URL, RLS/tenant izolasyonu, en az yetki, finans onayında güçlü admin oturumu, secret yönetimi ve şifreli aktarımı zorunlu tut.
2. Webhook imzası, `wamid` idempotency, dosya türü/boyutu doğrulaması, zararlı içerik taraması, rate limit ve bilinmeyen numara karantinası uygula.
3. Uygulama ve sağlayıcı loglarında telefon, öğrenci, borç ve dekont URL'sini maskele; destek personelinin üretim verisine erişimini onaylı ve süreli yap.
4. Yanlış numaraya mesaj, tenant sızıntısı, ele geçirilmiş admin hesabı ve medya erişimi için olay müdahale senaryoları yaz. Kişisel veri ihlali değerlendirmesi ve gerekiyorsa Kurula en geç 72 saat içinde bildirim yapabilecek sorumlu/iletişim zinciri oluştur.
5. Alt işleyen güvenliği, erişim incelemesi, yedekten geri dönüş, silme doğrulaması ve yetki matrisini düzenli denetle.

### 9.7 Hazırlanacak uyum paketi

- Kişisel veri işleme ve yurt dışı aktarım envanteri.
- Okul–5mevsim veri işleme sözleşmesi ve alt işleyen listesi.
- Veli KVKK aydınlatma metni; ayrı WhatsApp opt-in metni ve sürüm kayıtları.
- Transactional mesaj kataloğu; pazarlama mesajlarını teknik olarak engelleyen amaç kodları.
- KVKK standart sözleşme/taahhütname dosyaları ve bildirim kanıtları.
- VERBİS yükümlülük/istisna değerlendirmesi ve gerekiyorsa güncel sicil kaydı.
- Saklama-imha matrisi, dekont muhasebe sınıflandırması ve imha logu prosedürü.
- İlgili kişi başvuru, opt-out, veri ihlali ve sağlayıcı değişikliği prosedürleri.
- Avukat ve mali müşavir onay kaydı: kapsam, tarih, incelenen sözleşme/politika sürümleri ve çekinceler.

**Kabul ölçütleri:**

- Okul, 5mevsim, Meta, Supabase ve varsa BSP rolleri/sözleşmeleri yazılı olarak belirlenmiş.
- Düzenli yurt dışı aktarım için geçerli mekanizma kurulmuş ve gerekiyorsa beş iş günlük bildirim tamamlanmış.
- Aydınlatma, WhatsApp opt-in ve varsa ticari ileti onayı birbirinden ayrı ve ispatlanabilir.
- V1 şablonlarının tanıtım içermediği hukuk tarafından doğrulanmış; marketing mesajları teknik olarak kapalı.
- Dekontun hemen silinmesi veya yasal arşivlenmesi mali müşavir+avukat tarafından belge sınıfına göre yazılı karara bağlanmış.
- Bu maddeler için imzalı go-live kontrolü olmadan production feature flag açılamıyor.

## 10. Faz 3 — WhatsApp dekont akışı

**Öncelik:** P0  
**Tahmini efor:** 4–7 gün

### 10.1 Alma ve eşleme

1. Görsel mesajdan media ID'yi al ve kısa ömürlü indirme bağlantısını gecikmeden çöz.
2. Yalnızca JPEG/PNG ve belirlenen üst boyut sınırını kabul et; MIME, sihirli bayt ve dosya boyutunu server tarafında doğrula.
3. Dosyayı tahmin edilemez adla private geçici bucket'a koy; SHA-256 hash üret.
4. Göndereni normalize edilmiş E.164 telefon ve Meta `wa_id` ile okul içindeki `guardians` kaydına eşle.
5. Birden fazla öğrenci veya uygun fatura varsa WhatsApp liste/yanıt düğmeleriyle seçim yaptır.
6. Bilinmeyen, çakışan veya numarası değişmiş göndericiyi otomatik eşleştirme; kimlik doğrulama ya da admin müdahalesi iste.

### 10.2 Admin incelemesi

1. Web paneline **Bekleyen Dekontlar** kuyruğu ekle.
2. Görsel, gönderen, öğrenci, fatura, borç, gönderim zamanı ve eşleşme güvenini göster.
3. Admin onayında tek DB transaction'ı ile ödeme oluştur/güncelle, faturayı yeniden hesapla ve denetim kaydı yaz.
4. Red işleminde standart veya serbest gerekçeyi kaydet; ödeme tutarını değiştirme.
5. Aynı dekontun veya aynı mesajın yeniden işlenmesini hash + `wamid` ile engelle.

### 10.3 Dosya temizliği ve sonuç

1. Karardan sonra dekontu `cleanup_pending` durumuna getir.
2. Worker, Bölüm 9.5'te yazılı karara bağlanan politikayı uygulasın: varsayılan olarak geçici dosyayı Storage'dan silsin; kanuni belge sayılmışsa yalnızca yetkili yasal arşive taşısın. Varsa Meta medya silme/erişim sona erdirme adımını çalıştırsın.
3. Silme başarısızsa finansal kararı geri alma; tekrar dene ve operasyon alarmı üret.
4. Görsel silindikten sonra yalnızca saklama matrisinde izin verilen hash, mesaj/media kimliği, MIME/boyut, eşleme, karar, gerekçe, karar veren ve zaman damgalarını tut.
5. 24 saatlik müşteri hizmeti penceresi açıksa serbest biçimli, kapalıysa onaylı utility şablonuyla veliye sonucu bildir.

**Kabul ölçütleri:**

- Tek ve çok öğrencili veli senaryosu WhatsApp içinde tamamlanıyor.
- Onaylanan dekont doğru faturaya bir kez ödeme yazıyor; reddedilen dekont ödeme üretmiyor.
- Karar sonrasında görsel, yazılı muhasebe/hukuk sınıflandırmasına göre siliniyor veya yasal arşive alınıyor; işlem hatası izlenebilir ve yeniden denenebilir.
- Veli her iki kararın sonucunu alıyor; bilinmeyen numara hiçbir finansal veri göremiyor.

## 11. Faz 4 — Çekirdek güvenlik ve veri bütünlüğü

**Öncelik:** P0/P1  
**Tahmini efor:** 3–5 gün

1. `payments` doğrudan istemci insert yetkisini daralt; ödeme/dekont işlemlerini güvenli RPC/komutlara taşı.
2. Eski geniş `receipts` Storage politikalarını kaldır; private bucket ve servis erişimini negatif testlerle doğrula.
3. `SECURITY DEFINER` fonksiyonlarının `EXECUTE` yetkilerini envanterle; `anon`/`PUBLIC` erişimini kaldır.
4. Cross-tenant öğrenci, veli, fatura ve personel kimliği enjeksiyonlarını DB seviyesinde reddet.
5. Öğrenci ve başvuru UI değerlerini DB enum/constraint'leriyle birleştir (`inactive/passive`, `trial_done/dropped` uyuşmazlıkları).
6. Çok adımlı öğrenci, personel, maaş ve CRM geçişlerini transaction sınırına al.
7. Türkiye yerel tarihi için tek helper kullan; UTC kaynaklı gün kaymalarını kapat.
8. Üretim loglarından telefon, dekont bağlantısı ve diğer hassas verileri çıkar.

**Kabul ölçütü:** RLS/tenant negatif testleri geçmeli; yapay hata hiçbir yarım finansal veya Auth kaydı bırakmamalı.

## 12. Faz 5 — Kalite kapıları ve testler

**Öncelik:** P1  
**Tahmini efor:** 3–5 gün

1. Mevcut mobil TypeScript hatasını ve Expo Doctor uyumsuzluklarını düzelt.
2. Supabase tiplerini güncel şemadan yeniden üret; web ve mobil aynı sözleşmeyi kullansın.
3. `packages/shared` alanını gerçek workspace paketi yap veya kullanılmayan kopyaları kaldır.
4. Etkileşimsiz `typecheck`, `lint`, `test`, web build ve Expo bundle komutlarını tanımla.
5. Unit test: tarih, para, durum geçişi, telefon normalizasyonu ve mesaj yönlendirme.
6. DB test: RLS rol/tenant matrisi, fatura yeniden hesaplama ve dekont onay transaction'ı.
7. Entegrasyon testi: webhook imzası, idempotency, seçim durumu, outbox retry ve cleanup.
8. E2E smoke:
   - Admin e-posta girişi ve yönetim akışları.
   - Antrenör daveti, girişi, programı ve yoklaması.
   - Veli hatırlatma → dekont → seçim → admin kararı → sonuç mesajı.
9. Her PR'da temiz kurulum, typecheck, lint, test, build, migration ve DB testlerini çalıştıran CI kur.

**Kabul ölçütü:** Bozuk tip, enum, RLS, webhook veya build değişikliği ana dala girmeden otomatik engellenmeli.

## 13. Faz 6 — Mobil admin için açık kapı

**Öncelik:** P1/P2; mobil admin ekranları pilot sonrasına bırakılabilir  
**Tahmini efor:** Temel refactor 3–5 gün; ekran geliştirme ayrıca planlanır

1. Admin web panelini önce telefon ekranlarında kullanılabilir responsive/PWA yap.
2. İş kurallarını React bileşenlerinden ve Next.js server action'larına özel koddan ayır.
3. Ortak domain şemaları, para/tarih kuralları ve API sözleşmelerini `packages/shared` altında sürdür.
4. Native istemcinin çağırabileceği sürümlenmiş RPC/Edge Function/API komut katmanı oluştur.
5. Yetki modelini rol adından daha ince `capability` kontrollerine hazırla.
6. Mevcut Expo uygulamasını personel uygulaması olarak düzenle; `(coach)` yanında gelecekte `(admin)` route grubu eklenebilsin.
7. Web ve mobil istemciler için aynı contract testlerini çalıştır.

**Kabul ölçütü:** Örnek bir admin sorgusu ve bir admin komutu web'e özgü kod olmadan ortak sözleşme üzerinden çağrılabilmeli; server yetkisi iki istemcide de aynı sonucu vermeli.

## 14. Faz 7 — Pilot ve operasyon

**Öncelik:** P1  
**Tahmini efor:** 2–4 gün; dış onaylar hariç

1. Ayrı staging ortamında tüm rolleri ve WhatsApp senaryolarını test et.
2. Production secrets, custom SMTP, Meta token yenileme, yedekleme/PITR ve hata izlemeyi kur.
3. WhatsApp kesintisi, şablon reddi, kalite kısıtı, numara bloklanması ve webhook kuyruğu için runbook yaz.
4. Gönderim/teslim, konuşma, şablon, medya ve retry maliyetlerini izleyen operasyon göstergeleri ekle.
5. Manuel dekont kaydı ve veliye telefonla dönüşü, WhatsApp arızasında kontrollü fallback olarak tanımla.
6. Bilinmeyen numara, çakışan eşleşme ve temizlenemeyen dosya kuyruklarını günlük takip et.
7. Kontrollü pilot sonrası geri bildirim ve olay kayıtlarıyla ikinci faz kapsamını belirle.

**Kabul ölçütü:** Pilot bir okulda izlenebilir biçimde çalışmalı; dış servis arızası finansal veri kaybına veya yanlış veliye bilgi açıklanmasına yol açmamalı.

## 15. Kapsamdan çıkarılan veya ertelenen işler

### Çıkarılan

- SMS OTP ve SMS sağlayıcısı.
- Veli mobil uygulaması, veli Auth hesabı ve veli push bildirimi.
- Veliye program/yoklama geçmişi gösterimi ve veli izin talebi; WhatsApp'a da taşınmayacak.
- Sabit veli parolası ve telefon numarasından hesap keşfi.

### Pilot sonrasına ertelenen

- Native mobil admin ekranları; altyapı hazırlığı pilotta yapılır.
- Süper admin abonelik/faturalama otomasyonu.
- Online ödeme, Excel importu, halı saha, turnuva ve medya modülleri.
- WhatsApp Flows gibi daha zengin form deneyimleri; ilk pilot liste/yanıt düğmeleriyle yapılabilir.

## 16. Başlıca riskler ve önlemler

| Risk | Etki | Önlem |
|---|---|---|
| Geliştirme veya preview yanlışlıkla production Supabase'e bağlanır | Gerçek veri değişir/silinir | Ortam fail-fast kontrolü, ayrı staging, production secret'larının yerelde bulunmaması |
| Test worker'ı gerçek telefon/e-postaya gönderir | Mahremiyet ihlali ve kullanıcı güveni kaybı | Dış config kill switch + ayrı test kimlik bilgisi + allowlist + tenant quarantine + server policy |
| Yalnızca DB backup'ına güvenilir | Storage belgeleri geri getirilemez | DB ve Storage'ı ayrı yedekleme, checksum manifest ve izole restore testi |
| Quarantine sırasında biriken outbox sonradan topluca gönderilir | Eski/yanlış bildirimler gerçek kullanıcılara gider | Olayları `suppressed/dry_run` işaretleme; kilit açılırken otomatik replay'i yasaklama |
| WhatsApp tek kritik veli kanalı olur | Kesinti/kısıtlamada iletişim durur | Outbox, retry, alarm, insan kuyruğu ve manuel fallback |
| Şablon onayı, opt-in veya 24 saat kuralı | Proaktif/sonuç mesajı gönderilemez | Şablonları erken onaya verme, izin kaydı ve pencere kontrolü |
| Telefon eşleşmesi kimlik doğrulama kadar güçlü değildir | Yanlış kişiye borç/öğrenci bilgisi | Kanal+tenant, E.164+`wa_id`, çakışmada otomasyonu durdurma, minimum veri |
| Numara değişir, yeniden kullanılır veya birden çok veli paylaşır | Hatalı ilişki | İlk temas doğrulaması, çoklu veli modeli ve admin düzeltme kuyruğu |
| Medya indirme bağlantısı kısa ömürlüdür | Dekont alınamadan erişim biter | Webhook'u hızlı kabul edip medya işini hemen kuyruğa alma |
| DB kararı ile dosya/mesaj işlemleri atomik değildir | Onay var ama dosya silinmez/mesaj gitmez | Outbox, `cleanup_pending`, idempotency ve telafi işleri |
| Görseli hemen silmek muhasebe belgesi veya uyuşmazlık kanıtını yok edebilir | Saklama yükümlülüğü/itiraz riski | Mali müşavir+avukat belge sınıflandırması; uygunsa silme, zorunluysa kısıtlı yasal arşiv |
| Düzenli Meta/Supabase aktarımı için KVKK güvencesi kurulamaması | WhatsApp'ın hukuka uygun canlıya alınamaması | Veri aktarım haritası, doğru standart sözleşme/diğer güvence ve go-live feature flag |
| İşlemsel mesaja tanıtım karışması | Onaysız ticari ileti ve şablon ihlali | Amaç kodu, kilitli şablon kataloğu, hukuk onayı; V1'de marketing kapalı |
| Kaldırılan parent kodu/tabloları yaşamaya devam eder | Saldırı yüzeyi ve bakım yükü | Veri migration'ı sonrası route/servis/push/Auth/politikaları kontrollü kaldırma |
| Web iş kuralları UI'ya gömülür | Mobil admin pahalı yeniden yazıma döner | Ortak domain ve sürümlü komut/API/RPC katmanı |

## 17. Uygulama sırasında kullanıcıdan gerekecekler

Belge güncellemesi için ek erişim gerekmedi. İlgili faza gelindiğinde:

1. Mevcut Supabase projesinin planı, backup/PITR durumu ve production olduğu teyidi; veri içeriğinin kendisi istenmeyecek.
2. Ayrı staging Supabase projesi oluşturma erişimi ve şifreli backup/Storage arşivi için kurumsal hedef.
3. Meta Business Portfolio/WABA erişimi, kullanılacak numara ve işletme doğrulama işlemleri.
4. Utility mesaj şablonlarının metin ve marka onayı.
5. Üretim e-posta gönderimi için SMTP sağlayıcısı ve gönderen alan adı.
6. Kontrollü test için yalnızca açıkça belirlenmiş, gerçek operasyon dışı antrenör e-postaları ve veli/test telefonları.
7. Şirket/okul ticari unvanı, MERSİS/iletişim bilgileri ve mevcut üyelik/kayıt sözleşmeleri.
8. KVKK konusunda çalışan avukat ile okul mali müşavirinin Bölüm 9 kapsamındaki yazılı sınıflandırma ve go-live onayı.

Canlı migration, Auth kullanıcılarını devre dışı bırakma/silme veya gerçek veliye mesaj gönderme öncesinde hedef ve etki ayrıca bildirilecek.

## 18. Önerilen ilk çalışma paketi

Onaydan sonra ilk teslim paketi:

1. Mevcut bağlı projeyi protected production olarak envanterleme; bütün dış gönderimleri çoklu kilitle `quarantined` duruma alma.
2. Production DB + Storage için şifreli yedek, checksum manifest ve izole restore kanıtı oluşturma.
3. Ayrı staging/local ortamı schema-only migration ve sentetik seed ile kurma; local/preview production bağlantısını fail-fast engelleme.
4. Mevcut çalışma ağacını ve şemayı güvenli baseline'a alma.
5. Hukuk/uyum envanterini ve Meta/Supabase sözleşme-yurt dışı aktarım fizibilitesini gerçek veri göndermeden tamamlama.
6. `guardians`/`guardian_students` modelini önce staging'de kurma; production migration'ını backup ve sayım kontrolleri hazır olana kadar çalıştırmama.
7. Antrenör e-posta davet/giriş/sıfırlama akışını staging'de kurma; SMS OTP ve sabit veli parolası üretimini kaldırma.
8. Mevcut P0 RLS, ödeme, Storage ve enum sorunlarını staging'de kapatma.
9. WhatsApp kanal, webhook, idempotent mesaj kaydı ve outbox iskeletini yalnızca sentetik staging verisiyle kurma.
10. Web+mobil typecheck, lint ve build kapılarını yeşile getirme.

Bu paket tamamlandığında dekont durum makinesi ve admin **Bekleyen Dekontlar** ekranına güvenli biçimde geçilebilir.

## 19. Resmî ve birincil dayanaklar

- [WhatsApp Business Messaging Policy](https://whatsappbusiness.com/policy/)
- [WhatsApp Business Platform özellikleri](https://whatsappbusiness.com/products/business-platform-features/)
- [WhatsApp Business hukuki metinler ve sürümler](https://www.whatsapp.com/legal/)
- [Meta Terms for WhatsApp Business](https://www.whatsapp.com/legal/meta-terms-whatsapp-business)
- [WhatsApp Business Data Processing Terms](https://www.whatsapp.com/legal/business-data-processing-terms)
- [WhatsApp Business Data Transfer Addendum](https://www.whatsapp.com/legal/business-data-transfer-addendum)
- [Meta WhatsApp Cloud API resmi koleksiyonu](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api)
- [Meta medya indirme referansı](https://www.postman.com/meta/whatsapp-business-platform/request/zsq66eh/download-media)
- [Supabase kullanıcı davetleri](https://supabase.com/docs/guides/auth/users)
- [Supabase parola tabanlı Auth](https://supabase.com/docs/guides/auth/passwords)
- [Supabase özel SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase bölgeler ve veri konumu](https://supabase.com/docs/guides/platform/regions)
- [Supabase Security ve DPA bilgisi](https://supabase.com/docs/guides/security)
- [Supabase veritabanı backup ve PITR](https://supabase.com/docs/guides/platform/backups)
- [Supabase ortam yönetimi](https://supabase.com/docs/guides/deployment/managing-environments)
- [Supabase deployment ve production verisiz preview branch'leri](https://supabase.com/docs/guides/deployment)
- [Supabase Storage nesnelerini yedekleme/indirme](https://supabase.com/docs/guides/storage/management/download-objects)
- [KVKK yurt dışına veri aktarımı rehberi](https://www.kvkk.gov.tr/Icerik/8143/Kisisel-Verilerin-Yurt-Disina-Aktarilmasi-Rehberi)
- [KVKK güncel yurt dışına aktarım sayfası](https://www.kvkk.gov.tr/Icerik/2053/Yurtdisina-Aktarim)
- [KVKK standart sözleşmeler](https://www.kvkk.gov.tr/Icerik/7929/Standart-Sozlesmeler)
- [KVKK 2026 standart sözleşme uygulama uyarıları](https://www.kvkk.gov.tr/Icerik/8170/Yurt-Disina-Kisisel-Veri-Aktariminda-Kullanilacak-Standart-Sozlesmelerde-Dikkat-Edilmesi-Gereken-Hususlara-Iliskin-Kamuoyu-Duyurusu)
- [KVKK aydınlatma yükümlülüğü](https://www.kvkk.gov.tr/Icerik/6765/AYDINLATMA-YUKUMLULUGUNUN-YERINE-GETIRILMESI-HAKKINDA-KAMUOYU-DUYURUSU)
- [KVKK 2026 açık rıza ve aydınlatmanın ayrılması ilke kararı](https://www.kvkk.gov.tr/Icerik/8710/veri-sorumlulari-tarafindan-acik-riza-ve-aydinlatma-metinlerinin-ayri-ayri-duzenlenmesi-gerektigi-hakkinda-kisisel-verileri-koruma-kurulunun-18-02-2026-tarihli-ve-2026-347-sayili-ilke-kararina-iliskin-kamuoyu-duyurusu)
- [KVKK veri güvenliği yükümlülükleri](https://www.kvkk.gov.tr/Icerik/2040/Veri-Guvenligine-Iliskin-Yukumlulukler)
- [KVKK kişisel verilerin silinmesi/yok edilmesi](https://www.kvkk.gov.tr/Icerik/2038/kisisel-verilerin-silinmesi-yok-edilmesi-veya-anonim-hale-getirilmesi)
- [KVKK veri ihlali bildirimi](https://www.kvkk.gov.tr/Icerik/8595/kamuoyu-duyurusu)
- [Ticari İletişim ve Ticari Elektronik İletiler Hakkında Yönetmelik](https://kayseri.ticaret.gov.tr/yayinlar/tuketici/ticari-iletisim-ve-ticari-elektronik-iletiler-hakkinda-yonetmelik)
- [Ticaret Bakanlığı İleti Yönetim Sistemi](https://ticaret.gov.tr/ic-ticaret/ticari-elektronik-iletiler/ileti-yonetim-sistemi-iys)
- [Ticaret Bakanlığı TTK belge saklama açıklaması](https://ticaret.gov.tr/data/5d4c0f2813b876180c773fc3/6102kanunkitab1%C4%B1.pdf)
- [Gelir İdaresi Başkanlığı VUK belge muhafaza açıklaması](https://gib.gov.tr/vergi-konulari/2_isletme_ve_girisimci/13_mukelleflerin_ise_baslama_ve_isi_birakma_odevleri/13)
