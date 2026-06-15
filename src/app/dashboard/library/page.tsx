'use client'

import { useEffect, useState } from 'react'
import { Music, Youtube, FileAudio, Link2 } from 'lucide-react'
import { Song } from '@/types'
import { usePlayer } from '@/contexts/PlayerContext'
import SongCard from '@/components/Library/SongCard'

type Filter = 'all' | 'youtube' | 'local' | 'url'
interface Label { id: string; name: string; color: string; songs: { songId: string }[] }

export default function LibraryPage() {
  const [songs, setSongs] = useState<Song[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const { dispatch } = usePlayer()

  function refreshLabels() {
    fetch('/api/labels').then(r => r.json()).then(d => setLabels(d.labels || []))
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/songs').then(r => r.json()),
      fetch('/api/labels').then(r => r.json()),
    ]).then(([songsData, labelsData]) => {
      setSongs(songsData.songs || [])
      setLabels(labelsData.labels || [])
      if (songsData.songs?.length > 0) dispatch({ type: 'SET_QUEUE', payload: songsData.songs })
    }).finally(() => setLoading(false))
  }, [dispatch])

  useEffect(() => {
    function onSongAdded(e: Event) {
      const song = (e as CustomEvent).detail as Song
      setSongs(prev => prev.find(s => s.id === song.id) ? prev : [song, ...prev])
    }
    function onLabelChanged() { refreshLabels() }
    window.addEventListener('song-added', onSongAdded)
    window.addEventListener('label-changed', onLabelChanged)
    return () => {
      window.removeEventListener('song-added', onSongAdded)
      window.removeEventListener('label-changed', onLabelChanged)
    }
  }, [])

  const filtered = filter === 'all' ? songs : songs.filter(s => s.sourceType === filter)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Tu biblioteca</h1>
        <span className="text-spotify-light-gray text-sm">{songs.length} canciones</span>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')} label="Todas" />
        <FilterBtn active={filter === 'youtube'} onClick={() => setFilter('youtube')} label="YouTube" icon={<Youtube className="w-3 h-3" />} />
        <FilterBtn active={filter === 'local'} onClick={() => setFilter('local')} label="Archivos locales" icon={<FileAudio className="w-3 h-3" />} />
        <FilterBtn active={filter === 'url'} onClick={() => setFilter('url')} label="URLs" icon={<Link2 className="w-3 h-3" />} />
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-spotify-green border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center py-20 text-center gap-4">
          <Music className="w-16 h-16 text-spotify-light-gray/30" />
          <p className="text-white font-semibold">No hay canciones</p>
          <p className="text-spotify-light-gray text-sm">
            {filter === 'all' ? 'Agrega música desde el botón + en la barra lateral' : `No tienes canciones de tipo "${filter}"`}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-1">
          {/* Header */}
          <div className="grid grid-cols-[auto_1fr_auto] gap-3 px-4 py-2 text-xs text-spotify-light-gray uppercase tracking-wider border-b border-white/5 mb-2">
            <span className="w-10">#</span>
            <span>Título</span>
            <span>Tipo</span>
          </div>
          {filtered.map((song, i) => (
            <div key={song.id} className="flex items-center gap-3">
              <span className="text-xs text-spotify-light-gray w-6 text-center flex-shrink-0">{i + 1}</span>
              <div className="flex-1">
                <SongCard
                song={song}
                songs={filtered}
                labels={labels}
                onDelete={(id) => setSongs(prev => prev.filter(s => s.id !== id))}
                onLabelChange={refreshLabels}
              />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FilterBtn({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon?: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
        active ? 'bg-white text-black font-semibold' : 'bg-spotify-gray text-spotify-light-gray hover:text-white hover:bg-white/10'
      }`}>
      {icon} {label}
    </button>
  )
}
