'use client'
// useSearchParams ile aktif filtreyi tespit etmek için client component gerekli

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { cn, compareGroupNames } from '@/lib/utils'

interface Group {
  id: string
  name: string
  category: string
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

  function chipClass(isActive: boolean) {
    return cn(
      'inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
      isActive
        ? 'bg-primary text-primary-foreground'
        : 'bg-muted text-muted-foreground hover:bg-muted/70'
    )
  }

  const sortedGroups = [...groups].sort((a, b) => compareGroupNames(a.name, b.name))

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={chipHref(null)} className={chipClass(!activeGroupId)}>
        Tümü
      </Link>
      {sortedGroups.map((g) => (
        <Link key={g.id} href={chipHref(g.id)} className={chipClass(activeGroupId === g.id)}>
          {g.name}
        </Link>
      ))}
    </div>
  )
}
