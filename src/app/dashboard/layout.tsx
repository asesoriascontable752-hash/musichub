'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Player from '@/components/Player'
import AddSongModal from '@/components/AddSong/AddSongModal'
import { Song } from '@/types'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession()
  const router = useRouter()
  const [showAddModal, setShowAddModal] = useState(false)

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
      {/* Main area */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Sidebar */}
        <Sidebar onAddSong={() => setShowAddModal(true)} />

        {/* Main content — full height, no outer scroll */}
        <main className="flex-1 overflow-hidden bg-gradient-to-b from-[#1a1a1a] to-spotify-black">
          <div className="h-full p-5 overflow-hidden">
            {children}
          </div>
        </main>
      </div>

      {/* Player — fixed at bottom */}
      <Player />

      {/* Add song modal */}
      {showAddModal && (
        <AddSongModal
          onClose={() => setShowAddModal(false)}
          onAdded={(song: Song) => {
            setShowAddModal(false)
          }}
        />
      )}
    </div>
  )
}
