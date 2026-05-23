import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TR_DAYS } from '@/lib/utils'
import { Users } from 'lucide-react'
import AddGroupModal from '@/components/gruplar/add-group-modal'

export default async function GruplarPage() {
  const supabase = await createClient()

  const [{ data: groups }, { data: coaches }] = await Promise.all([
    supabase
      .from('groups')
      .select(`
        id, name, age_min, age_max, capacity, is_active,
        group_schedule_slots(id, day_of_week, start_time, end_time),
        student_groups(id, is_active),
        staff(full_name)
      `)
      .order('name'),
    supabase
      .from('staff')
      .select('id, full_name')
      .eq('staff_type', 'coach')
      .eq('is_active', true)
      .order('full_name'),
  ])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Gruplar</h1>
        <AddGroupModal coaches={coaches ?? []} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(groups ?? []).map((g: any) => {
          const activeStudents = (g.student_groups ?? []).filter((sg: any) => sg.is_active).length
          return (
            <Link key={g.id} href={`/gruplar/${g.id}`} className="block">
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{g.name}</CardTitle>
                    <Badge variant={g.is_active ? 'success' : 'secondary'}>
                      {g.is_active ? 'Aktif' : 'Pasif'}
                    </Badge>
                  </div>
                  {g.staff && (
                    <p className="text-xs text-gray-500">Antrenör: {g.staff.full_name}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>
                      {activeStudents} / {g.capacity ?? '?'} öğrenci
                    </span>
                    {g.age_min != null && (
                      <span className="text-gray-400">
                        ({g.age_min}–{g.age_max} yaş)
                      </span>
                    )}
                  </div>
                  {(g.group_schedule_slots ?? []).length > 0 && (
                    <div className="space-y-1">
                      {g.group_schedule_slots.map((slot: any) => (
                        <div
                          key={slot.id}
                          className="text-xs text-gray-600 bg-gray-50 rounded px-2 py-1"
                        >
                          {TR_DAYS[(slot.day_of_week - 1) % 7]} {slot.start_time?.slice(0, 5)} –{' '}
                          {slot.end_time?.slice(0, 5)}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          )
        })}
        {(groups ?? []).length === 0 && (
          <div className="col-span-full py-12 text-center text-sm text-gray-500">
            Henüz grup eklenmedi.
          </div>
        )}
      </div>
    </div>
  )
}
