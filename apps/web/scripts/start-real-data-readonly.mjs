import path from 'node:path'
import process from 'node:process'
import { spawn } from 'node:child_process'
import nextEnv from '@next/env'

const { loadEnvConfig } = nextEnv
loadEnvConfig(process.cwd(), true)

const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
if (!configuredUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL tanımlı değil')
}

const target = new URL(configuredUrl)
const suffix = '.supabase.co'
if (!target.hostname.toLowerCase().endsWith(suffix)) {
  throw new Error('Bu komut yalnızca açıkça tanınan uzak Supabase hedefi için kullanılabilir')
}

const projectRef = target.hostname.toLowerCase().slice(0, -suffix.length)
const protectedRefs = new Set(
  (process.env.NEXT_PUBLIC_PROTECTED_SUPABASE_PROJECT_REFS ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
)
protectedRefs.add(projectRef)

const nextCli = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next')
const child = spawn(process.execPath, [nextCli, 'dev', '--turbo'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development',
    APP_ENV: 'development',
    NEXT_PUBLIC_APP_ENV: 'development',
    NEXT_PUBLIC_REAL_DATA_TEST_MODE: 'read_only',
    NEXT_PUBLIC_PROTECTED_SUPABASE_PROJECT_REFS: [...protectedRefs].join(','),
    NEXT_PUBLIC_PROTECTED_DATA_MODE: 'true',
    PROTECTED_DATA_MODE: 'true',
    OUTBOUND_DELIVERY_MODE: 'disabled',
    OUTBOUND_RECIPIENT_ALLOWLIST: '',
    SUPABASE_SERVICE_ROLE_KEY: '',
  },
})

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 1)
})
