'use client'

import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

interface ParentRow {
  id: string
  full_name: string
  phone: string | null
  email: string | null
  childCount: number
  totalDebt: number
}

export default function ParentTable({ parents }: { parents: ParentRow[] }) {
  if (parents.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-12 text-center text-sm text-gray-500">
        Veli bulunamadı.
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Ad Soyad</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Telefon</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Çocuk Sayısı</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600">Toplam Borç</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {parents.map((p) => (
            <tr key={p.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <Link href={`/veliler/${p.id}`} className="font-medium text-primary hover:underline">
                  {p.full_name}
                </Link>
              </td>
              <td className="px-4 py-3 text-gray-600">{p.phone ?? '-'}</td>
              <td className="px-4 py-3 text-gray-600">{p.childCount}</td>
              <td className="px-4 py-3 text-right font-medium">
                {p.totalDebt > 0
                  ? <span className="text-red-600">{formatCurrency(p.totalDebt)}</span>
                  : <span className="text-xs text-green-600">Borçsuz</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
