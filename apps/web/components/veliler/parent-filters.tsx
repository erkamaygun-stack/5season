'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { Search } from 'lucide-react'

export default function ParentFilters() {
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
      <div className="min-w-[180px]">
        <PhoneInput
          placeholder="5xx xxx xxxx ara…"
          defaultValue={searchParams.get('phone') ?? ''}
          onChange={(e) => update('phone', e.target.value || null)}
        />
      </div>
    </div>
  )
}
