import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { TR_DAYS, today } from '@/lib/utils'
import { getWeekData, type WeekData } from '@/lib/program-week'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Upload } from 'lucide-react'
import ProgramClient from './ProgramClient'
import YoklamaClient from '../yoklama/yoklama-client'
import LeaveRequestsSection from '../yoklama/leave-requests-section'
import AddGroupModal from '@/components/gruplar/add-group-modal'
import AddStaffModal from '@/components/personel/add-staff-modal'
import StaffTable from '@/components/personel/staff-table'
import StaffFilters from '@/components/personel/staff-filters'
import ProgramTabNav from './tab-nav'

const TABS = ['takvim', 'gruplar', 'yoklama', 'personel'] as const
type Tab = (typeof TABS)[number]

export default async function ProgramPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string
    week?: string
    search?: string
    type?: string
    active?: string
  }>
}) {
  const { tab: rawTab, week, search, type, active } = await searchParams
  const tab: Tab = (TABS as readonly string[]).includes(rawTab ?? '')
    ? (rawTab as Tab)
    : 'takvim'

  const supabase = await createClient()

  // ─── Takvim ───────────────────────────────────────────────────────────────
  let takvimProps: WeekData | null = null

  if (tab === 'takvim') {
    takvimProps = await getWeekData(supabase, Number(week ?? 0))
  }

  // ─── Gruplar ──────────────────────────────────────────────────────────────
  let gruplarData: { groups: any[]; coaches: any[] } | null = null

  if (tab === 'gruplar') {
    const [{ data: groups }, { data: coaches }] = await Promise.all([
      supabase
        .from('groups')
        .select(
          'id, name, is_active, group_schedule_slots(id, day_of_week, start_time, end_time), student_groups(id, is_active), staff(full_name)',
        )
        .order('name'),
      supabase
        .from('staff')
        .select('id, full_name')
        .eq('staff_type', 'coach')
        .eq('is_active', true)
        .order('full_name'),
    ])
    gruplarData = { groups: groups ?? [], coaches: coaches ?? [] }
  }

  // ─── Yoklama ──────────────────────────────────────────────────────────────
  let yoklamaData: {
    sessions: any[]
    leaveRequests: any[]
    groupStudentMap: Record<string, { id: string; full_name: string }[]>
  } | null = null

  if (tab === 'yoklama') {
    const todayStr = today()
    const [sessionsRes, leaveRes] = await Promise.all([
      supabase
        .from('attendance_sessions')
        .select(
          'id, start_time, end_time, status, group_id, groups(name), attendance_records(id, status, student_id, students(full_name))',
        )
        .eq('session_date', todayStr)
        .order('start_time'),
      supabase
        .from('leave_requests')
        .select('id, session_date, reason, status, students(full_name)')
        .in('status', ['submitted', 'seen'])
        .gte('session_date', todayStr)
        .order('session_date'),
    ])

    const sessions = sessionsRes.data ?? []
    const leaveRequests = leaveRes.data ?? []
    const groupIds = Array.from(
      new Set(sessions.map((s: any) => s.group_id).filter(Boolean)),
    )
    const { data: studentGroups } =
      groupIds.length > 0
        ? await supabase
            .from('student_groups')
            .select('group_id, student_id, students(id, full_name)')
            .in('group_id', groupIds)
            .eq('is_active', true)
        : { data: [] }

    const groupStudentMap: Record<string, { id: string; full_name: string }[]> = {}
    for (const sg of studentGroups ?? []) {
      const s = (sg as any).students
      if (!s) continue
      if (!groupStudentMap[sg.group_id]) groupStudentMap[sg.group_id] = []
      groupStudentMap[sg.group_id].push({ id: s.id, full_name: s.full_name })
    }

    yoklamaData = { sessions, leaveRequests, groupStudentMap }
  }

  // ─── Personel ─────────────────────────────────────────────────────────────
  let personelData: any[] | null = null

  if (tab === 'personel') {
    let query = supabase
      .from('staff')
      .select('id, full_name, staff_type, monthly_salary, is_active')
      .order('full_name')

    if (search) query = query.ilike('full_name', `%${search}%`)
    if (type) query = query.eq('staff_type', type)
    if (active === 'active') query = query.eq('is_active', true)
    if (active === 'inactive') query = query.eq('is_active', false)

    const { data: staff } = await query
    const { data: groups } = await supabase
      .from('groups')
      .select('id, name, primary_coach_id')
      .eq('is_active', true)

    const staffGroups: Record<string, string[]> = {}
    for (const g of groups ?? []) {
      if ((g as any).primary_coach_id) {
        const coachId = (g as any).primary_coach_id as string
        if (!staffGroups[coachId]) staffGroups[coachId] = []
        staffGroups[coachId].push(g.name)
      }
    }

    personelData = (staff ?? []).map((s) => ({
      ...s,
      groups: staffGroups[s.id] ?? [],
    }))
  }

  return (
    <div>
      <ProgramTabNav />

      {tab === 'takvim' && takvimProps && <ProgramClient {...takvimProps} />}

      {tab === 'gruplar' && gruplarData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <AddGroupModal coaches={gruplarData.coaches} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {gruplarData.groups.map((g: any) => {
              const activeStudents = (g.student_groups ?? []).filter(
                (sg: any) => sg.is_active,
              ).length
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
                        <p className="text-xs text-muted-foreground">
                          Antrenör: {g.staff.full_name}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>{activeStudents} öğrenci</span>
                      </div>
                      {(g.group_schedule_slots ?? []).length > 0 && (
                        <div className="space-y-1">
                          {g.group_schedule_slots.map((slot: any) => (
                            <div
                              key={slot.id}
                              className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1"
                            >
                              {TR_DAYS[(slot.day_of_week - 1) % 7]}{' '}
                              {slot.start_time?.slice(0, 5)} –{' '}
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
            {gruplarData.groups.length === 0 && (
              <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
                Henüz grup eklenmedi.
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'yoklama' && yoklamaData && (
        <div className="space-y-6">
          <div className="space-y-4">
            {yoklamaData.sessions.length === 0 ? (
              <div className="rounded-lg border bg-card p-12 text-center text-sm text-muted-foreground">
                Bugün planlanmış antrenman yok.
              </div>
            ) : (
              <YoklamaClient
                sessions={yoklamaData.sessions as any}
                groupStudentMap={yoklamaData.groupStudentMap}
              />
            )}
          </div>
          <LeaveRequestsSection items={yoklamaData.leaveRequests as any} />
        </div>
      )}

      {tab === 'personel' && personelData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {personelData.length} personel
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" disabled title="V1.1'de eklenecek">
                <Upload className="w-4 h-4 mr-1.5" />
                Excel Import
              </Button>
              <AddStaffModal />
            </div>
          </div>
          <StaffFilters />
          <StaffTable staff={personelData} />
        </div>
      )}
    </div>
  )
}
