'use client'
// useSearchParams ile aktif sekmeyi tespit etmek için client component gerekli

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const TABS = [
  { key: 'okul', label: 'Okul' },
  { key: 'hesabim', label: 'Hesabım' },
] as const

export default function AyarlarTabNav() {
  const searchParams = useSearchParams()
  const active = searchParams.get('tab') ?? 'okul'

  return (
    <div className="flex border-b mb-6">
      {TABS.map(({ key, label }) => (
        <Link
          key={key}
          href={`/ayarlar?tab=${key}`}
          className={cn(
            'px-5 py-3 text-base font-semibold border-b-2 -mb-px transition-colors',
            active === key
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          {label}
        </Link>
      ))}
    </div>
  )
}
