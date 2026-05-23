#!/usr/bin/env node
/**
 * Bugün ve yakın günler için test attendance_sessions oluşturur.
 * Çalıştır: node scripts/create-today-sessions.mjs
 */

const SUPABASE_URL = 'https://sbajlpkpwcexhwdrbfgv.supabase.co';
const SERVICE_ROLE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
  '.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiYWpscGtwd2NleGh3ZHJiZmd2Iiwicm9sZSI6' +
  'InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA5Mjk2NSwiZXhwIjoyMDkzNjY4OTY1fQ' +
  '._V45pPcX98Z3qIsWr82MNUj_9HdtQUKJv5BGtZ5lu38';

const SCHOOL_ID = '11111111-1111-1111-1111-111111111111';

// Gruplar ve programları
const GROUP_SCHEDULES = [
  { groupId: '33333333-3333-3333-3333-333333333301', start: '17:00', end: '18:00', days: [2, 4] }, // U9: Salı+Perş
  { groupId: '33333333-3333-3333-3333-333333333302', start: '18:00', end: '19:00', days: [2, 4] }, // U11: Salı+Perş
  { groupId: '33333333-3333-3333-3333-333333333303', start: '10:00', end: '11:30', days: [6] },    // U13: Cumartesi
];

const HDR = {
  Authorization: `Bearer ${SERVICE_ROLE}`,
  apikey: SERVICE_ROLE,
  'Content-Type': 'application/json',
};

function isoDate(d) {
  return d.toISOString().split('T')[0];
}

async function main() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Bugün + sonraki 7 gün için session oluştur
  const sessions = [];
  for (let offset = 0; offset <= 7; offset++) {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    const dow = d.getDay(); // 0=Pazar ... 6=Cumartesi

    for (const g of GROUP_SCHEDULES) {
      if (g.days.includes(dow)) {
        sessions.push({
          school_id: SCHOOL_ID,
          group_id: g.groupId,
          session_date: isoDate(d),
          start_time: g.start,
          end_time: g.end,
          status: 'scheduled',
        });
      }
    }
  }

  // Bugün için U9'u mutlaka ekle (test için — normalde programda olmasa da)
  const todayStr = isoDate(today);
  const u9Today = sessions.find(
    (s) => s.session_date === todayStr && s.group_id === '33333333-3333-3333-3333-333333333301',
  );
  if (!u9Today) {
    sessions.push({
      school_id: SCHOOL_ID,
      group_id: '33333333-3333-3333-3333-333333333301',
      session_date: todayStr,
      start_time: '17:00',
      end_time: '18:00',
      status: 'scheduled',
    });
    console.log(`ℹ️  Bugün (${todayStr}) U9 programda yok, yine de test session eklendi.`);
  }

  console.log(`📅  ${sessions.length} session oluşturuluyor (${todayStr} + 7 gün)…\n`);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/attendance_sessions`, {
    method: 'POST',
    headers: { ...HDR, Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify(sessions),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('❌  Hata:', JSON.stringify(data));
    process.exit(1);
  }

  const created = Array.isArray(data) ? data : [];
  if (created.length === 0) {
    console.log('ℹ️  Tüm session\'lar zaten vardı (conflict ignore edildi).');
  } else {
    created.forEach((s) =>
      console.log(`  ✅  ${s.session_date}  ${s.start_time}  group: ...${s.group_id.slice(-4)}`),
    );
  }

  console.log('\n✨  Tamamlandı! Uygulamayı yenileyin — anasayfada bugünkü antrenman görünmeli.');
}

main().catch(console.error);
