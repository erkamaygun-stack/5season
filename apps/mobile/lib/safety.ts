type MobileEnvironment = 'development' | 'test' | 'preview' | 'staging' | 'production' | 'unknown';
type FetchImplementation = typeof globalThis.fetch;

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '10.0.2.2']);
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const BLOCKED_MUTATION_PREFIXES = ['/rest/v1/', '/storage/v1/', '/functions/v1/', '/auth/v1/admin/'];

function resolveEnvironment(): MobileEnvironment {
  const value = process.env.EXPO_PUBLIC_APP_ENV;
  if (value === 'development' || value === 'test' || value === 'preview' || value === 'staging' || value === 'production') {
    return value;
  }
  return 'unknown';
}

function projectRef(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.endsWith('.supabase.co') ? hostname.slice(0, -'.supabase.co'.length) : null;
  } catch {
    return null;
  }
}

function isLocal(url: string): boolean {
  try {
    return LOCAL_HOSTS.has(new URL(url).hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function getSafeMobileSupabaseConfig(): { url: string; anonKey: string } {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('supabase_config_missing');

  const environment = resolveEnvironment();
  if (environment !== 'production' && !isLocal(url)) {
    const protectedRefs = new Set(
      (process.env.EXPO_PUBLIC_PROTECTED_SUPABASE_PROJECT_REFS ?? '')
        .split(',')
        .map((item: string) => item.trim().toLowerCase())
        .filter(Boolean),
    );
    const ref = projectRef(url);

    if (protectedRefs.size === 0) throw new Error('protected_supabase_refs_missing');
    if (!ref) throw new Error('unrecognized_remote_supabase_target');
    if (protectedRefs.has(ref)) throw new Error('protected_supabase_target_blocked');
  }

  return { url, anonKey };
}

function isProtectedMutation(url: string, method: string): boolean {
  if (process.env.EXPO_PUBLIC_PROTECTED_DATA_MODE === 'false' || SAFE_METHODS.has(method.toUpperCase())) {
    return false;
  }

  try {
    const pathname = new URL(url).pathname;
    return BLOCKED_MUTATION_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  } catch {
    return true;
  }
}

export function createMobileProtectedFetch(
  fetchImplementation: FetchImplementation = globalThis.fetch,
): FetchImplementation {
  return async (input, init) => {
    const request = typeof Request !== 'undefined' && input instanceof Request ? input : null;
    const url = request?.url ?? String(input);
    const method = init?.method ?? request?.method ?? 'GET';

    if (isProtectedMutation(url, method)) {
      throw new Error('blocked_by_protected_data_mode');
    }

    return fetchImplementation(input, init);
  };
}
