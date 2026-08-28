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
  const isReadOnlyRealDataTest = process.env.NEXT_PUBLIC_REAL_DATA_TEST_MODE === 'read_only'

  return (
    <html lang="tr" className={`dark ${inter.variable}`}>
      <body className="font-sans antialiased">
        {isReadOnlyRealDataTest && (
          <div className="fixed inset-x-0 top-0 z-[100] bg-amber-400 px-4 py-2 text-center text-sm font-semibold text-amber-950 shadow-sm">
            Gerçek veri · salt okunur test modu — kaydetme, silme ve dış bildirimler kapalı
          </div>
        )}
        <div className={isReadOnlyRealDataTest ? 'pt-9' : undefined}>
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  )
}
