export function safePasswordResetNextPath(value: string | null) {
  if (!value?.startsWith('/') || value.startsWith('//')) {
    return '/update-password'
  }

  return value
}
