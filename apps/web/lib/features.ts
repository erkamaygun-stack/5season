export function isAttendanceTakingEnabled() {
  const serverValue = typeof window === 'undefined' ? process.env.ATTENDANCE_ENABLED : undefined
  return (serverValue ?? process.env.NEXT_PUBLIC_ATTENDANCE_ENABLED) === 'true'
}

export function assertAttendanceTakingEnabled() {
  if (!isAttendanceTakingEnabled()) {
    throw new Error('Yoklama alma beta sürecinde devre dışı.')
  }
}
