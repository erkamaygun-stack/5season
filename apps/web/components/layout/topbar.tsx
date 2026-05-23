'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Bell, LogOut, ChevronDown } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Avatar from '@radix-ui/react-avatar'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface TopbarProps {
  schoolName: string
  userName: string
}

export default function Topbar({ schoolName, userName }: TopbarProps) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <header className="fixed left-60 right-0 top-0 h-14 bg-white border-b flex items-center justify-between px-6 z-30">
      <span className="text-sm font-medium text-gray-600">{schoolName}</span>

      <div className="flex items-center gap-3">
        <Link
          href="/bildirimler"
          className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        >
          <Bell className="w-5 h-5" />
        </Link>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className={cn(
              'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none'
            )}>
              <Avatar.Root className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                <Avatar.Fallback className="text-white text-xs font-semibold">
                  {initials}
                </Avatar.Fallback>
              </Avatar.Root>
              <span className="hidden sm:block max-w-[120px] truncate">{userName}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={4}
              className="z-50 min-w-[160px] rounded-md border bg-white shadow-md p-1 text-sm"
            >
              <DropdownMenu.Item
                onSelect={handleSignOut}
                className="flex items-center gap-2 rounded-sm px-3 py-2 text-gray-700 cursor-pointer hover:bg-gray-100 focus:outline-none"
              >
                <LogOut className="w-4 h-4" />
                Çıkış Yap
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  )
}
