const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', 'host.docker.internal'])
const SUPABASE_HOST_SUFFIX = '.supabase.co'

function parseProtectedRefs(value) {
  return new Set(
    (value ?? '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  )
}

export function resolveSafeDevelopmentTarget(urlValue, protectedRefsValue) {
  let target
  try {
    target = new URL(urlValue)
  } catch {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL geçerli bir URL değil')
  }

  const hostname = target.hostname.toLowerCase()
  if (LOCAL_HOSTS.has(hostname)) {
    return {
      kind: 'local',
      protectedProjectRefs: protectedRefsValue ?? '',
    }
  }

  if (!hostname.endsWith(SUPABASE_HOST_SUFFIX)) {
    throw new Error('Geliştirme hedefi local veya tanınan bir Supabase projesi olmalıdır')
  }

  const projectRef = hostname.slice(0, -SUPABASE_HOST_SUFFIX.length)
  if (!projectRef) {
    throw new Error('Supabase project ref belirlenemedi')
  }

  const protectedRefs = parseProtectedRefs(protectedRefsValue)
  protectedRefs.add(projectRef)

  return {
    kind: 'remote_read_only',
    protectedProjectRefs: [...protectedRefs].join(','),
  }
}

export function resolveWritableStagingTarget(urlValue, stagingRefValue, protectedRefsValue) {
  let target
  try {
    target = new URL(urlValue)
  } catch {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL geçerli bir URL değil')
  }

  const hostname = target.hostname.toLowerCase()
  if (!hostname.endsWith(SUPABASE_HOST_SUFFIX)) {
    throw new Error('Yazılabilir staging hedefi tanınan bir Supabase projesi olmalıdır')
  }

  const projectRef = hostname.slice(0, -SUPABASE_HOST_SUFFIX.length)
  const stagingRef = (stagingRefValue ?? '').trim().toLowerCase()
  if (!stagingRef || stagingRef !== projectRef) {
    throw new Error('staging_supabase_target_mismatch')
  }

  const protectedRefs = parseProtectedRefs(protectedRefsValue)
  if (protectedRefs.size === 0) {
    throw new Error('protected_supabase_refs_missing')
  }
  if (protectedRefs.has(projectRef)) {
    throw new Error('protected_supabase_target_blocked')
  }

  return { projectRef, protectedProjectRefs: [...protectedRefs].join(',') }
}
