export type AppEnvironment = 'development' | 'test' | 'preview' | 'staging' | 'production' | 'unknown'

type SupabaseTargetInput = {
  url: string | undefined
  anonKey: string | undefined
  appEnvironment: AppEnvironment
  protectedProjectRefs: string | undefined
}

export type SafeSupabaseConfig = {
  url: string
  anonKey: string
  appEnvironment: AppEnvironment
  projectRef: string | null
  isLocal: boolean
}

const LOCAL_SUPABASE_HOSTS = new Set(['127.0.0.1', 'localhost', 'host.docker.internal'])

export function getSupabaseProjectRef(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    const suffix = '.supabase.co'
    return hostname.endsWith(suffix) ? hostname.slice(0, -suffix.length) : null
  } catch {
    return null
  }
}

function isLocalSupabaseUrl(url: string): boolean {
  try {
    return LOCAL_SUPABASE_HOSTS.has(new URL(url).hostname.toLowerCase())
  } catch {
    return false
  }
}

function parseProtectedRefs(value: string | undefined): Set<string> {
  return new Set(
    (value ?? '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  )
}

export function assertSafeSupabaseTarget(input: SupabaseTargetInput): SafeSupabaseConfig {
  if (!input.url || !input.anonKey) {
    throw new Error('supabase_config_missing')
  }

  const isLocal = isLocalSupabaseUrl(input.url)
  const projectRef = getSupabaseProjectRef(input.url)

  if (input.appEnvironment !== 'production' && !isLocal) {
    const protectedRefs = parseProtectedRefs(input.protectedProjectRefs)

    // Uzak bir geliştirme/staging hedefi kullanılıyorsa korunan production ref'leri
    // açıkça tanımlanmadan bağlantı kurulmaz. Bu, yanlış .env ile gerçek verinin
    // okunmasını da yazılmasını da uygulama açılmadan engeller.
    if (protectedRefs.size === 0) {
      throw new Error('protected_supabase_refs_missing')
    }

    if (!projectRef) {
      throw new Error('unrecognized_remote_supabase_target')
    }

    if (protectedRefs.has(projectRef)) {
      throw new Error('protected_supabase_target_blocked')
    }
  }

  return {
    url: input.url,
    anonKey: input.anonKey,
    appEnvironment: input.appEnvironment,
    projectRef,
    isLocal,
  }
}

function resolveAppEnvironment(): AppEnvironment {
  const configured = process.env.NEXT_PUBLIC_APP_ENV
  if (configured === 'development' || configured === 'test' || configured === 'preview' || configured === 'staging' || configured === 'production') {
    return configured
  }

  if (process.env.NODE_ENV === 'development') return 'development'
  if (process.env.NODE_ENV === 'test') return 'test'
  return 'unknown'
}

export function getWebSupabaseConfig(): SafeSupabaseConfig {
  return assertSafeSupabaseTarget({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    appEnvironment: resolveAppEnvironment(),
    protectedProjectRefs: process.env.NEXT_PUBLIC_PROTECTED_SUPABASE_PROJECT_REFS,
  })
}
