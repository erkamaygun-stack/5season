'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PhoneInput } from '@/components/ui/phone-input'
import { Search } from 'lucide-react'

interface Group { id: string; name: string }

export default function StudentFilters({ groups }: { groups: Group[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const update = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set(key, value)
      else params.delete(key)
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  return (
    <div className="flex flex-wrap gap-3">
      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Ad soyad ara…"
          defaultValue={searchParams.get('search') ?? ''}
          onChange={(e) => update('search', e.target.value || null)}
          className="pl-9"
        />
      </div>
      <div className="min-w-[180px]">
        <PhoneInput
          placeholder="5xx xxx xxxx ara…"
          defaultValue={searchParams.get('phone') ?? ''}
          onChange={(e) => update('phone', e.target.value || null)}
        />
      </div>
      <Select
        defaultValue={searchParams.get('status') ?? 'all'}
        onValueChange={(v) => update('status', v === 'all' ? null : v)}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Durum" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tüm Durumlar</SelectItem>
          <SelectItem value="active">Aktif</SelectItem>
          <SelectItem value="trial">Deneme</SelectItem>
          <SelectItem value="passive">Pasif</SelectItem>
          <SelectItem value="left">Arşiv</SelectItem>
        </SelectContent>
      </Select>
      <Select
        defaultValue={searchParams.get('group_id') ?? 'all'}
        onValueChange={(v) => update('group_id', v === 'all' ? null : v)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Grup" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tüm Gruplar</SelectItem>
          {groups.map((g) => (
            <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          placeholder="Min yaş"
          defaultValue={searchParams.get('age_min') ?? ''}
          onChange={(e) => update('age_min', e.target.value || null)}
          className="w-20 text-sm"
          min={3}
          max={25}
        />
        <span className="text-muted-foreground text-sm">–</span>
        <Input
          type="number"
          placeholder="Max yaş"
          defaultValue={searchParams.get('age_max') ?? ''}
          onChange={(e) => update('age_max', e.target.value || null)}
          className="w-20 text-sm"
          min={3}
          max={25}
        />
      </div>
      <Select
        defaultValue={searchParams.get('uniform') ?? 'all'}
        onValueChange={(v) => update('uniform', v === 'all' ? null : v)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Forma" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tüm Forma</SelectItem>
          <SelectItem value="received">Forma Alındı</SelectItem>
          <SelectItem value="not_received">Forma Alınmadı</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
