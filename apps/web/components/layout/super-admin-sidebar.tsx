'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, Receipt, Server, BellRing } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/super-admin/okullar', label: 'Okullar', icon: Building2 },
  { href: '/super-admin/abonelikler', label: 'Abonelikler', icon: Receipt },
  { href: '/super-admin/sistem', label: 'Sistem', icon: Server },
  { href: '/super-admin/bildirim-sablonlari', label: 'Bildirim Şablonları', icon: BellRing },
]

export default function SuperAdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-sidebar flex flex-col z-40">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-zinc-700">
        <div className="w-8 h-8 bg-red-600 rounded-md flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">SA</span>
        </div>
        <span className="text-white font-semibold text-sm">Süper Admin</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin">
        <ul className="space-y-0.5 px-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                    isActive
                      ? 'bg-zinc-700 text-white border-l-2 border-red-500 pl-[10px]'
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
