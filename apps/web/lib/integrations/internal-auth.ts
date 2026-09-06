import { timingSafeEqual } from 'node:crypto'

function safeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, 'utf8')
  const rightBytes = Buffer.from(right, 'utf8')
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes)
}

export function isAuthorizedInternalJob(request: Request): boolean {
  const configuredSecret = process.env.INTEGRATION_JOB_SECRET
  if (!configuredSecret || configuredSecret.length < 32) return false
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return false
  return safeEqual(authorization.slice('Bearer '.length), configuredSecret)
}
