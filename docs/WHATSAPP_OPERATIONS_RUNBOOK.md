# WhatsApp Entegrasyon ve Operasyon Runbook'u

Bu belge kodun izole staging'de nasıl çalıştırılacağını anlatır. Hukuk/uyum kapısı kapanmadan, production yedeği ve rollback provası olmadan gerçek veli verisi veya gerçek alıcı kullanılmaz.

## Bileşenler

- `POST /api/integrations/whatsapp/webhook`: Meta `X-Hub-Signature-256` imzasını ham gövde üzerinde doğrular, mesaj/durum olayını idempotent kaydeder ve ağır işi kuyruğa bırakıp hızlı `2xx` döner.
- `POST /api/internal/jobs/whatsapp`: secret ile korunan inbound medya, seçim, Storage cleanup, aidat hatırlatma ve outbox batch'ini işler.
- `whatsapp_inbound_jobs`: medya indirme ve interaktif seçim işleri; 5 deneme sonrası dead-letter.
- `integration_outbox`: dış mesajlar; `FOR UPDATE SKIP LOCKED`, üstel retry ve dead-letter.
- `receipt_submissions`: `identifying → awaiting_selection|pending_review → cleanup_pending → completed` akışı.

## Ortam değişkenleri

Genel web güvenlik değişkenlerine ek olarak server secret alanında:

```text
WHATSAPP_INBOUND_MODE=disabled|test|production
META_APP_SECRET=<Meta app secret>
META_WHATSAPP_VERIFY_TOKEN=<yüksek entropili webhook doğrulama tokenı>
META_WHATSAPP_ACCESS_TOKEN=<system user token>
META_GRAPH_API_VERSION=<açıkça sabitlenen sürüm; ör. vNN.0>
INTEGRATION_JOB_SECRET=<en az 32 karakter rastgele secret>

OUTBOUND_DELIVERY_MODE=disabled|sink|allowlist|production
OUTBOUND_RECIPIENT_ALLOWLIST=<yalnızca test alıcıları; virgülle ayrılır>

COACH_INVITE_REDIRECT_URL=besmevsim://update-password
SUPABASE_SERVICE_ROLE_KEY=<yalnızca server>
```

`META_GRAPH_API_VERSION` kodda varsayılan almaz; sürüm yükseltmesi bilinçli release kararıdır. Secret'lar repoya, istemci bundle'ına veya loga yazılmaz.

## Staging kanal kurulumu

1. Yalnızca Meta test WABA/numarası ve sentetik okul kullan.
2. `whatsapp_channels` kaydını `status=test` ile oluştur; `phone_number_id` tenant seçimindeki tek kaynaktır.
3. `schools.communications_status=active` yalnızca sentetik tenant için açılır.
4. `template_config` örneği:

```json
{
  "language_code": "tr",
  "aidat_reminder": "aidat_hatirlatma_v1",
  "receipt_approved": "dekont_onaylandi_v1",
  "receipt_rejected": "dekont_reddedildi_v1"
}
```

Aidat şablon gövde parametre sırası: öğrenci adı, dönem, kalan tutar, son ödeme tarihi. Sonuç şablonlarında değişken kullanılmaz. Şablon adları Meta'da onaylı ve utility kategorisinde olmalıdır.

## Scheduler

Yetkili scheduler her dakika küçük bir batch çağırır:

```http
POST /api/internal/jobs/whatsapp
Authorization: Bearer <INTEGRATION_JOB_SECRET>
Content-Type: application/json

{"limit":10}
```

Yanıt yalnızca sayımlar içerir; telefon, mesaj, öğrenci veya signed URL içermez. Aynı worker günde bir kez eşleşen aidat faturaları için `due_date = today + 5` hatırlatmalarını idempotent üretir.

## Medya güvenliği

- Yalnızca JPEG/PNG, en fazla 10 MiB.
- Meta metadata MIME'ı, indirilen response MIME'ı ve sihirli baytlar uyuşmalıdır.
- Nesne yolu `school/submission/random-uuid.ext`; bucket private'tır.
- Admin signed URL süresi 5 dakikadır.
- Karar sonrası finansal transaction geri alınmaz; silme retry edilir. Beş başarısız deneme admin operasyon kuyruğuna düşer.

## Operasyon kontrolü

Günlük olarak:

- `whatsapp_inbound_jobs.status=dead_letter`
- `integration_outbox.status=dead_letter`
- eşleşmemiş/borç bulunamamış `receipt_submissions.status=failed AND decision IS NULL`
- temizlenememiş `receipt_submissions.status=failed AND decision IS NOT NULL`
- webhook imza hatası oranı ve Meta delivery `failed` durumları

incelenir. Loglarda yalnızca hata kodu ve sayım kullanılır. Telefon, raw webhook, dekont içeriği, Storage path veya signed URL loglanmaz.

## Arıza ve geri dönüş

1. `OUTBOUND_DELIVERY_MODE=disabled` yap; eski suppressed olayları otomatik replay etme.
2. Gerekirse kanal durumunu `suspended`, tenant iletişimini `quarantined` yap.
3. Finansal dekont kararı başarılı, Storage silme başarısızsa ödemeyi geri alma; cleanup kuyruğunu düzelt ve yeniden dene.
4. Yanlış tenant/recipient şüphesinde worker'ı durdur, ilgili outbox satırlarını `cancelled` tut ve olay incelemesi başlat.
5. Migration geri dönüşü için production backup/PITR ve Storage manifest prosedürünü uygula; ad hoc `DROP/DELETE` çalıştırma.

## Canlıya geçiş kapıları

- KVKK yurt dışı aktarım mekanizması ve DPA'lar yazılı onaylı.
- WhatsApp opt-in kanıtı kaydediliyor; opt-out sonrası proaktif hatırlatma bloke ediliyor.
- Dekont saklama/silme sınıflandırması hukuk danışmanı ve mali müşavirce yazılı.
- Meta test webhook'u, delivery callback'leri ve onaylı şablonlar staging'de doğrulanmış.
- Temiz DB migration/lint, RLS negatif testleri, backup/restore ve rollback provası geçmiş.
- Production migration/deploy/gönderim için ayrıca açık kullanıcı talimatı verilmiş.
