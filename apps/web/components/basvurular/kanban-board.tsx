'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

interface Application {
  id: string; applicant_full_name: string; parent_phone: string
  birth_date: string | null; status: string; created_at: string
}

interface Column { status: string; label: string }

interface Props {
  applications: Application[]
  columns: Column[]
}

export default function KanbanBoard({ applications: initial, columns }: Props) {
  const router = useRouter()
  const [apps, setApps] = useState(initial)
  const [dragging, setDragging] = useState<string | null>(null)

  async function moveCard(id: string, newStatus: string) {
    const prev = apps.find((a) => a.id === id)
    if (!prev || prev.status === newStatus) return

    setApps((a) => a.map((x) => x.id === id ? { ...x, status: newStatus } : x))

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error: updateErr } = await supabase
      .from('applications')
      .update({ status: newStatus } as any)
      .eq('id', id)

    await supabase.from('application_status_history').insert({
      application_id: id,
      from_status: prev.status,
      to_status: newStatus,
      changed_by: user?.id ?? null,
    })

    if (updateErr) {
      toast.error('Durum güncellenemedi')
      setApps((a) => a.map((x) => x.id === id ? { ...x, status: prev.status } : x))
    }
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {columns.map((col) => {
        const cards = apps.filter((a) => a.status === col.status)
        return (
          <div
            key={col.status}
            className="flex-shrink-0 w-56 rounded-lg bg-gray-100 p-2"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              if (dragging) moveCard(dragging, col.status)
              setDragging(null)
            }}
          >
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{col.label}</span>
              <span className="text-xs text-gray-400">{cards.length}</span>
            </div>
            <div className="space-y-2">
              {cards.map((app) => (
                <div
                  key={app.id}
                  draggable
                  onDragStart={() => setDragging(app.id)}
                  className="rounded-md bg-white border p-3 shadow-sm cursor-grab active:cursor-grabbing select-none"
                >
                  <p className="text-sm font-medium text-gray-900 truncate">{app.applicant_full_name}</p>
                  {app.parent_phone && <p className="text-xs text-gray-500 mt-0.5">{app.parent_phone}</p>}
                  {app.birth_date && <p className="text-xs text-gray-400">{formatDate(app.birth_date)}</p>}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
