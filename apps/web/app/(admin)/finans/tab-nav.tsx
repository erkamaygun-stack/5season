'use client'
// usePathname ile aktif sekme tespiti gerekiyor

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

const TABS = [
  { key: 'aidat', label: 'Aidat' },
  { key: 'dekontlar', label: 'Bekleyen Dekontlar' },
  { key: 'giderler', label: 'Giderler' },
  { key: 'raporlar', label: 'Raporlar' },
] as const

export default function FinansTabNav({ pendingCount }: { pendingCount: number }) {
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') ?? 'aidat'

  return (
    <div className="flex border-b border-border mb-6">
      {TABS.map(({ key, label }) => (
        <Link
          key={key}
          href={`/finans?tab=${key}`}
          className={cn(
            'px-5 py-3 text-base font-semibold border-b-2 -mb-px transition-colors',
            activeTab === key
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          {label}
          {key === 'dekontlar' && pendingCount > 0 && (
            <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-white leading-none">
              {pendingCount}
            </span>
          )}
        </Link>
      ))}
    </div>
  )
}
