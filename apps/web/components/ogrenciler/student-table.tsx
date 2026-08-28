'use client'
// useState, useRouter: pasif/aktif toggle için

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import { UserX, UserCheck } from 'lucide-react'
import AddStudentModal from './add-student-modal'

interface Group {
  id: string
  name: string
}

interface StudentRow {
  id: string
  full_name: string
  birth_date: string | null
  status: string
  has_received_uniform: boolean | null
  debt: number
  student_groups: Array<{
    is_active: boolean
    groups: { id: string; name: string } | null
  }>
  guardian_students: Array<{
    is_primary: boolean | null
    relation: string | null
    guardians: { id: string; full_name: string; phone_e164: string; status: string } | null
  }>
}

const STATUS: Record<string, { label: string; variant: 'success' | 'warning' | 'secondary' | 'destructive' | 'default' | 'outline' | 'ghost' | 'link' }> = {
  active: { label: 'Aktif', variant: 'success' },
  trial: { label: 'Deneme', variant: 'warning' },
  passive: { label: 'Pasif', variant: 'secondary' },
  left: { label: 'Arşiv', variant: 'secondary' },
}

function calcAge(birthDate: string | null): string {
  if (!birthDate) return '—'
  const birth = new Date(birthDate)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  if (
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  )
    age--
  return `${age}`
}

export default function StudentTable({
  students,
  groups,
}: {
  students: StudentRow[]
  groups: Group[]
}) {
  const router = useRouter()
  const [toggling, setToggling] = useState<string | null>(null)

  async function toggle(s: StudentRow) {
    const goInactive = s.status !== 'passive'
    if (!confirm(`${s.full_name} ${goInactive ? 'pasife' : 'aktife'} alınsın mı?`)) return
    setToggling(s.id)
    const supabase = createClient()
    const { error } = await supabase
      .from('students')
      .update({ status: goInactive ? 'passive' : 'active' })
      .eq('id', s.id)
    if (error) toast.error('İşlem başarısız: ' + error.message)
    else {
      toast.success(`${s.full_name} ${goInactive ? 'pasife' : 'aktife'} alındı`)
      router.refresh()
    }
    setToggling(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Üyeler{' '}
          <span className="font-normal text-muted-foreground text-sm">({students.length})</span>
        </CardTitle>
        <CardAction>
          <AddStudentModal groups={groups} />
        </CardAction>
      </CardHeader>

      <CardContent className="px-0 pb-0">
        {students.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">Öğrenci bulunamadı.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Ad Soyad</TableHead>
                <TableHead>Grup</TableHead>
                <TableHead>Veli</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Yaş</TableHead>
                <TableHead>Forma</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">Borç</TableHead>
                <TableHead className="pr-5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => {
                const activeGroup = s.student_groups?.find((sg) => sg.is_active)
                const primaryGuardian =
                  s.guardian_students?.find((gs) => gs.is_primary) ?? s.guardian_students?.[0]
                const { label, variant } =
                  STATUS[s.status] ?? { label: s.status, variant: 'secondary' as const }

                return (
                  <TableRow key={s.id}>
                    <TableCell className="pl-5">
                      <Link
                        href={`/ogrenciler/${s.id}`}
                        className="font-medium hover:underline"
                      >
                        {s.full_name}
                      </Link>
                      <div className="text-xs text-muted-foreground font-mono">
                        {s.id.slice(0, 6).toUpperCase()}
                      </div>
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {activeGroup?.groups?.name ?? '—'}
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {primaryGuardian?.guardians?.full_name ?? '—'}
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {primaryGuardian?.guardians?.phone_e164 ?? '—'}
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {calcAge(s.birth_date)}
                    </TableCell>

                    <TableCell>
                      {s.has_received_uniform ? (
                        <Badge variant="success">Alındı</Badge>
                      ) : (
                        <Badge variant="secondary">Alınmadı</Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge variant={variant}>{label}</Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      {s.debt > 0 ? (
                        <span className="font-medium text-destructive">
                          {formatCurrency(s.debt)}
                        </span>
                      ) : (
                        <span className="text-xs text-green-600 dark:text-green-400">
                          Borçsuz
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="pr-5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-7 w-7 p-0 ${
                          s.status === 'passive'
                            ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                            : 'text-red-500 hover:text-red-700 hover:bg-red-50'
                        }`}
                        title={s.status === 'passive' ? 'Aktife Al' : 'Pasife Al'}
                        onClick={() => toggle(s)}
                        disabled={toggling === s.id}
                      >
                        {s.status === 'passive' ? (
                          <UserCheck className="w-3.5 h-3.5" />
                        ) : (
                          <UserX className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
