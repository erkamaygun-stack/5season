# İzole Staging Release Kontrol Listesi

Bu liste production için değildir. Gerçek kullanıcı verisi, production secret'ı veya gerçek alıcı numarası içermeyen izole local/staging ortamında uygulanır.

## 1. Ön koşullar

- [ ] Hedefin production Supabase project ref'i olmadığı iki kişi/iki kontrol ile doğrulandı.
- [ ] Ortam boş veya yalnızca repodaki sentetik seed ile oluşturuldu.
- [ ] Production `service_role`, DB parolası, Meta token'ı, SMTP anahtarı ve gerçek telefon allowlist'i ortamda yok.
- [ ] `APP_ENV=staging|development`, `PROTECTED_DATA_MODE=false`, `OUTBOUND_DELIVERY_MODE=disabled` açıkça tanımlı.
- [ ] Korunan production project ref yalnızca secret/config içindeki engel listesinde; loga veya repoya yazılmıyor.

## 2. Veritabanı doğrulaması

- [ ] Temiz local/staging DB üzerinde bütün migration'lar sıfırdan uygulandı.
- [ ] `supabase db lint --local` veya izole staging eşdeğeri temiz geçti.
- [ ] Yeni migration tek transaction olarak başarılı; kısmi şema bırakmıyor.
- [ ] `guardians`, WhatsApp tabloları, `receipt_submissions`, outbox ve private bucket mevcut.
- [ ] Legacy `parent_student`, parent profilleri ve Auth kayıtları fiziksel olarak silinmedi.
- [ ] Parent RLS erişimleri ve anonim telefon keşif RPC'si kapalı.
- [ ] School-admin başka tenant'ın guardian, öğrenci, fatura, ödeme, dekont ve mesajını okuyamıyor/değiştiremiyor.
- [ ] School-admin öğrenci/personel/ödemeyi fiziksel silemiyor; arşiv/void akışı çalışıyor.
- [ ] Ödeme onayı aynı fatura için idempotent; tekrar istek ikinci ödeme oluşturmuyor.
- [ ] Ödeme oluşturma/güncelleme/void sonrası fatura `paid_amount/status` doğru hesaplanıyor.
- [ ] Migration sonrasında Supabase tipleri yeniden üretildi ve geçici yeni-şema `any` kullanımları kaldırıldı.

Önerilen local komut sırası:

```powershell
npx supabase start
npx supabase db reset --local
npx supabase db lint --local
```

## 3. Uygulama doğrulaması

- [ ] Web typecheck, güvenlik testleri ve production build geçiyor.
- [ ] Mobil Expo Doctor, typecheck ve Android export geçiyor.
- [ ] Antrenör yalnızca aktif coach hesabıyla e-posta/parola üzerinden girebiliyor.
- [ ] Parent rolü web/mobil uygulamaya giremiyor; SMS OTP çağrısı yok.
- [ ] Admin guardian ekleme/düzenleme/bağlantı kaldırma akışı Auth hesabı oluşturmuyor.
- [ ] Öğrenci/personel arşivlenince ilişkiler ve finans geçmişi korunuyor.
- [ ] Bekleyen dekont yalnızca doğru tenant adminine görünüyor; signed URL kısa ömürlü.

## 4. Dış sistem karantinası

- [ ] WhatsApp provider `disabled` veya `sink`; ağ transport'u yok.
- [ ] Outbox kayıtları `suppressed`/`dry_run`; eski kayıtları replay eden worker yok.
- [ ] E-posta daveti, WhatsApp, SMS, push ve harici webhook için gerçek credential yok.
- [ ] Test telefonları belgelenmiş sentetik/Meta test numaraları; gerçek kullanıcıyla çakışma yok.
- [ ] Log, hata kaydı, analytics ve audit payload'larında telefon, dekont içeriği veya signed URL yok.

## 5. Hukuk ve production kapıları

- [ ] Veri sorumlusu/veri işleyen rolleri ve DPA'lar yazılı.
- [ ] KVKK veri envanteri, aydınlatma, ilgili kişi başvurusu ve saklama/imha politikası tamamlandı.
- [ ] Meta/Supabase yurt dışı aktarımı için uygun mekanizma hukuk danışmanınca yazılı doğrulandı.
- [ ] WhatsApp opt-in kanıtı ve utility/marketing ayrımı onaylandı.
- [ ] Dekont görselinin silinmesi veya yasal arşivi mali müşavir + hukuk danışmanı tarafından sınıflandırıldı.
- [ ] Production backup/PITR, Storage yedeği, schema diff, etki tahmini ve rollback provası tamamlandı.
- [ ] Production migration, dış gönderim, deploy ve push için kullanıcıdan ayrıca açık talimat alındı.

Bu maddelerin herhangi biri eksikse gerçek veri veya gerçek alıcıyla pilot başlatılmaz.
