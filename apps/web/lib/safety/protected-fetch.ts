type FetchImplementation = typeof globalThis.fetch

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const SAFE_AUTH_MUTATION_PATHS = new Set(['/auth/v1/token', '/auth/v1/logout'])
const SAFE_STORAGE_MUTATION_PREFIXES = ['/storage/v1/object/sign/']

export function isProtectedDataMode(): boolean {
  const serverValue = typeof window === 'undefined' ? process.env.PROTECTED_DATA_MODE : undefined
  const configured = serverValue ?? process.env.NEXT_PUBLIC_PROTECTED_DATA_MODE
  return configured !== 'false'
}

export function isBlockedProtectedMutation(url: string, method: string, protectedMode: boolean): boolean {
  if (!protectedMode || SAFE_METHODS.has(method.toUpperCase())) return false

  try {
    const pathname = new URL(url).pathname
    if (SAFE_AUTH_MUTATION_PATHS.has(pathname)) return false
    if (SAFE_STORAGE_MUTATION_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return false

    // Bu fetch yalnızca Supabase istemcilerine verilir. Salt-okunur koruma
    // modunda açıkça izin verilmemiş her mutasyon fail-closed engellenir.
    return true
  } catch {
    // Supabase istemcisi mutlak URL kullanır. Tanınmayan bir hedefte fail-closed.
    return true
  }
}

export function createProtectedFetch(
  fetchImplementation: FetchImplementation = globalThis.fetch,
  protectedMode = isProtectedDataMode(),
): FetchImplementation {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : null
    const url = request?.url ?? String(input)
    const method = init?.method ?? request?.method ?? 'GET'

    if (isBlockedProtectedMutation(url, method, protectedMode)) {
      throw new Error('blocked_by_protected_data_mode')
    }

    return fetchImplementation(input, init)
  }
}
