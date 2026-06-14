'use client'

import { useState, useEffect } from 'react'
import { Mic2, X, Loader2, Edit3, Save, RefreshCw } from 'lucide-react'
import { usePlayer } from '@/contexts/PlayerContext'

export default function LyricsPanel() {
  const { state, dispatch } = usePlayer()
  const { currentSong, showLyrics } = state
  const [lyrics, setLyrics] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!currentSong || !showLyrics) return
    if (currentSong.lyrics) {
      setLyrics(currentSong.lyrics)
      setNotFound(false)
      return
    }
    fetchLyrics()
  }, [currentSong?.id, showLyrics])

  async function fetchLyrics() {
    if (!currentSong?.artist || !currentSong?.title) {
      setNotFound(true)
      return
    }
    setLoading(true)
    setNotFound(false)
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      const res = await fetch(
        `/api/lyrics?artist=${encodeURIComponent(currentSong.artist)}&title=${encodeURIComponent(currentSong.title)}`,
        { signal: controller.signal }
      ).finally(() => clearTimeout(timeout))
      const data = await res.json()
      if (data.lyrics) {
        setLyrics(data.lyrics)
        setNotFound(false)
      } else {
        setLyrics('')
        setNotFound(true)
      }
    } catch {
      setNotFound(true)
    }
    setLoading(false)
  }

  async function saveLyrics() {
    if (!currentSong) return
    await fetch(`/api/songs/${currentSong.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lyrics: editText }),
    })
    setLyrics(editText)
    setEditing(false)
  }

  if (!showLyrics) return null

  return (
    <div className="w-80 bg-[#121212] border-l border-white/5 flex flex-col overflow-hidden flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Mic2 className="w-5 h-5 text-spotify-green" />
          <h3 className="text-white font-semibold text-sm">Letra</h3>
        </div>
        <div className="flex items-center gap-2">
          {!editing && (
            <button onClick={() => { setEditing(true); setEditText(lyrics) }}
              className="text-spotify-light-gray hover:text-white transition-colors" title="Editar letra">
              <Edit3 className="w-4 h-4" />
            </button>
          )}
          {!editing && currentSong?.artist && (
            <button onClick={fetchLyrics} className="text-spotify-light-gray hover:text-white transition-colors" title="Buscar letra">
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => dispatch({ type: 'TOGGLE_LYRICS' })}
            className="text-spotify-light-gray hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Song info */}
      {currentSong && (
        <div className="px-5 py-3 border-b border-white/5">
          <p className="text-white text-sm font-medium truncate">{currentSong.title}</p>
          <p className="text-spotify-light-gray text-xs truncate">{currentSong.artist || 'Artista desconocido'}</p>
        </div>
      )}

      {/* Lyrics content */}
      <div className="flex-1 overflow-y-auto lyrics-scroll p-5">
        {!currentSong && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <Mic2 className="w-12 h-12 text-spotify-light-gray/30" />
            <p className="text-spotify-light-gray text-sm">Selecciona una canción para ver la letra</p>
          </div>
        )}

        {currentSong && loading && (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 text-spotify-green animate-spin" />
          </div>
        )}

        {currentSong && !loading && editing && (
          <div className="space-y-3">
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              placeholder="Pega o escribe la letra aquí..."
              className="w-full h-96 bg-spotify-gray text-white text-sm rounded-lg p-3 border border-white/10 focus:border-spotify-green focus:outline-none resize-none placeholder-spotify-light-gray/40"
            />
            <div className="flex gap-2">
              <button onClick={saveLyrics}
                className="flex-1 py-2 bg-spotify-green text-black font-bold rounded-full text-sm flex items-center justify-center gap-2 hover:bg-spotify-green/90 transition-colors">
                <Save className="w-4 h-4" /> Guardar
              </button>
              <button onClick={() => setEditing(false)}
                className="flex-1 py-2 bg-spotify-gray text-white rounded-full text-sm hover:bg-white/10 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {currentSong && !loading && !editing && notFound && (
          <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <Mic2 className="w-10 h-10 text-spotify-light-gray/30" />
            <p className="text-spotify-light-gray text-sm">Letra no encontrada</p>
            <button onClick={() => { setEditing(true); setEditText('') }}
              className="px-4 py-2 bg-spotify-gray text-white rounded-full text-sm hover:bg-white/10 transition-colors flex items-center gap-2">
              <Edit3 className="w-4 h-4" /> Agregar letra manualmente
            </button>
          </div>
        )}

        {currentSong && !loading && !editing && lyrics && (
          <div className="text-white/90 text-sm leading-relaxed whitespace-pre-line">
            {lyrics}
          </div>
        )}
      </div>
    </div>
  )
}
