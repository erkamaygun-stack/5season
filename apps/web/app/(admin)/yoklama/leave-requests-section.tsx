'use client'
// useTransition ile "Görüldü" aksiyon butonu gerekiyor

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { markLeaveRequestSeen } from './actions'
import { Bell } from 'lucide-react'

type LeaveRequest = {
  id: string
  session_date: string
  reason: string | null
  status: string
  students: { full_name: string } | null
}

export default function LeaveRequestsSection({ items }: { items: LeaveRequest[] }) {
  const [isPending, startTransition] = useTransition()

  if (items.length === 0) return null

  const newCount = items.filter((i) => i.status === 'submitted').length

  function handleSeen(id: string) {
    startTransition(async () => {
      try {
        await markLeaveRequestSeen(id)
        toast.success('İzin talebi görüldü olarak işaretlendi')
      } catch {
        toast.error('İşlem başarısız')
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-gray-900">İzin Talepleri</h2>
        {newCount > 0 && (
          <Badge variant="destructive" className="text-xs">
            {newCount} yeni
          </Badge>
        )}
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="divide-y">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 px-5 py-3">
              <Bell className={`w-4 h-4 flex-shrink-0 ${item.status === 'submitted' ? 'text-orange-400' : 'text-gray-300'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-900">
                    {item.students?.full_name ?? '—'}
                  </span>
                  <Badge
                    variant={item.status === 'submitted' ? 'warning' : 'secondary'}
                    className="text-xs"
                  >
                    {item.status === 'submitted' ? 'Yeni' : 'Görüldü'}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatDate(item.session_date)}
                  {item.reason ? ` — ${item.reason}` : ''}
                </p>
              </div>

              {item.status === 'submitted' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-shrink-0 text-xs"
                  disabled={isPending}
                  onClick={() => handleSeen(item.id)}
                >
                  Görüldü
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
