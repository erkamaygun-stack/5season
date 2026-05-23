'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

interface Group { id: string; name: string }

export default function AddStudentModal({ groups }: { groups: Group[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    full_name: '',
    birth_date: '',
    gender: '',
    blood_type: '',
    enrollment_date: new Date().toISOString().split('T')[0],
    group_id: '',
    notes: '',
  })

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim()) return
    setLoading(true)

    const supabase = createClient()

    const { data: schoolData } = await supabase.from('schools').select('id').limit(1).single()
    const school_id = schoolData?.id

    const { data: student, error } = await supabase
      .from('students')
      .insert({
        full_name: form.full_name,
        birth_date: form.birth_date || null,
        gender: form.gender || null,
        blood_type: form.blood_type || null,
        enrollment_date: form.enrollment_date,
        notes: form.notes || null,
        status: 'active',
        school_id: school_id ?? '',
      })
      .select('id')
      .single()

    if (error || !student) {
      toast.error('Öğrenci eklenemedi: ' + (error?.message ?? 'Bilinmeyen hata'))
      setLoading(false)
      return
    }

    if (form.group_id) {
      await supabase.from('student_groups').insert({
        student_id: student.id,
        group_id: form.group_id,
        joined_at: form.enrollment_date,
        is_active: true,
      })
    }

    toast.success(`${form.full_name} eklendi`)
    setOpen(false)
    setForm({ full_name: '', birth_date: '', gender: '', blood_type: '', enrollment_date: new Date().toISOString().split('T')[0], group_id: '', notes: '' })
    router.refresh()
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="w-4 h-4" /> Öğrenci Ekle</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Yeni Öğrenci</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Ad Soyad *</Label>
            <Input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Doğum Tarihi</Label>
              <Input type="date" value={form.birth_date} onChange={(e) => set('birth_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Cinsiyet</Label>
              <Select onValueChange={(v) => set('gender', v)}>
                <SelectTrigger><SelectValue placeholder="Seç" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Erkek</SelectItem>
                  <SelectItem value="F">Kız</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Kan Grubu</Label>
              <Select onValueChange={(v) => set('blood_type', v)}>
                <SelectTrigger><SelectValue placeholder="Seç" /></SelectTrigger>
                <SelectContent>
                  {['A+','A-','B+','B-','AB+','AB-','0+','0-'].map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Kayıt Tarihi</Label>
              <Input type="date" value={form.enrollment_date} onChange={(e) => set('enrollment_date', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Grup</Label>
            <Select onValueChange={(v) => set('group_id', v)}>
              <SelectTrigger><SelectValue placeholder="Grup seç (isteğe bağlı)" /></SelectTrigger>
              <SelectContent>
                {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Notlar</Label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>İptal</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Kaydediliyor…' : 'Kaydet'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
