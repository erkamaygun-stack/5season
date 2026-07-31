'use client'
// useState ile interaktif yoklama işaretleme gerekiyor

import { useTransition, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { upsertAttendance } from './actions'

type Status = 'present' | 'absent' | 'late' | 'excused'

const STATUSES: { value: Status; label: string; active: string; idle: string }[] = [
  { value: 'present', label: 'Geldi',   active: 'bg-green-600 text-white',  idle: 'bg-muted text-muted-foreground hover:bg-green-900/30 hover:text-green-400' },
  { value: 'absent',  label: 'Gelmedi', active: 'bg-red-500 text-white',    idle: 'bg-muted text-muted-foreground hover:bg-red-900/30 hover:text-red-400' },
  { value: 'late',    label: 'Geç',     active: 'bg-yellow-500 text-white', idle: 'bg-muted text-muted-foreground hover:bg-yellow-900/30 hover:text-yellow-400' },
  { value: 'excused', label: 'İzinli',  active: 'bg-blue-500 text-white',   idle: 'bg-muted text-muted-foreground hover:bg-blue-900/30 hover:text-blue-400' },
]

interface AttendanceRecord {
  id: string; status: string; student_id: string
  students: { full_name: string } | null
}
interface Session {
  id: string; start_time: string; end_time: string; status: string; group_id: string
  groups: { name: string } | null
  attendance_records: AttendanceRecord[]
}

function StudentRow({
  sessionId,
  studentId,
  fullName,
  initialStatus,
}: {
  sessionId: string
  studentId: string
  fullName: string
  initialStatus: string | null
}) {
  const [status, setStatus] = useState<string | null>(initialStatus)
  const [isPending, startTransition] = useTransition()

  function mark(s: Status) {
    if (s === status) return
    const prev = status
    setStatus(s)
    startTransition(async () => {
      try {
        await upsertAttendance(sessionId, studentId, s)
      } catch {
        setStatus(prev)
        toast.error('Yoklama kaydedilemedi')
      }
    })
  }

  return (
    <div className={`flex items-center justify-between px-4 py-2.5 text-sm ${isPending ? 'opacity-60' : ''}`}>
      <span className="text-foreground font-medium">{fullName}</span>
      <div className="flex gap-1">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            disabled={isPending}
            onClick={() => mark(s.value)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${status === s.value ? s.active : s.idle}`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function YoklamaClient({
  sessions,
  groupStudentMap,
}: {
  sessions: Session[]
  groupStudentMap: Record<string, { id: string; full_name: string }[]>
}) {
  return (
    <div className="space-y-4">
      {sessions.map((session) => {
        const recordMap: Record<string, string> = {}
        for (const ar of session.attendance_records) {
          recordMap[ar.student_id] = ar.status
        }

        // Gruptaki tüm aktif öğrenciler; varsa record ile, yoksa null status ile
        const allStudents = groupStudentMap[session.group_id] ?? []

        // Record'ı olan ama grup listesinde olmayan öğrencileri de dahil et
        const extraStudents = session.attendance_records
          .filter((ar) => !allStudents.some((s) => s.id === ar.student_id))
          .map((ar) => ({ id: ar.student_id, full_name: ar.students?.full_name ?? '—' }))

        const students = [...allStudents, ...extraStudents]

        return (
          <div key={session.id} className="rounded-lg border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b">
              <div>
                <p className="font-medium text-foreground">{session.groups?.name}</p>
                <p className="text-xs text-muted-foreground">{session.start_time?.slice(0, 5)} – {session.end_time?.slice(0, 5)}</p>
              </div>
              <Badge variant={session.status === 'cancelled' ? 'destructive' : session.status === 'completed' ? 'success' : 'secondary'}>
                {session.status === 'scheduled' ? 'Planlandı' : session.status === 'completed' ? 'Tamamlandı' : 'İptal'}
              </Badge>
            </div>
            {students.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">Bu grupta aktif öğrenci yok.</p>
            ) : (
              <div className="divide-y">
                {students.map((student) => (
                  <StudentRow
                    key={student.id}
                    sessionId={session.id}
                    studentId={student.id}
                    fullName={student.full_name}
                    initialStatus={recordMap[student.id] ?? null}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
