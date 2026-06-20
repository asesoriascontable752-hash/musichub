'use client'

import { useState, useEffect } from 'react'
import { Users, Globe } from 'lucide-react'
import SongCard from '@/components/Library/SongCard'
import { Song } from '@/types'

interface Label { id: string; name: string; color: string; songs: { songId: string }[] }

export default function SharedPage() {
  const [songs, setSongs] = useState<Song[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/songs?view=shared').then(r => r.json()),
      fetch('/api/labels').then(r => r.json()),
    ]).then(([songsData, labelsData]) => {
      setSongs(songsData.songs || [])
      setLabels(labelsData.labels || [])
      setLoading(false)
    })
  }, [])

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto py-6 px-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-spotify-green/20 rounded-full flex items-center justify-center">
            <Globe className="w-5 h-5 text-spotify-green" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Canciones compartidas</h1>
            <p className="text-spotify-light-gray text-xs">Compartidas públicamente por otros usuarios</p>
          </div>
        </div>

        <div className="h-px bg-white/10 my-5" />

        {loading && (
          <div className="flex items-center gap-2 text-spotify-light-gray text-sm py-8">
            <div className="w-4 h-4 border-2 border-white/20 border-t-spotify-green rounded-full animate-spin" />
            Cargando...
          </div>
        )}

        {!loading && songs.length === 0 && (
          <div className="text-center py-16">
            <Users className="w-14 h-14 text-white/10 mx-auto mb-4" />
            <p className="text-white/40 font-medium">Aún no hay canciones compartidas</p>
            <p className="text-white/20 text-sm mt-1">
              Cuando alguien comparta una canción aparecerá aquí
            </p>
          </div>
        )}

        {!loading && songs.length > 0 && (
          <div className="space-y-1">
            {songs.map(song => (
              <SongCard
                key={song.id}
                song={song}
                songs={songs}
                labels={labels}
                onDelete={id => setSongs(s => s.filter(x => x.id !== id))}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
