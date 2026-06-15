'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { Mic2, Edit3, Save, Plus, Music, CheckCircle2, X } from 'lucide-react'
import { usePlayer } from '@/contexts/PlayerContext'

export default function CentralLyrics() {
  const { state } = usePlayer()
  const { currentSong } = state

  const [lyrics, setLyrics] = useState<string>('')
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const [justSaved, setJustSaved] = useState(false)

  const lyricsRef = useRef<HTMLDivElement>(null)
  const lastLoadedId = useRef<string | null>(null)

  useEffect(() => {
    if (!currentSong) {
      setLyrics(''); setEditing(false); setJustSaved(false)
      lastLoadedId.current = null
      return
    }
    if (lastLoadedId.current === currentSong.id) return
    lastLoadedId.current = currentSong.id
    setLyrics(currentSong.lyrics ?? '')
    setEditing(false)
    setJustSaved(false)
    if (lyricsRef.current) lyricsRef.current.scrollTop = 0
  }, [currentSong?.id])

  async function handleSave() {
    if (!currentSong) return
    await fetch(`/api/songs/${currentSong.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lyrics: editText }),
    })
    setLyrics(editText)
    setEditing(false)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 3000)
  }

  if (!currentSong) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 text-center select-none">
        <div className="w-28 h-28 bg-white/5 rounded-full flex items-center justify-center ring-1 ring-white/10">
          <Mic2 className="w-14 h-14 text-white/20" />
        </div>
        <div>
          <h2 className="text-white text-2xl font-bold mb-2">Letra</h2>
          <p className="text-spotify-light-gray">Selecciona una canción para ver su letra</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10 flex-shrink-0">
        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-spotify-gray flex-shrink-0 shadow-lg">
          {currentSong.coverUrl ? (
            <Image src={currentSong.coverUrl} alt={currentSong.title} fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music className="w-6 h-6 text-spotify-light-gray" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-white font-bold text-base leading-tight truncate">{currentSong.title}</h2>
          <p className="text-spotify-light-gray text-xs truncate">{currentSong.artist || 'Artista desconocido'}</p>
          {justSaved && (
            <div className="flex items-center gap-1 mt-0.5 text-spotify-green">
              <CheckCircle2 className="w-3 h-3" />
              <span className="text-xs">Guardada</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {!editing && (
            <button onClick={() => { setEditing(true); setEditText(lyrics) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-white/5 text-spotify-light-gray hover:text-white hover:bg-white/10 transition-colors border border-white/10">
              {lyrics ? <><Edit3 className="w-3 h-3" /> Editar</> : <><Plus className="w-3 h-3" /> Agregar letra</>}
            </button>
          )}
          {editing && (
            <button onClick={() => setEditing(false)}
              className="p-1.5 rounded-full text-spotify-light-gray hover:text-white hover:bg-white/10 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div ref={lyricsRef} className="flex-1 overflow-y-auto pr-1 lyrics-scroll">

        {/* Editor */}
        {editing && (
          <div className="space-y-3">
            <p className="text-spotify-light-gray text-xs">Pega o escribe la letra:</p>
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              placeholder="Escribe o pega la letra aquí…"
              autoFocus
              className="w-full min-h-[380px] bg-white/5 text-white text-sm leading-relaxed rounded-xl p-4 border border-white/10 focus:border-spotify-green focus:outline-none resize-none placeholder-white/20"
            />
            <div className="flex gap-2">
              <button onClick={handleSave}
                className="flex items-center gap-2 px-5 py-2.5 bg-spotify-green text-black font-bold rounded-full hover:bg-spotify-green/90 active:scale-95 transition-all text-sm">
                <Save className="w-4 h-4" /> Guardar
              </button>
              <button onClick={() => setEditing(false)}
                className="px-5 py-2.5 bg-white/10 text-white rounded-full hover:bg-white/15 transition-colors text-sm">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!editing && !lyrics && (
          <div className="flex flex-col items-center justify-center gap-5 py-14 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
              <Mic2 className="w-8 h-8 text-white/20" />
            </div>
            <div>
              <p className="text-white font-semibold mb-1">Sin letra guardada</p>
              <p className="text-spotify-light-gray text-sm max-w-xs">Agrega la letra manualmente con el botón de arriba.</p>
            </div>
            <button onClick={() => { setEditing(true); setEditText('') }}
              className="flex items-center gap-2 px-4 py-2 bg-spotify-green text-black font-bold rounded-full text-sm hover:bg-spotify-green/90 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Agregar letra
            </button>
          </div>
        )}

        {/* Lyrics display */}
        {!editing && lyrics && (
          <div className="text-white/90 text-[15px] leading-[2.1] whitespace-pre-line select-text pb-4">
            {lyrics}
          </div>
        )}
      </div>
    </div>
  )
}
