import Link from 'next/link'
import { Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Session {
  id: string
  start_time: string
  end_time: string
  status: string
  groups: { name: string } | null
}

export default function TodaySessions({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Bugünün Antrenmanları</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Bugün için planlanmış antrenman yok.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Bugünün Antrenmanları</CardTitle>
        <Link href="/yoklama" className="text-xs text-primary hover:underline">Tümünü gör</Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {sessions.map((s) => (
          <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">{s.groups?.name ?? 'Grup'}</p>
                <p className="text-xs text-gray-500">{s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}</p>
              </div>
            </div>
            <Badge variant={s.status === 'cancelled' ? 'destructive' : s.status === 'completed' ? 'success' : 'secondary'}>
              {s.status === 'scheduled' ? 'Planlandı' : s.status === 'completed' ? 'Tamamlandı' : 'İptal'}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
