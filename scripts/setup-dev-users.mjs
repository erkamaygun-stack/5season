#!/usr/bin/env node
/**
 * Dev test kullanıcılarını Supabase'e kurar (tek seferlik).
 *
 * Çalıştır:  node scripts/setup-dev-users.mjs
 * Node 18+   (built-in fetch kullanır, ekstra paket gerekmez)
 */

const SUPABASE_URL = 'https://sbajlpkpwcexhwdrbfgv.supabase.co';
const SERVICE_ROLE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
  '.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiYWpscGtwd2NleGh3ZHJiZmd2Iiwicm9sZSI6' +
  'InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA5Mjk2NSwiZXhwIjoyMDkzNjY4OTY1fQ' +
  '._V45pPcX98Z3qIsWr82MNUj_9HdtQUKJv5BGtZ5lu38';

// Seed verisindeki sabit ID'ler
const SCHOOL_ID = '11111111-1111-1111-1111-111111111111';
const STAFF_ID  = '22222222-2222-2222-2222-222222222201'; // Antrenör 1 → U9 grubu

// Önceki oturumda profiles tablosuna INSERT denenirken "duplicate key" hatası aldık.
// Demek ki bu UUID auth.users'da zaten var — sadece email/password ekleyeceğiz.
let COACH_ID = '3db38228-bc4c-44a7-9cfb-42eb1c89a477';

const HDR = {
  Authorization: `Bearer ${SERVICE_ROLE}`,
  apikey: SERVICE_ROLE,
  'Content-Type': 'application/json',
};

async function api(method, path, body, extra = {}) {
  const r = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: { ...HDR, ...extra },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const txt = await r.text();
  let data;
  try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
  return { ok: r.status >= 200 && r.status < 300, status: r.status, data };
}

// ────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔧  Dev kullanıcıları kuruluyor…\n');

  // ── 1. Coach → auth.users'a email + password ekle ───────────────────────
  process.stdout.write('1/3  Coach auth user güncelleniyor… ');
  let authRes = await api('PUT', `/auth/v1/admin/users/${COACH_ID}`, {
    email: 'coach@test.5mevsim',
    password: 'Test1234!',
    email_confirm: true,
    phone_confirm: true,
  });

  if (!authRes.ok && authRes.status === 404) {
    // Kullanıcı yoksa sıfırdan oluştur
    console.log('⚠️  Mevcut user bulunamadı, yeni oluşturuluyor…');
    authRes = await api('POST', '/auth/v1/admin/users', {
      email: 'coach@test.5mevsim',
      password: 'Test1234!',
      email_confirm: true,
    });
    if (!authRes.ok) {
      console.error('❌  Auth user oluşturulamadı:', JSON.stringify(authRes.data));
      process.exit(1);
    }
    COACH_ID = authRes.data.id; // yeni UUID
    console.log(`  (yeni UUID: ${COACH_ID})`);
  }

  if (!authRes.ok) {
    console.error(`❌  (${authRes.status})`, JSON.stringify(authRes.data));
    process.exit(1);
  }
  console.log(`✅  ${authRes.data?.email ?? COACH_ID}`);

  // ── 2. profiles tablosu: coach kaydı upsert ─────────────────────────────
  process.stdout.write('2/3  Coach profil kaydı ayarlanıyor… ');
  const profRes = await api(
    'POST',
    '/rest/v1/profiles',
    { id: COACH_ID, full_name: 'Test Antrenör', role: 'coach', school_id: SCHOOL_ID },
    { Prefer: 'resolution=merge-duplicates,return=minimal' },
  );
  if (!profRes.ok && profRes.status !== 204) {
    console.log(`⚠️  (${profRes.status}) ${JSON.stringify(profRes.data)}`);
  } else {
    console.log('✅');
  }

  // ── 3. staff.profile_id → coach bağla ───────────────────────────────────
  process.stdout.write('3/3  Staff kaydı profile bağlanıyor… ');
  const staffRes = await api(
    'PATCH',
    `/rest/v1/staff?id=eq.${STAFF_ID}`,
    { profile_id: COACH_ID, is_active: true },
  );
  console.log(staffRes.status === 204 ? '✅' : `⚠️  (${staffRes.status})`);

  console.log(`
✨  Kurulum tamamlandı!

📱  Uygulamada test girişi:
    Herhangi 10 haneli numara gir  →  ör: 5559990001
    "Doğrulama Kodu Gönder" butonuna bas
    → Dev bypass otomatik devreye girer
    → Antrenör ana sayfasına yönlendirilirsiniz

📋  Bağlı grup: U9 Salı-Perşembe 17:00
    Bugün Salı veya Perşembe ise anasayfada oturum kartı görünür.
`);
}

main().catch(console.error);
