'use client'
// useSearchParams ile aktif filtreyi tespit etmek için client component gerekli

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Group {
  id: string
  name: string
}

export default function GroupFilterChips({ groups }: { groups: Group[] }) {
  const searchParams = useSearchParams()
  const activeGroupId = searchParams.get('group_id')

  function chipHref(groupId: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (groupId) params.set('group_id', groupId)
    else params.delete('group_id')
    return `/ogrenciler?${params.toString()}`
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={chipHref(null)}
        className={cn(
          'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
          !activeGroupId
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground hover:bg-muted/70'
        )}
      >
        Tümü
      </Link>
      {groups.map((g) => (
        <Link
          key={g.id}
          href={chipHref(g.id)}
          className={cn(
            'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
            activeGroupId === g.id
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/70'
          )}
        >
          {g.name}
        </Link>
      ))}
    </div>
  )
}
