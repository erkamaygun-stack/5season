'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'

const TYPE_LABEL: Record<string, string> = {
  coach: 'Antrenör',
  assistant: 'Asistan',
  other: 'Diğer',
}

interface StaffRow {
  id: string
  full_name: string
  staff_type: string
  monthly_salary: number | null
  is_active: boolean | null
  groups: string[]
}

export default function StaffTable({ staff }: { staff: StaffRow[] }) {
  if (!staff.length) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        Henüz personel kaydı yok.
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <table className="min-w-full text-sm divide-y">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ad Soyad</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tip</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Grupları</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Aylık Maaş</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Durum</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {staff.map((s) => (
            <tr key={s.id} className="hover:bg-muted/50">
              <td className="px-4 py-3">
                <Link href={`/personel/${s.id}`} className="font-medium text-primary hover:underline">
                  {s.full_name}
                </Link>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{TYPE_LABEL[s.staff_type] ?? s.staff_type}</td>
              <td className="px-4 py-3">
                {s.groups.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {s.groups.map((g) => (
                      <Badge key={g} variant="outline" className="text-xs">{g}</Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground/60 text-xs">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{formatCurrency(s.monthly_salary)}</td>
              <td className="px-4 py-3">
                <Badge variant={s.is_active ? 'success' : 'secondary'}>
                  {s.is_active ? 'Aktif' : 'Pasif'}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
