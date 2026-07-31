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
import { chipStyle, DEVAMSIZ_COLOR } from '@/lib/notification-colors'
import { notifyAbsenceParent, dismissAbsence } from '../../app/(admin)/actions'

export type AbsenceRow = {
  id: string
  studentName: string
  groupName: string
  coachName: string | null
}

export default function AbsencesDialog({ absences }: { absences: AbsenceRow[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const chip = chipStyle(absences.length > 0, DEVAMSIZ_COLOR)

  function handleNotify(id: string) {
    startTransition(async () => {
      try {
        await notifyAbsenceParent(id)
        toast.success('Veliye bildirim kuyruğa alındı')
        router.refresh()
      } catch (err: any) {
        toast.error(err.message ?? 'İşlem başarısız')
      }
    })
  }

  function handleDismiss(id: string) {
    startTransition(async () => {
      try {
        await dismissAbsence(id)
        toast.success('Bildirim silindi')
        router.refresh()
      } catch {
        toast.error('İşlem başarısız')
      }
    })
  }

  if (absences.length === 0) {
    return (
      <span className={chip.className} style={chip.style}>
        <span className="font-semibold tabular-nums">0</span>
        bugünkü devamsız
      </span>
    )
  }

  return (
    <Dialog>
      <DialogTrigger className={chip.className} style={chip.style}>
        <span className="font-semibold tabular-nums">{absences.length}</span>
        bugünkü devamsız
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bugünkü Devamsızlar</DialogTitle>
        </DialogHeader>
        <div className="divide-y divide-border -mx-6">
          {absences.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-4 px-6 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{a.studentName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {a.groupName}
                  {a.coachName ? ` · ${a.coachName}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => handleNotify(a.id)}
                >
                  Veliye mesaj gönder
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => handleDismiss(a.id)}
                >
                  Bildirimi sil
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
