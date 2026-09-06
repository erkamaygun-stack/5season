import path from 'node:path';
import process from 'node:process';
import { execFileSync, spawn } from 'node:child_process';

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function assertProjectRef(value, label) {
  const normalized = (value ?? '').trim().toLowerCase();
  if (!/^[a-z]{20}$/.test(normalized)) {
    throw new Error(`${label}_missing_or_invalid`);
  }
  return normalized;
}

const stagingRef = assertProjectRef(readArg('--project-ref'), 'staging_project_ref');
const protectedRef = assertProjectRef(readArg('--protected-project-ref'), 'protected_project_ref');
if (stagingRef === protectedRef) throw new Error('protected_supabase_target_blocked');
const requestedPort = readArg('--port');
if (requestedPort && !/^\d{4,5}$/.test(requestedPort)) throw new Error('invalid_port');

const workspaceRoot = path.resolve(process.cwd(), '../..');
const keyCommand = [
  'supabase', 'projects', 'api-keys', '--project-ref', stagingRef, '--output-format', 'json',
];
const keyOutput = execFileSync(
  process.platform === 'win32' ? (process.env.ComSpec ?? 'cmd.exe') : 'npx',
  process.platform === 'win32'
    ? ['/d', '/s', '/c', `npx ${keyCommand.join(' ')}`]
    : keyCommand,
  { cwd: workspaceRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
);
const keys = JSON.parse(keyOutput);
const publishableKey = keys.find((key) => key.type === 'publishable')?.api_key
  ?? keys.find((key) => key.name === 'anon')?.api_key;
if (!publishableKey) throw new Error('staging_publishable_key_missing');

const expoCli = path.join(process.cwd(), 'node_modules', 'expo', 'bin', 'cli');
const expoArgs = [expoCli, 'start', '--web'];
if (requestedPort) expoArgs.push('--port', requestedPort);
const child = spawn(process.execPath, expoArgs, {
  cwd: process.cwd(),
  stdio: 'inherit',
  env: {
    ...process.env,
    EXPO_PUBLIC_APP_ENV: 'staging',
    EXPO_PUBLIC_SUPABASE_URL: `https://${stagingRef}.supabase.co`,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: publishableKey,
    EXPO_PUBLIC_PROTECTED_SUPABASE_PROJECT_REFS: protectedRef,
    EXPO_PUBLIC_PROTECTED_DATA_MODE: 'false',
  },
});

process.stdout.write('5mevsim mobil web: doğrulanmış staging projesine bağlanıyor.\n');

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
