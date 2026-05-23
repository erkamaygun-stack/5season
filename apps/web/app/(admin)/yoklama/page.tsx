import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { today } from '@/lib/utils'

export default async function YoklamaPage() {
  const supabase = await createClient()
  const todayStr = today()

  const { data: sessions } = await supabase
    .from('attendance_sessions')
    .select(`
      id, start_time, end_time, status,
      groups(name),
      attendance_records(id, status, students(full_name))
    `)
    .eq('session_date', todayStr)
    .order('start_time')

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Yoklama — Bugün</h1>
      {(!sessions || sessions.length === 0) ? (
        <div className="rounded-lg border bg-white p-12 text-center text-sm text-gray-500">
          Bugün planlanmış antrenman yok.
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session: any) => (
            <div key={session.id} className="rounded-lg border bg-white overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                <div>
                  <p className="font-medium text-gray-900">{session.groups?.name}</p>
                  <p className="text-xs text-gray-500">{session.start_time?.slice(0, 5)} – {session.end_time?.slice(0, 5)}</p>
                </div>
                <Badge variant={session.status === 'cancelled' ? 'destructive' : session.status === 'completed' ? 'success' : 'secondary'}>
                  {session.status === 'scheduled' ? 'Planlandı' : session.status === 'completed' ? 'Tamamlandı' : 'İptal'}
                </Badge>
              </div>
              <div className="divide-y">
                {(session.attendance_records ?? []).map((ar: any) => (
                  <div key={ar.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-gray-900">{ar.students?.full_name}</span>
                    <Badge variant={ar.status === 'present' ? 'success' : ar.status === 'absent' ? 'destructive' : 'warning'}>
                      {ar.status === 'present' ? 'Geldi' : ar.status === 'absent' ? 'Gelmedi' : 'İzinli'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
