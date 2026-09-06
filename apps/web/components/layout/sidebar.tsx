'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, Users, Wallet, Settings, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Ana Sayfa', icon: Home },
  { href: '/ogrenciler', label: 'Üyeler', icon: Users },
  { href: '/finans', label: 'Finans', icon: Wallet },
  { href: '/ayarlar', label: 'Ayarlar', icon: Settings },
]

interface SidebarProps {
  schoolName: string
  logoUrl?: string | null
  isOpen: boolean
  onHover: () => void
  onLeave: () => void
}

export default function Sidebar({ schoolName, logoUrl, isOpen, onHover, onLeave }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={cn(
        'fixed left-0 top-0 h-full bg-sidebar border-r border-sidebar-border flex flex-col z-40 overflow-hidden transition-all duration-300 ease-in-out',
        isOpen ? 'w-[240px]' : 'w-[72px]'
      )}
    >
      {/* Logo + platform adı — px-[16px] her zaman sabit: (72-40)/2 = 16px = merkez */}
      <div className="flex items-center h-[72px] px-[16px] shrink-0 gap-3">
        <div className="w-10 h-10 bg-sidebar-accent rounded-2xl flex items-center justify-center shrink-0">
          <Zap className="w-5 h-5 text-sidebar-foreground" />
        </div>
        <span className={cn(
          'text-sm font-semibold text-sidebar-foreground whitespace-nowrap overflow-hidden transition-all duration-300',
          isOpen ? 'opacity-100 max-w-[160px]' : 'opacity-0 max-w-0'
        )}>
          Okul Yönetim
        </span>
      </div>

      {/* Nav — dikeyde ortala */}
      <nav className="flex-1 flex flex-col justify-center overflow-hidden">
        <ul className={cn('space-y-1.5', isOpen ? 'px-3' : 'px-2')}>
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  title={!isOpen ? label : undefined}
                  className={cn(
                    'flex items-center rounded-xl font-medium transition-all duration-200',
                    isOpen ? 'gap-3 px-3 py-3' : 'justify-center py-3.5',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                  )}
                >
                  <Icon className="w-6 h-6 shrink-0" />
                  <span
                    className={cn(
                      'text-sm whitespace-nowrap overflow-hidden transition-all duration-300',
                      isOpen ? 'opacity-100 max-w-[160px]' : 'opacity-0 max-w-0'
                    )}
                  >
                    {label}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Okul sayfası — nav'ın altında, okul logosu + ismi, diğer nav öğeleri gibi tıklanabilir */}
      {/* px-[18px] sabit: (72-36)/2 = 18px = kapalıyken tam merkez; isim absolute overlay olduğu için iki satıra sarabiliyor */}
      <div className="shrink-0 border-t border-sidebar-border pt-2 pb-4">
        {(() => {
          const isActive = pathname.startsWith('/ayarlar')
          return (
            <Link
              href="/ayarlar"
              title={!isOpen ? schoolName : undefined}
              className={cn(
                'relative flex items-center py-2 px-[18px] rounded-xl transition-colors duration-200',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
              )}
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={schoolName}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-sidebar-border shrink-0"
                />
              ) : (
                <div className="w-9 h-9 bg-sidebar-accent rounded-full flex items-center justify-center ring-2 ring-sidebar-border shrink-0">
                  <span className="text-sidebar-foreground text-sm font-bold">
                    {schoolName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              {/* Sabit w-[162px]: animasyon boyunca genişlik değişmiyor, satır kırma olmaz */}
              <span className={cn(
                'absolute left-[66px] w-[162px] text-sm font-medium text-sidebar-foreground leading-snug',
                'transition-opacity duration-300',
                isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
              )}>
                {schoolName}
              </span>
            </Link>
          )
        })()}
      </div>
    </aside>
  )
}
