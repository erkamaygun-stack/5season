import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const testsDir = path.dirname(fileURLToPath(import.meta.url))
const migrationsDir = path.resolve(testsDir, '../../../supabase/migrations')

async function migrations() {
  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort()
  return Promise.all(files.map(async (file) => ({
    file,
    sql: await readFile(path.join(migrationsDir, file), 'utf8'),
  })))
}

test('migration files are ordered, transactional and have balanced dollar quotes', async () => {
  const files = await migrations()
  assert.ok(files.length >= 20)
  assert.deepEqual(files.map(({ file }) => file), [...files.map(({ file }) => file)].sort())

  for (const { file, sql } of files) {
    const dollarQuotes = sql.match(/\$\$/g)?.length ?? 0
    assert.equal(dollarQuotes % 2, 0, `${file}: unbalanced dollar quotes`)
    if (/^begin;/im.test(sql)) {
      assert.match(sql, /commit;\s*$/i, `${file}: transaction must end with commit`)
    }
  }
})

test('WhatsApp pipeline contains all fail-closed worker boundaries', async () => {
  const files = await migrations()
  const pipeline = files.find(({ file }) => file === '20260830000001_whatsapp_delivery_pipeline.sql')?.sql
  assert.ok(pipeline)

  for (const boundary of [
    'ingest_whatsapp_message',
    'claim_whatsapp_inbound_jobs',
    'finalize_whatsapp_receipt_media',
    'select_whatsapp_receipt_invoice',
    'claim_integration_outbox',
    'complete_integration_outbox',
    'enqueue_due_aidat_reminders',
    'claim_receipt_cleanup',
    'complete_receipt_cleanup',
    'match_receipt_submission',
  ]) {
    assert.match(pipeline, new RegExp(`function public\\.${boundary}\\b`), boundary)
  }

  assert.match(pipeline, /allowed_mime_types = array\['image\/jpeg', 'image\/png'\]/)
  assert.match(pipeline, /for update skip locked/i)
  assert.match(pipeline, /to service_role;/i)
  assert.doesNotMatch(pipeline, /public\.current_role\(\)/i)
})

test('new SECURITY DEFINER functions are never granted to anon or public', async () => {
  const files = await migrations()
  const pipeline = files.find(({ file }) => file === '20260830000001_whatsapp_delivery_pipeline.sql')?.sql ?? ''
  assert.doesNotMatch(pipeline, /grant\s+execute[\s\S]{0,200}\bto\s+(?:anon|public)\b/i)
})

test('coach app access requires an active coach assignment and permits school administrators', async () => {
  const files = await migrations()
  const accessMigration = files.find(({ file }) => file === '20260901000001_admin_coach_app_access.sql')?.sql
  assert.ok(accessMigration)
  assert.match(accessMigration, /p\.role in \('coach', 'school_admin'\)/i)
  assert.match(accessMigration, /s\.staff_type = 'coach'/i)
  assert.match(accessMigration, /s\.school_id = p\.school_id/i)
  assert.match(accessMigration, /s\.is_active = true/i)
})

test('school logo upsert policies include authenticated select and same-school folder checks', async () => {
  const files = await migrations()
  const logoMigration = files.find(({ file }) => file === '20260901000002_school_logo_storage_policy.sql')?.sql
  assert.ok(logoMigration)
  assert.match(logoMigration, /for select to authenticated/i)
  assert.match(logoMigration, /storage\.foldername\(name\)/i)
  assert.match(logoMigration, /public\.current_school_id\(\)::text/i)
  assert.match(logoMigration, /for update to authenticated[\s\S]*with check/i)
})

test('pilot seed uses the guardian model and keeps outbound communication disabled', async () => {
  const seed = await readFile(path.resolve(migrationsDir, '../seed.sql'), 'utf8')

  for (const requiredTable of [
    'public.guardians',
    'public.guardian_students',
    'public.student_groups',
    'public.attendance_sessions',
    'public.whatsapp_channels',
  ]) {
    assert.match(seed, new RegExp('insert into ' + requiredTable.replace('.', '\\\.'), 'i'))
  }

  assert.match(seed, /'quarantined'/i)
  assert.match(seed, /'disabled'/i)
  assert.doesNotMatch(seed, /insert into (?:public\.)?parent_student/i)
  assert.doesNotMatch(seed, /role[^\n]*'parent'/i)
})
