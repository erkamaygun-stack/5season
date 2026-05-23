import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Providers from '@/components/providers'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: '5mevsim — Yönetim Paneli',
  description: 'Halısaha ve futbol okulu yönetim platformu',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className={inter.variable}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
