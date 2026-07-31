'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { chipStyle, IPTAL_COLOR } from '@/lib/notification-colors'
import { acknowledgeCancelledSession } from '../../app/(admin)/actions'

export type CancelledSessionRow = {
  id: string
  date: string // YYYY-MM-DD
  startTime: string
  endTime: string
  groupName: string
  cancelledBy: string | null
}

export default function CancelledSessionsDialog({
  sessions,
}: {
  sessions: CancelledSessionRow[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const chip = chipStyle(sessions.length > 0, IPTAL_COLOR)

  function handleAcknowledge(id: string) {
    startTransition(async () => {
      try {
        await acknowledgeCancelledSession(id)
        toast.success('Bildirim onaylandı')
        router.refresh()
      } catch {
        toast.error('İşlem başarısız')
      }
    })
  }

  if (sessions.length === 0) {
    return (
      <span className={chip.className} style={chip.style}>
        <span className="font-semibold tabular-nums">0</span>
        antrenman iptali
      </span>
    )
  }

  return (
    <Dialog>
      <DialogTrigger className={chip.className} style={chip.style}>
        <span className="font-semibold tabular-nums">{sessions.length}</span>
        antrenman iptali
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>İptal Edilen Antrenmanlar</DialogTitle>
        </DialogHeader>
        <div className="divide-y divide-border -mx-6">
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-4 px-6 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{s.groupName}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {formatDate(s.date)} · {s.startTime.slice(0, 5)}–{s.endTime.slice(0, 5)}
                  {s.cancelledBy ? ` · ${s.cancelledBy}` : ''}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => handleAcknowledge(s.id)}
                className="shrink-0"
              >
                Onayla
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
