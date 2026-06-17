'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PhoneInput } from '@/components/ui/phone-input'
import { formatDate } from '@/lib/utils'
import { createApplication } from '@/app/(admin)/basvurular/actions'
import { Plus } from 'lucide-react'

interface Application {
  id: string; applicant_full_name: string; parent_phone: string
  birth_date: string | null; status: string; created_at: string
}

interface Column { status: string; label: string }

interface Props {
  applications: Application[]
  columns: Column[]
}

function AddApplicationModal({ onClose, onAdded }: { onClose: () => void; onAdded: (app: Application) => void }) {
  const [applicantName, setApplicantName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [parentName, setParentName] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [source, setSource] = useState('')
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!applicantName.trim() || !parentName.trim() || !parentPhone.trim()) return
    startTransition(async () => {
      try {
        const inserted = await createApplication({
          applicant_full_name: applicantName,
          birth_date: birthDate || undefined,
          parent_full_name: parentName,
          parent_phone: parentPhone,
          source: source || undefined,
          notes: notes || undefined,
        })
        toast.success('Başvuru oluşturuldu')
        onAdded(inserted as Application)
        onClose()
      } catch (err: any) {
        toast.error(err.message ?? 'Başvuru oluşturulamadı')
      }
    })
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Yeni Başvuru</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Öğrenci Adı Soyadı *</Label>
            <Input value={applicantName} onChange={(e) => setApplicantName(e.target.value)} required placeholder="Ad Soyad" />
          </div>
          <div className="space-y-1.5">
            <Label>Doğum Tarihi</Label>
            <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Veli Adı Soyadı *</Label>
            <Input value={parentName} onChange={(e) => setParentName(e.target.value)} required placeholder="Ad Soyad" />
          </div>
          <div className="space-y-1.5">
            <Label>Veli Telefonu *</Label>
            <PhoneInput value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Kaynak</Label>
            <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Instagram, tavsiye, vb." />
          </div>
          <div className="space-y-1.5">
            <Label>Notlar</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="İsteğe bağlı" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>İptal</Button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Kaydediliyor…' : 'Kaydet'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function KanbanBoard({ applications: initial, columns }: Props) {
  const router = useRouter()
  const [apps, setApps] = useState(initial)
  const [dragging, setDragging] = useState<string | null>(null)
  const [addModal, setAddModal] = useState(false)

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
    <>
    <div className="flex items-center justify-between mb-4">
      <div /> {/* spacer */}
      <Button size="sm" onClick={() => setAddModal(true)}>
        <Plus className="w-4 h-4 mr-1" />
        Yeni Başvuru
      </Button>
    </div>
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

    {addModal && (
      <AddApplicationModal
        onClose={() => setAddModal(false)}
        onAdded={(app) => setApps((prev) => [app, ...prev])}
      />
    )}
    </>
  )
}
