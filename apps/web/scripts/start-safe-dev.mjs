import path from 'node:path'
import process from 'node:process'
import { spawn } from 'node:child_process'
import nextEnv from '@next/env'
import { resolveSafeDevelopmentTarget } from '../lib/safety/dev-environment.mjs'

const { loadEnvConfig } = nextEnv
loadEnvConfig(process.cwd(), true)

const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const configuredAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!configuredUrl || !configuredAnonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY tanımlanmalıdır')
}

const target = resolveSafeDevelopmentTarget(
  configuredUrl,
  process.env.NEXT_PUBLIC_PROTECTED_SUPABASE_PROJECT_REFS,
)

const safeEnvironment = {
  ...process.env,
  NODE_ENV: 'development',
  APP_ENV: 'development',
  NEXT_PUBLIC_APP_ENV: 'development',
  OUTBOUND_DELIVERY_MODE: 'disabled',
  OUTBOUND_RECIPIENT_ALLOWLIST: '',
}

if (target.kind === 'remote_read_only') {
  Object.assign(safeEnvironment, {
    NEXT_PUBLIC_REAL_DATA_TEST_MODE: 'read_only',
    NEXT_PUBLIC_PROTECTED_SUPABASE_PROJECT_REFS: target.protectedProjectRefs,
    NEXT_PUBLIC_PROTECTED_DATA_MODE: 'true',
    PROTECTED_DATA_MODE: 'true',
    SUPABASE_SERVICE_ROLE_KEY: '',
  })
  process.stdout.write('5mevsim: uzak Supabase hedefi salt-okunur test modunda açılıyor.\n')
} else {
  Object.assign(safeEnvironment, {
    NEXT_PUBLIC_REAL_DATA_TEST_MODE: '',
    NEXT_PUBLIC_PROTECTED_DATA_MODE: 'false',
    PROTECTED_DATA_MODE: 'false',
  })
  process.stdout.write('5mevsim: local Supabase geliştirme modu açılıyor.\n')
}

const nextCli = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next')
const child = spawn(
  process.execPath,
  [nextCli, 'dev', '--turbopack', ...process.argv.slice(2)],
  {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: safeEnvironment,
  },
)

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 1)
})
