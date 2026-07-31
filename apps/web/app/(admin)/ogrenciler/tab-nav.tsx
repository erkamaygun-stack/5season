'use client'
// useSearchParams ile aktif sekmeyi tespit etmek için client component gerekli

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const TABS = [
  { key: 'uyeler', label: 'Üyeler' },
  { key: 'basvurular', label: 'Başvurular' },
]

export default function UyelerTabNav() {
  const searchParams = useSearchParams()
  const active = searchParams.get('tab') ?? 'uyeler'

  return (
    <div className="flex border-b mb-4">
      {TABS.map(({ key, label }) => (
        <Link
          key={key}
          href={`/ogrenciler?tab=${key}`}
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
