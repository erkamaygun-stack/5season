import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface StudentAbsence {
  id: string
  name: string
  count: number
}

export default function TopAbsentStudents({ students }: { students: StudentAbsence[] }) {
  if (students.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">En Çok Devamsızlık</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Devamsızlık kaydı yok.</p>
        </CardContent>
      </Card>
    )
  }

  const max = students[0]?.count ?? 1

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">En Çok Devamsızlık (İlk 5)</CardTitle>
        <Link href="/yoklama" className="text-xs text-primary hover:underline">Tümünü gör</Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {students.map((s, i) => (
          <div key={s.id} className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-400 w-4 text-right flex-shrink-0">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-900 truncate">{s.name}</span>
                <span className="text-xs font-semibold text-orange-600 flex-shrink-0 ml-2">{s.count} gün</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-400 rounded-full"
                  style={{ width: `${Math.round((s.count / max) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
