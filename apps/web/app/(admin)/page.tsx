import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Separator } from '@/components/ui/separator'
import { Users, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import NotificationBar from '@/components/dashboard/notification-bar'
import { getGroupColor } from '@/lib/group-colors'
import { GROUP_CATEGORIES, normalizeGroupCategory } from '@/lib/group-categories'
import AddGroupModal from '@/components/gruplar/add-group-modal'
import TakvimClient from './takvim-client'
import { getWeekData } from '@/lib/program-week'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const supabase = await createClient()
  const { week } = await searchParams

  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const weekNum = Number(week)

  const [profileResult, groupsResult, coachesResult, weekData] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user!.id).single(),
    supabase
      .from('groups')
      .select('id, name, color, category, student_groups(student_id, is_active), staff(full_name)')
      .order('name'),
    supabase
      .from('staff')
      .select('id, full_name')
      .eq('staff_type', 'coach')
      .eq('is_active', true)
      .order('full_name'),
    getWeekData(supabase, Number.isFinite(weekNum) ? weekNum : 0),
  ])

  const fullName = (profileResult.data as any)?.full_name ?? 'Hoşgeldiniz'
  const groups = (groupsResult.data ?? []) as any[]
  const coaches = (coachesResult.data ?? []) as { id: string; full_name: string }[]

  const activeStudentIds = groups.flatMap((g) =>
    (g.student_groups ?? []).filter((sg: any) => sg.is_active).map((sg: any) => sg.student_id),
  )

  const { data: paidInvoices } = activeStudentIds.length
    ? await supabase
        .from('aidat_invoices')
        .select('student_id')
        .eq('period_year', year)
        .eq('period_month', month)
        .eq('status', 'paid')
        .in('student_id', activeStudentIds)
    : { data: [] as { student_id: string }[] }

  const paidStudentIds = new Set((paidInvoices ?? []).map((inv) => inv.student_id))

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Hoşgeldin, {fullName}!</h1>

      <Separator />

      <NotificationBar />

      <Separator />

      <div className="flex items-center justify-end">
        <AddGroupModal coaches={coaches} />
      </div>

      {GROUP_CATEGORIES.map((cat) => {
        const catGroups = groups.filter((g) => normalizeGroupCategory(g.category) === cat.value)

        return (
          <div key={cat.value} className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">{cat.label}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {catGroups.map((g, i) => {
                const activeStudents = (g.student_groups ?? []).filter((sg: any) => sg.is_active)
                const total = activeStudents.length
                const paidCount = activeStudents.filter((sg: any) => paidStudentIds.has(sg.student_id)).length
                const percentage = total > 0 ? Math.round((paidCount / total) * 100) : 0
                const isHealthy = percentage >= 50
                const color = getGroupColor(g.color, i)

                return (
                  <Link key={g.id} href={`/gruplar/${g.id}`} className="block">
                    <div className="h-full rounded-xl bg-card p-5 ring-1 ring-foreground/10 space-y-2 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 ${color.bg}`}>
                          <Users className={`w-3.5 h-3.5 ${color.text}`} />
                        </span>
                        <span className={`text-sm font-semibold truncate ${color.text}`}>{g.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {g.staff?.full_name ? `Antrenör: ${g.staff.full_name}` : 'Antrenör atanmadı'}
                      </p>
                      <p className="text-3xl font-bold text-foreground">
                        {paidCount}/{total}
                      </p>
                      <div
                        className={`flex items-center gap-1 text-xs ${
                          isHealthy ? 'text-emerald-500' : 'text-red-500'
                        }`}
                      >
                        {isHealthy ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        )}
                        <span>%{percentage} aidat ödendi</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
              {catGroups.length === 0 && (
                <p className="text-sm text-muted-foreground py-4">Henüz grup eklenmedi.</p>
              )}
            </div>
          </div>
        )
      })}

      <Separator />

      <h2 className="text-lg font-semibold text-foreground">Takvim</h2>
      <TakvimClient {...weekData} />
    </div>
  )
}
