'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Menu } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import Player from '@/components/Player'
import AddSongModal from '@/components/AddSong/AddSongModal'
import { Song } from '@/types'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession()
  const router = useRouter()
  const [showAddModal, setShowAddModal] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-spotify-black flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-spotify-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (status === 'unauthenticated') return null

  return (
    <div className="flex flex-col h-screen bg-spotify-black overflow-hidden">
      {/* Mobile top bar */}
      <div className="flex md:hidden items-center gap-3 px-4 py-3 bg-[#181818] border-b border-white/5 flex-shrink-0 z-40">
        <button
          onClick={() => setSidebarOpen(true)}
          className="text-white p-1.5 rounded-md hover:bg-white/10 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-white font-bold text-base">MusicHub</span>
      </div>

      {/* Overlay backdrop (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        <Sidebar
          onAddSong={() => { setShowAddModal(true); setSidebarOpen(false) }}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main content */}
        <main className="flex-1 overflow-hidden bg-gradient-to-b from-[#1a1a1a] to-spotify-black">
          <div className="h-full p-3 md:p-5 overflow-hidden">
            {children}
          </div>
        </main>
      </div>

      {/* Player */}
      <Player />

      {/* Add song modal */}
      {showAddModal && (
        <AddSongModal
          onClose={() => setShowAddModal(false)}
          onAdded={(_song: Song) => setShowAddModal(false)}
        />
      )}
    </div>
  )
}
