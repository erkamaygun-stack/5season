'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, formatCurrency } from '@/lib/utils'
import { UserX, UserCheck } from 'lucide-react'

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
  parent_student: Array<{
    is_primary: boolean | null
    relation: string | null
    profiles: { id: string; full_name: string; phone: string } | null
  }>
}

const statusBadge: Record<string, { label: string; variant: 'success' | 'warning' | 'secondary' }> = {
  active: { label: 'Aktif', variant: 'success' },
  trial: { label: 'Deneme', variant: 'warning' },
  inactive: { label: 'Pasif', variant: 'secondary' },
}

function calcAge(birthDate: string | null): string {
  if (!birthDate) return '-'
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  ) age--
  return `${age}`
}

export default function StudentTable({ students }: { students: StudentRow[] }) {
  const router = useRouter()
  const [toggling, setToggling] = useState<string | null>(null)

  async function deactivate(s: StudentRow) {
    if (!confirm(`${s.full_name} pasife alınsın mı?`)) return
    setToggling(s.id)
    const supabase = createClient()
    const { error } = await supabase.from('students').update({ status: 'inactive' }).eq('id', s.id)
    if (error) toast.error('İşlem başarısız: ' + error.message)
    else { toast.success(`${s.full_name} pasife alındı`); router.refresh() }
    setToggling(null)
  }

  async function activate(s: StudentRow) {
    if (!confirm(`${s.full_name} aktife alınsın mı?`)) return
    setToggling(s.id)
    const supabase = createClient()
    const { error } = await supabase.from('students').update({ status: 'active' }).eq('id', s.id)
    if (error) toast.error('İşlem başarısız: ' + error.message)
    else { toast.success(`${s.full_name} aktife alındı`); router.refresh() }
    setToggling(null)
  }

  if (students.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-12 text-center text-sm text-gray-500">
        Öğrenci bulunamadı.
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-600 w-16">ID</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Ad Soyad</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Doğum / Yaş</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Veli</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Telefon</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Aktif Grup</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Forma</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600">Borç</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Durum</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {students.map((s) => {
            const activeGroup = s.student_groups?.find((sg) => sg.is_active)
            const primaryParent = s.parent_student?.find((ps) => ps.is_primary) ?? s.parent_student?.[0]
            const { label, variant } = statusBadge[s.status] ?? { label: s.status, variant: 'secondary' as const }
            const isInactive = s.status === 'inactive'
            return (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                  {s.id.slice(0, 6).toUpperCase()}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/ogrenciler/${s.id}`} className="font-medium text-primary hover:underline">
                    {s.full_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  <div className="text-sm">{formatDate(s.birth_date)}</div>
                  <div className="text-xs text-gray-400">{calcAge(s.birth_date)} yaş</div>
                </td>
                <td className="px-4 py-3 text-gray-700">{primaryParent?.profiles?.full_name ?? '-'}</td>
                <td className="px-4 py-3 text-gray-600">{primaryParent?.profiles?.phone ?? '-'}</td>
                <td className="px-4 py-3 text-gray-600">{activeGroup?.groups?.name ?? '-'}</td>
                <td className="px-4 py-3">
                  {s.has_received_uniform
                    ? <Badge variant="success">Alındı</Badge>
                    : <Badge variant="secondary">Alınmadı</Badge>}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {s.debt > 0
                    ? <span className="text-red-600">{formatCurrency(s.debt)}</span>
                    : <span className="text-xs text-green-600">Borçsuz</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={variant}>{label}</Badge>
                    {isInactive ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                        title="Aktife Al"
                        onClick={() => activate(s)}
                        disabled={toggling === s.id}
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        title="Pasife Al"
                        onClick={() => deactivate(s)}
                        disabled={toggling === s.id}
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
