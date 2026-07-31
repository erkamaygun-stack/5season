'use client'

import { useState } from 'react'
import Sidebar from './sidebar'
import { cn } from '@/lib/utils'

interface AdminShellProps {
  children: React.ReactNode
  schoolName: string
  logoUrl?: string | null
}

export default function AdminShell({ children, schoolName, logoUrl }: AdminShellProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        schoolName={schoolName}
        logoUrl={logoUrl}
        isOpen={isOpen}
        onHover={() => setIsOpen(true)}
        onLeave={() => setIsOpen(false)}
      />
      <main
        className={cn(
          'min-h-screen transition-all duration-300 ease-in-out',
          isOpen ? 'ml-[240px]' : 'ml-[72px]'
        )}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
