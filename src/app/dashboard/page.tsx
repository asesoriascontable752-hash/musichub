'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Music, Tag } from 'lucide-react'
import { Song } from '@/types'
import { usePlayer } from '@/contexts/PlayerContext'
import SongCard from '@/components/Library/SongCard'
import CentralLyrics from '@/components/Lyrics/CentralLyrics'

interface Label { id: string; name: string; color: string; icon: string; songs: { songId: string }[] }

function DashboardContent() {
  const searchParams = useSearchParams()
  const activeLabelId = searchParams.get('label')

  const [songs, setSongs] = useState<Song[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [loading, setLoading] = useState(true)
  const { dispatch } = usePlayer()

  useEffect(() => {
    Promise.all([
      fetch('/api/songs').then(r => r.json()),
      fetch('/api/labels').then(r => r.json()),
    ]).then(([songsData, labelsData]) => {
      const list: Song[] = songsData.songs || []
      setSongs(list)
      setLabels(labelsData.labels || [])
      dispatch({ type: 'SET_QUEUE', payload: list })
    }).finally(() => setLoading(false))

    function onSongAdded(e: Event) {
      const song = (e as CustomEvent).detail as Song
      setSongs(prev => {
        if (prev.find(s => s.id === song.id)) return prev
        const updated = [song, ...prev]
        dispatch({ type: 'SET_QUEUE', payload: updated })
        return updated
      })
    }
    function onLabelChanged() {
      fetch('/api/labels').then(r => r.json()).then(d => setLabels(d.labels || []))
    }
    window.addEventListener('song-added', onSongAdded)
    window.addEventListener('label-changed', onLabelChanged)
    return () => {
      window.removeEventListener('song-added', onSongAdded)
      window.removeEventListener('label-changed', onLabelChanged)
    }
  }, [dispatch])

  // Songs that belong to at least one label are "filed away" in that label folder
  const labeledSongIds = new Set(labels.flatMap(l => l.songs.map(s => s.songId)))
  const activeLabel = labels.find(l => l.id === activeLabelId)
  const labelSongIds = new Set(activeLabel?.songs.map(s => s.songId) || [])

  const visibleSongs = activeLabelId
    ? songs.filter(s => labelSongIds.has(s.id))
    : songs.filter(s => !labeledSongIds.has(s.id))

  const unlabeledCount = songs.filter(s => !labeledSongIds.has(s.id)).length
  const listTitle = activeLabel
    ? activeLabel.name
    : unlabeledCount > 0 ? `Sin clasificar (${unlabeledCount})` : 'Sin clasificar'

  return (
    <div className="flex gap-5 h-full min-h-0">
      {/* Left column: song list */}
      <div className="w-72 flex-shrink-0 flex flex-col min-h-0">
        <div className="flex items-center gap-2 mb-3 flex-shrink-0">
          {activeLabel && (
            <span style={{ color: activeLabel.color }}><Tag className="w-4 h-4" /></span>
          )}
          <h2 className="text-white font-bold text-base truncate">{listTitle}</h2>
          {activeLabelId && (
            <span className="text-xs text-white/40">({visibleSongs.length})</span>
          )}
        </div>

        {loading && (
          <div className="flex justify-center pt-8">
            <div className="w-6 h-6 border-2 border-spotify-green border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && visibleSongs.length === 0 && (
          <div className="flex flex-col items-center pt-12 text-center gap-3">
            <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center">
              <Music className="w-7 h-7 text-white/20" />
            </div>
            <p className="text-spotify-light-gray text-sm">
              {activeLabelId
                ? 'No hay canciones en esta etiqueta'
                : <>Usa el <strong className="text-white">+</strong> para agregar música</>}
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-0.5 -mx-1 px-1">
          {visibleSongs.map(song => (
            <SongCard
              key={song.id}
              song={song}
              songs={visibleSongs}
              labels={labels}
              onDelete={id => setSongs(prev => prev.filter(s => s.id !== id))}
              onLabelChange={() => fetch('/api/labels').then(r => r.json()).then(d => setLabels(d.labels || []))}
            />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="w-px bg-white/5 flex-shrink-0" />

      {/* Right: lyrics */}
      <div className="flex-1 min-h-0 min-w-0 flex flex-col bg-gradient-to-b from-white/[0.03] to-transparent rounded-2xl p-5 overflow-hidden">
        <CentralLyrics />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center pt-20">
        <div className="w-8 h-8 border-2 border-spotify-green border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
