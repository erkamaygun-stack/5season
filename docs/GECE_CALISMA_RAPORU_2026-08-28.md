# 5mevsim Güvenli Gece Paketi Raporu

**Tarih:** 28 Ağustos 2026
**Branch:** `codex/safe-overnight-20260828`
**Sonuç:** Yerel güvenli temel tamamlandı; canlıya çıkışa hazır değildir.

## Özet

Ürün yönü uygulamaya geçirildi: mobil uygulama yalnızca antrenör içindir ve e-posta/parola kullanır; veli Auth/SMS/mobil uygulama akışı kaldırıldı; veli iletişim modeli WhatsApp ve Auth hesabı olmayan `guardians` kayıtları üzerine kuruldu. Dekont alma, eşleme, admin kararı, ödeme ve dosya temizliği için veri modeli/durum makinesi oluşturuldu. Canlı WhatsApp transport'u ve worker bilerek eklenmedi.

Gerçek kullanıcı verisine dokunulmadı. Production Supabase okunmadı, kopyalanmadı, değiştirilmedi ve migration uygulanmadı. Dış bildirim, deploy ve push yapılmadı.

## Teslim edilenler

### Veri ve iletişim güvenliği

- Development/preview/staging ortamında uzak Supabase hedefi korunan project-ref listesi olmadan açılamaz; production ref'i production dışında reddedilir.
- Veri koruma modu açıkça kapatılmadığı sürece Supabase REST/Storage/Functions/Auth Admin mutasyonlarını engeller.
- Dış gönderim varsayılan olarak `disabled`; allowlist/production koşulları merkezî policy'de fail-closed kontrol edilir.
- WhatsApp sağlayıcı sınırı yalnızca `disabled` ve hiçbir ağ çağrısı yapmayan `sink` modunu uygular. Canlı mod hata verir.
- Tenant iletişim durumu varsayılan `quarantined`; bastırılmış outbox kayıtları kendiliğinden gönderilemez.

### Kimlik ve veli modeli

- SMS OTP ekranı ve servisleri, bütün veli mobil route'ları, push/dekont mobil bağımlılıkları kaldırıldı.
- Antrenör e-posta/parola ile giriş yapar; yalnızca aktif `coach` profili mobil oturum açabilir.
- Veli artık Auth kullanıcısı değildir. Yeni `guardians` ve `guardian_students` modeli E.164 telefonla çalışır.
- Admin öğrenci liste/detay ekranları legacy `parent_student` yerine yeni guardian modelini kullanır.
- Legacy veli/Auth satırlarını silen veya dönüştüren işlem yoktur; migration açıklamalı biçimde eklemelidir.
- Devamsızlık için eski “veliye mesaj gönder” özelliği kaldırıldı.

### WhatsApp/dekont temeli

- Kanal, konuşma, mesaj, onay/izin, dekont ve outbox tabloları ile private `whatsapp-receipts` bucket tanımı hazırlandı.
- Provider mesaj kimliği ve içerik hash'i için idempotency sınırları eklendi.
- Admin bekleyen dekont ekranı yeni `receipt_submissions` kuyruğunu okur ve kısa ömürlü signed URL üretir.
- Onay/ret RPC'si tenant ve fatura eşleşmesini doğrular; onayda ödemeyi aynı transaction'da oluşturur, sonucu `cleanup_pending` yapar ve gönderimi `suppressed` outbox kaydı olarak bırakır.

### P0 veri bütünlüğü

- Öğrenci ve personel silme işlemleri arşivleme/pasifleştirmeye çevrildi; bağlı Auth kullanıcısı silinmez.
- School-admin için öğrenci/personel fiziksel silme RLS seviyesinde kaldırıldı.
- Manuel ödeme oluşturma/güncelleme/iptal işlemleri tenant doğrulayan RPC'lere taşındı; ödeme silinmez, `voided` olur.
- Ödeme trigger'ı aktif ödemelerden fatura toplamını yeniden hesaplar.
- Öğrenci + veli iletişim kaydı tek transaction RPC'siyle oluşturulur; veli Auth hesabı veya sabit parola üretilmez.
- Riskli `SECURITY DEFINER` fonksiyonlarının doğrudan çalıştırma izinleri daraltıldı ve search path'leri sabitlendi.

### Gelecekte mobil admin

