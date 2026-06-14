import type { Metadata } from 'next'
import './globals.css'
import { SessionProvider } from '@/components/SessionProvider'
import { PlayerProvider } from '@/contexts/PlayerContext'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'MusicHub - Tu música, en todas partes',
  description: 'Reproduce música de YouTube, archivos locales y más con letras incluidas',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <SessionProvider>
          <PlayerProvider>
            {children}
          </PlayerProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
