'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TR_MONTHS } from '@/lib/utils'
import AidatCell from './aidat-cell'
import PaymentModal from './payment-modal'

interface Student { id: string; full_name: string }
interface Invoice {
  id: string; student_id: string; period_month: number
  amount: number; paid_amount: number; status: string; is_prorated: boolean
}

interface Props {
  students: Student[]
  invoiceMap: Record<string, Record<number, Invoice>>
  year: number
}

export default function AidatGrid({ students, invoiceMap, year }: Props) {
  const router = useRouter()
  const [selectedInvoice, setSelectedInvoice] = useState<(Invoice & { studentName: string }) | null>(null)

  function changeYear(delta: number) {
    const params = new URLSearchParams()
    params.set('year', String(year + delta))
    router.push(`/aidat?${params.toString()}`)
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <Button variant="outline" size="icon" onClick={() => changeYear(-1)}><ChevronLeft className="w-4 h-4" /></Button>
        <span className="font-semibold text-gray-900 w-12 text-center">{year}</span>
        <Button variant="outline" size="icon" onClick={() => changeYear(1)}><ChevronRight className="w-4 h-4" /></Button>
      </div>

      <div className="rounded-lg border bg-white overflow-auto">
        <table className="text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left font-medium text-gray-600 min-w-[180px] border-b border-r">
                Öğrenci
              </th>
              {TR_MONTHS.map((m, i) => (
                <th key={i} className="px-3 py-3 text-center font-medium text-gray-600 min-w-[80px] border-b">
                  {m.slice(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="hover:bg-gray-50">
                <td className="sticky left-0 bg-white hover:bg-gray-50 px-4 py-2.5 font-medium text-gray-900 border-b border-r">
                  {student.full_name}
                </td>
                {Array.from({ length: 12 }, (_, i) => {
                  const invoice = invoiceMap[student.id]?.[i + 1] ?? null
                  return (
                    <td key={i} className="px-1 py-1.5 border-b text-center">
                      <AidatCell
                        invoice={invoice}
                        onClick={invoice && invoice.status !== 'paid'
                          ? () => setSelectedInvoice({ ...invoice, studentName: student.full_name })
                          : undefined}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedInvoice && (
        <PaymentModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onSuccess={() => { setSelectedInvoice(null); router.refresh() }}
        />
      )}
    </>
  )
}
