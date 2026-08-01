'use client'
// useSearchParams ile aktif filtreyi tespit etmek için client component gerekli

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { GROUP_CATEGORIES, normalizeGroupCategory } from '@/lib/group-categories'

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

  return (
    <div className="space-y-2">
      <Link href={chipHref(null)} className={chipClass(!activeGroupId)}>
        Tümü
      </Link>
      {GROUP_CATEGORIES.map((cat) => {
        const catGroups = groups.filter((g) => normalizeGroupCategory(g.category) === cat.value)
        if (catGroups.length === 0) return null

        return (
          <div key={cat.value} className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground w-20 shrink-0">
              {cat.label}
            </span>
            {catGroups.map((g) => (
              <Link key={g.id} href={chipHref(g.id)} className={chipClass(activeGroupId === g.id)}>
                {g.name}
              </Link>
            ))}
          </div>
        )
      })}
    </div>
  )
}
