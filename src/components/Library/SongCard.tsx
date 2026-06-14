'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Play, Pause, Trash2, Youtube, Music, FileAudio, Link2, Tag, Check, X } from 'lucide-react'
import { Song } from '@/types'
import { usePlayer } from '@/contexts/PlayerContext'

interface Label { id: string; name: string; color: string; songs: { songId: string }[] }

interface SongCardProps {
  song: Song
  songs: Song[]
  labels?: Label[]
  onDelete: (id: string) => void
  onLabelChange?: () => void
}

const SOURCE_ICONS = {
  youtube: <Youtube className="w-3 h-3 text-red-400" />,
  spotify: <Music className="w-3 h-3 text-spotify-green" />,
  local: <FileAudio className="w-3 h-3 text-blue-400" />,
  url: <Link2 className="w-3 h-3 text-purple-400" />,
}
const SOURCE_LABELS = { youtube: 'YouTube', spotify: 'Spotify', local: 'Local', url: 'URL' }

export default function SongCard({ song, songs, labels = [], onDelete, onLabelChange }: SongCardProps) {
  const { state, playSong } = usePlayer()
  const isCurrentSong = state.currentSong?.id === song.id
  const isPlaying = isCurrentSong && state.isPlaying
  const [showLabels, setShowLabels] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close label menu on outside click
  useEffect(() => {
    if (!showLabels) return
    function close(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowLabels(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [showLabels])

  async function toggleLabel(labelId: string, hasSong: boolean) {
    setSaving(labelId)
    const method = hasSong ? 'DELETE' : 'POST'
    await fetch(`/api/labels/${labelId}/songs`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId: song.id }),
    })
    setSaving(null)
    onLabelChange?.()
    window.dispatchEvent(new CustomEvent('label-changed'))
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('¿Eliminar esta canción de tu biblioteca?')) return
    await fetch(`/api/songs/${song.id}`, { method: 'DELETE' })
    onDelete(song.id)
  }

  const songLabels = labels.filter(l => l.songs.some(s => s.songId === song.id))

  return (
    <div
      onClick={() => playSong(song, songs)}
      className={`group relative flex items-center gap-3 px-4 py-3 rounded-md cursor-pointer transition-all ${
        isCurrentSong ? 'bg-white/10' : 'hover:bg-white/5'
      }`}
    >
      {/* Cover */}
      <div className="relative w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-spotify-gray">
        {song.coverUrl ? (
          <Image src={song.coverUrl} alt={song.title} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="w-5 h-5 text-spotify-light-gray" />
          </div>
        )}
        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isCurrentSong ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          {isPlaying ? <Pause className="w-4 h-4 text-white fill-current" /> : <Play className="w-4 h-4 text-white fill-current ml-0.5" />}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isCurrentSong ? 'text-spotify-green' : 'text-white'}`}>{song.title}</p>
        <div className="flex items-center gap-1.5">
          {SOURCE_ICONS[song.sourceType]}
          <p className="text-xs text-spotify-light-gray truncate">{song.artist || 'Artista desconocido'} · {SOURCE_LABELS[song.sourceType]}</p>
        </div>
        {/* Label chips */}
        {songLabels.length > 0 && (
          <div className="flex gap-1 mt-0.5 flex-wrap">
            {songLabels.map(l => (
              <span key={l.id} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: l.color + '22', color: l.color }}>
                {l.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Label button */}
        {labels.length > 0 && (
          <div className="relative" ref={menuRef}>
            <button onClick={e => { e.stopPropagation(); setShowLabels(v => !v) }}
              className="p-1.5 text-spotify-light-gray hover:text-white transition-colors rounded"
              title="Agregar etiqueta">
              <Tag className="w-3.5 h-3.5" />
            </button>

            {showLabels && (
              <div onClick={e => e.stopPropagation()}
                className="absolute right-0 bottom-8 z-50 w-48 bg-[#282828] rounded-xl border border-white/10 shadow-2xl py-1.5 overflow-hidden">
                <p className="text-xs text-white/40 px-3 py-1 font-medium">Agregar a etiqueta</p>
                {labels.map(label => {
                  const has = label.songs.some(s => s.songId === song.id)
                  return (
                    <button key={label.id} onClick={() => toggleLabel(label.id, has)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors text-left">
                      <span className="w-4 h-4 flex items-center justify-center">
                        {saving === label.id
                          ? <div className="w-3 h-3 border border-white/40 border-t-transparent rounded-full animate-spin" />
                          : has ? <Check className="w-3.5 h-3.5 text-spotify-green" /> : null}
                      </span>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }} />
                      <span className="text-sm text-white truncate">{label.name}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <button onClick={handleDelete}
          className="p-1.5 text-spotify-light-gray hover:text-red-400 transition-colors rounded">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
