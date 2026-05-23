'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search } from 'lucide-react'

export default function StaffFilters() {
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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Ad soyad ara…"
          defaultValue={searchParams.get('search') ?? ''}
          onChange={(e) => update('search', e.target.value || null)}
          className="pl-9"
        />
      </div>
      <Select
        defaultValue={searchParams.get('type') ?? 'all'}
        onValueChange={(v) => update('type', v === 'all' ? null : v)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Tip" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tüm Tipler</SelectItem>
          <SelectItem value="coach">Antrenör</SelectItem>
          <SelectItem value="assistant">Asistan</SelectItem>
          <SelectItem value="other">Diğer</SelectItem>
        </SelectContent>
      </Select>
      <Select
        defaultValue={searchParams.get('active') ?? 'all'}
        onValueChange={(v) => update('active', v === 'all' ? null : v)}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Durum" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tüm Durum</SelectItem>
          <SelectItem value="active">Aktif</SelectItem>
          <SelectItem value="inactive">Pasif</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
