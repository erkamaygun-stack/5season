'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ImageIcon, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface School {
  id: string; name: string; address: string | null; contact_phone: string | null
  logo_url: string | null; default_aidat_amount: number | null; default_uniform_amount: number | null
  collection_day: number | null
}

export default function OkulForm({ school }: { school: School | null }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name: school?.name ?? '',
    address: school?.address ?? '',
    contact_phone: school?.contact_phone ?? '',
    default_aidat_amount: String(school?.default_aidat_amount ?? ''),
    default_uniform_amount: String(school?.default_uniform_amount ?? ''),
    collection_day: String(school?.collection_day ?? 1),
  })
  const [saving, setSaving] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(school?.logo_url ?? null)
  const [uploading, setUploading] = useState(false)

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !school?.id) return

    if (!file.type.startsWith('image/')) {
      toast.error('Sadece resim dosyası yükleyebilirsiniz')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Dosya 2 MB\'den büyük olamaz')
      return
    }

    setUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop() ?? 'png'
    const path = `${school.id}/logo.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('school-logos')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      toast.error('Logo yüklenemedi: ' + uploadError.message)
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('school-logos').getPublicUrl(path)

    const { error: updateError } = await supabase
      .from('schools')
      .update({ logo_url: publicUrl } as any)
      .eq('id', school.id)

    if (updateError) {
      toast.error('Logo kaydedilemedi: ' + updateError.message)
    } else {
      setLogoPreview(publicUrl)
      toast.success('Logo güncellendi')
      router.refresh()
    }

    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!school?.id) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('schools').update({
      name: form.name,
      address: form.address || null,
      contact_phone: form.contact_phone || null,
      default_aidat_amount: form.default_aidat_amount ? Number(form.default_aidat_amount) : null,
      default_uniform_amount: form.default_uniform_amount ? Number(form.default_uniform_amount) : null,
      collection_day: Math.min(28, Math.max(1, Number(form.collection_day) || 1)),
    } as any).eq('id', school.id)

    if (error) toast.error('Kaydedilemedi: ' + error.message)
    else { toast.success('Ayarlar kaydedildi'); router.refresh() }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSave} className="space-y-4 max-w-xl">
      <Card>
        <CardHeader><CardTitle className="text-base">Okul Bilgileri</CardTitle></CardHeader>
        <CardContent className="space-y-4">

          <div className="space-y-1.5">
            <Label>Okul Adı</Label>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </div>

          {/* Logo */}
          <div className="space-y-1.5">
            <Label>Okul Logosu</Label>
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted flex-shrink-0 cursor-pointer hover:border-foreground/20 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                title="Logo yükle"
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
                )}
              </div>
              <div className="space-y-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  {uploading ? 'Yükleniyor…' : logoPreview ? 'Değiştir' : 'Logo Yükle'}
                </Button>
                <p className="text-xs text-muted-foreground">PNG, JPG veya SVG · Maks. 2 MB</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Adres</Label>
            <Input value={form.address} onChange={(e) => set('address', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Telefon</Label>
            <PhoneInput value={form.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} placeholder="5xxxxxxxxx" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Varsayılanlar</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Aylık Aidat (₺)</Label>
            <Input type="number" value={form.default_aidat_amount} onChange={(e) => set('default_aidat_amount', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Forma Ücreti (₺)</Label>
            <Input type="number" value={form.default_uniform_amount} onChange={(e) => set('default_uniform_amount', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Tahsilat Günü</Label>
            <Input
              type="number"
              min={1}
              max={28}
              value={form.collection_day}
              onChange={(e) => set('collection_day', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Aidatların her ay hangi gün tahsil edileceği (1–28).</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</Button>
      </div>
    </form>
  )
}
