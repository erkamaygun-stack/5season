'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, UserRound, UserCog, Layers,
  Calendar, ClipboardCheck, CreditCard, Inbox, Receipt,
  TrendingDown, BarChart2, Bell, Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/ogrenciler', label: 'Öğrenciler', icon: Users },
  { href: '/veliler', label: 'Veliler', icon: UserRound },
  { href: '/personel', label: 'Personel', icon: UserCog },
  { href: '/gruplar', label: 'Gruplar', icon: Layers },
  { href: '/program', label: 'Program', icon: Calendar },
  { href: '/yoklama', label: 'Yoklama', icon: ClipboardCheck },
  { href: '/aidat', label: 'Aidat', icon: CreditCard },
  { href: '/dekontlar', label: 'Dekontlar', icon: Receipt },
  { href: '/basvurular', label: 'Başvurular', icon: Inbox },
  { href: '/giderler', label: 'Giderler', icon: TrendingDown },
  { href: '/raporlar', label: 'Raporlar', icon: BarChart2 },
  { href: '/bildirimler', label: 'Bildirimler', icon: Bell },
  { href: '/ayarlar', label: 'Ayarlar', icon: Settings },
]

interface SidebarProps {
  schoolName: string
  logoUrl?: string | null
}

export default function Sidebar({ schoolName, logoUrl }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-sidebar flex flex-col z-40">
      {/* Logo / School name */}
      <div className="flex items-start gap-3 px-5 py-5 border-b border-zinc-700">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={schoolName} className="w-8 h-8 rounded-md object-cover flex-shrink-0 mt-0.5" />
        ) : (
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs font-bold">5M</span>
          </div>
        )}
        <span className="text-white font-semibold text-sm leading-snug">{schoolName}</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin">
        <ul className="space-y-0.5 px-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                    isActive
                      ? 'bg-zinc-700 text-white border-l-2 border-primary pl-[10px]'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