- İş açısından kritik yeni yazmalar UI içi Supabase mutasyonları yerine RPC/server action sınırlarına taşındı.
- Veri modeli ve WhatsApp sağlayıcı sınırı web bileşenlerinden bağımsız tutuldu. Bu, ileride aynı RPC/API'lerin mobil admin tarafından kullanılmasına açık kapı bırakır.

## Yerel checkpoint commitleri

- `61bab1d` — mevcut çalışma ağacının başlangıç checkpoint'i
- `8cccdf3` — ortam ve dış-gönderim emniyet kilitleri
- `c011092` — SMS/veli mobil kaldırma ve antrenör e-posta Auth
- `8e6f1f7` — karantinadaki WhatsApp/dekont temeli
- `68f6050` — tenant, kişi ve finans mutasyonlarının P0 sertleştirmesi

Hiçbir commit remote'a push edilmedi.

## Doğrulama sonuçları

| Kontrol | Sonuç |
|---|---|
| Web TypeScript | Geçti |
| Web güvenlik testleri | 11/11 geçti |
| Next.js production build | Geçti; 21 route üretildi |
| Mobil Expo Doctor | 18/18 geçti |
| Mobil TypeScript | Geçti |
| Android Expo export | Geçti; 1.495 modül bundle edildi |
| SQL statik bütünlük | 16 dollar-quote, 1 `begin`, 1 `commit`; dengeli |
| `git diff --check` | Geçti |
| Yerel DB migration/RLS testi | Çalıştırılamadı; `127.0.0.1:54322` yok |

Build ve export komutlarında Supabase URL'si process seviyesinde `http://127.0.0.1:54321` olarak zorlandı ve dış gönderim kapalı tutuldu.

## Açık riskler ve canlıya çıkış engelleri

1. **Migration henüz PostgreSQL üzerinde çalışmadı.** WSL2/sanallaştırma kapalı olduğu için Docker motoru ve local Supabase yok. SQL'in izole veritabanında baştan sona uygulanması, DB lint ve negatif RLS testleri zorunludur.
2. **Üretilmiş DB tipleri eski şemayı gösteriyor.** Migration izole ortamda geçtikten sonra web ve shared tipler yeniden üretilmeli; geçici `any` kullanımları kaldırılmalıdır.
3. **WhatsApp teslimatı yok.** Webhook imzası, medya indirme, malware/MIME kontrolü, worker, retry/dead-letter, gerçek Storage cleanup ve Meta durum callback'leri henüz uygulanmadı.
4. **Hukuk kapısı açık.** KVKK yurt dışı aktarım güvencesi, taraf rolleri/DPA, Meta opt-in, aydınlatma, IYS ayrımı ve dekontun muhasebe belgesi/saklama süresi hukuk danışmanı ve mali müşavirce yazılı onaylanmalıdır.
5. **Framework güvenlik borcu var.** `npm audit --omit=dev` web tarafında Next 14 zincirinde 2 yüksek; mobilde Expo SDK 54 zincirinde 8 orta ve 10 yüksek bulgu bırakıyor. Kritik mobil transitive bulgu giderildi. Kalanların önerilen otomatik çözümü kırıcı Next 16 / Expo 57 yükseltmesidir; ayrı upgrade işi ve regresyon testi gerektirir.
6. **Davet teslimatı doğrulanmadı.** Coach daveti dış-gönderim kilidinin arkasındadır; custom SMTP/redirect yapılandırması olmadan gerçek e-posta testi yapılmamalıdır.

## Sonraki güvenli sıra

1. Windows sanallaştırma + WSL2'yi etkinleştir veya production'dan bütünüyle ayrı, sentetik staging Supabase sağla.
2. [Staging release kontrol listesini](./STAGING_RELEASE_CHECKLIST.md) uygula: temiz DB reset, migration, DB lint, tenant/RLS negatif testleri ve tip üretimi.
3. Tamamen sentetik veli/öğrenci/fatura/dekont verisiyle receipt state-machine entegrasyon testlerini yaz ve çalıştır.
4. Next ve Expo ana sürüm yükseltmelerini ayrı branch'te ele al.
5. Hukuk/uyum belgeleri yazılı olarak tamamlanmadan Meta hesabı, gerçek numara veya gerçek veri kullanma.
6. Ancak ayrı kullanıcı talimatıyla staging release'i değerlendir; production için ayrıca backup, dry-run, rollback ve açık onay iste.
