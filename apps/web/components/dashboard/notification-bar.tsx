import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { daysUntilCollection, today } from '@/lib/utils'
import { chipStyle, TAHSILAT_COLOR, DEKONT_COLOR } from '@/lib/notification-colors'
import CancelledSessionsDialog, {
  type CancelledSessionRow,
} from './cancelled-sessions-dialog'
import AbsencesDialog, { type AbsenceRow } from './absences-dialog'

export default async function NotificationBar() {
  const supabase = await createClient()
  const todayStr = today()
  const now = new Date()
  const periodYear = now.getFullYear()
  const periodMonth = now.getMonth() + 1

  const [
    schoolResult,
    pendingDekontResult,
    activeStudentsResult,
    cancelledRawResult,
    sessionsTodayResult,
  ] = await Promise.all([
    supabase.from('schools').select('collection_day').limit(1).single(),
    (supabase as any)
      .from('receipt_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending_review'),
    supabase.from('students').select('id').eq('status', 'active'),
    supabase
      .from('attendance_sessions')
      .select('id, session_date, start_time, end_time, group_id, groups(name), cancelled_by')
      .eq('status', 'cancelled')
      .is('acknowledged_at', null)
      .gte('session_date', todayStr)
      .order('session_date'),
    supabase
      .from('attendance_sessions')
      .select(
        'id, group_id, taken_by, groups(name), attendance_records(id, student_id, status, dismissed_at, students(full_name))',
      )
      .eq('session_date', todayStr),
  ])

  const collectionDay = (schoolResult.data as any)?.collection_day ?? 1
  const pendingDekont = pendingDekontResult.count ?? 0
  const activeIds = (activeStudentsResult.data ?? []).map((s: any) => s.id)

  let paidCount = 0
  if (activeIds.length > 0) {
    const { count } = await supabase
      .from('aidat_invoices')
      .select('id', { count: 'exact', head: true })
      .eq('period_year', periodYear)
      .eq('period_month', periodMonth)
      .eq('status', 'paid')
      .in('student_id', activeIds)
    paidCount = count ?? 0
  }

  // İptal edilen antrenmanlar için iptal eden isimlerini topluca çöz
  const cancelledRaw = cancelledRawResult.data ?? []
  const cancelledByIds = Array.from(
    new Set(cancelledRaw.map((s: any) => s.cancelled_by).filter(Boolean)),
  ) as string[]
  const cancelledByMap: Record<string, string> = {}
  if (cancelledByIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', cancelledByIds)
    ;(profiles ?? []).forEach((p: any) => {
      cancelledByMap[p.id] = p.full_name
    })
  }
  const cancelledSessions: CancelledSessionRow[] = cancelledRaw.map((s: any) => ({
    id: s.id,
    date: s.session_date,
    startTime: s.start_time,
    endTime: s.end_time,
    groupName: s.groups?.name ?? '—',
    cancelledBy: s.cancelled_by ? (cancelledByMap[s.cancelled_by] ?? null) : null,
  }))

  // Bugünkü devamsızlıklar için yoklamayı alan antrenör isimlerini topluca çöz
  const sessionsToday = sessionsTodayResult.data ?? []
  const takenByIds = Array.from(
    new Set(sessionsToday.map((s: any) => s.taken_by).filter(Boolean)),
  ) as string[]
  const takenByMap: Record<string, string> = {}
  if (takenByIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', takenByIds)
    ;(profiles ?? []).forEach((p: any) => {
      takenByMap[p.id] = p.full_name
    })
  }
  const absences: AbsenceRow[] = []
  for (const s of sessionsToday as any[]) {
    for (const r of s.attendance_records ?? []) {
      if (r.status === 'absent' && !r.dismissed_at) {
        absences.push({
          id: r.id,
          studentName: r.students?.full_name ?? '—',
          groupName: s.groups?.name ?? '—',
          coachName: s.taken_by ? (takenByMap[s.taken_by] ?? null) : null,
        })
      }
    }
  }

  const dateStr = now.toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  const daysLeft = daysUntilCollection(collectionDay)
  const collectionLabel =
    daysLeft === 0 ? 'Tahsilat bugün' : `Tahsilata ${daysLeft} gün kaldı`

  const tahsilatChip = chipStyle(paidCount > 0, TAHSILAT_COLOR)
  const dekontChip = chipStyle(pendingDekont > 0, DEKONT_COLOR)

  return (
    <div className="flex flex-wrap items-center gap-3 text-base text-muted-foreground">
      <span>{dateStr}</span>
      <span>·</span>
      <span>{collectionLabel}</span>
      <span className="mx-1 h-5 w-px bg-border" />
      <Link href="/finans?tab=aidat" className={tahsilatChip.className} style={tahsilatChip.style}>
        <span className="font-semibold tabular-nums">{paidCount}/{activeIds.length}</span>
        tahsilat oranı
      </Link>
      <Link href="/finans?tab=dekontlar" className={dekontChip.className} style={dekontChip.style}>
        <span className="font-semibold tabular-nums">{pendingDekont}</span>
        bekleyen dekont
      </Link>
      <AbsencesDialog absences={absences} />
      <CancelledSessionsDialog sessions={cancelledSessions} />
    </div>
  )
}
