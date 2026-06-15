'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import {
  Mic2, Edit3, Save, RefreshCw, Plus, Loader2,
  Music, CheckCircle2, X, Sparkles, Globe, Youtube,
} from 'lucide-react'
import { usePlayer } from '@/contexts/PlayerContext'

// ── Types ──────────────────────────────────────────────────────────────────────
type AIProvider = 'claude' | 'gemini' | 'perplexity' | 'ollama'
type LyricsSource = 'online' | 'youtube' | AIProvider | 'manual' | null
type LoadingStep = 'online' | 'youtube' | AIProvider | null

const AI_PROVIDERS: { id: AIProvider; label: string; color: string; emoji: string }[] = [
  { id: 'claude',      label: 'Claude Haiku',    color: 'text-orange-400',  emoji: '🤖' },
  { id: 'gemini',      label: 'Gemini Flash',    color: 'text-blue-400',    emoji: '✨' },
  { id: 'perplexity',  label: 'Perplexity AI',   color: 'text-purple-400',  emoji: '🔍' },
  { id: 'ollama',      label: 'Ollama (local)',   color: 'text-green-400',   emoji: '🦙' },
]

const SOURCE_LABELS: Record<NonNullable<LyricsSource>, { text: string; color: string; icon: React.ReactNode }> = {
  online:     { text: 'Encontrada online',        color: 'text-blue-400',    icon: <Globe className="w-3 h-3" /> },
  youtube:    { text: 'Subtítulos de YouTube',    color: 'text-red-400',     icon: <Youtube className="w-3 h-3" /> },
  claude:     { text: 'Claude Haiku',             color: 'text-orange-400',  icon: <span>🤖</span> },
  gemini:     { text: 'Gemini Flash',             color: 'text-blue-400',    icon: <span>✨</span> },
  perplexity: { text: 'Perplexity AI',            color: 'text-purple-400',  icon: <span>🔍</span> },
  ollama:     { text: 'Ollama local',             color: 'text-green-400',   icon: <span>🦙</span> },
  manual:     { text: 'Guardada',                 color: 'text-spotify-green', icon: <CheckCircle2 className="w-3 h-3" /> },
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CentralLyrics() {
  const { state } = usePlayer()
  const { currentSong } = state

  const [lyrics, setLyrics] = useState<string>('')
  const [source, setSource] = useState<LyricsSource>(null)
  const [loadingStep, setLoadingStep] = useState<LoadingStep>(null)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [triedProviders, setTriedProviders] = useState<AIProvider[]>([])

  const lyricsRef = useRef<HTMLDivElement>(null)
  const lastFetchedId = useRef<string | null>(null)

  useEffect(() => {
    if (!currentSong) {
      setLyrics(''); setSource(null); setNotFound(false); setEditing(false); setTriedProviders([])
      return
    }
    if (lastFetchedId.current === currentSong.id) return
    lastFetchedId.current = currentSong.id

    if (currentSong.lyrics) {
      setLyrics(currentSong.lyrics); setSource('manual'); setNotFound(false); setJustSaved(false)
      return
    }
    fetchAll(currentSong.id, currentSong.artist, currentSong.title)
  }, [currentSong?.id])

  async function fetchAll(id?: string, artist?: string | null, title?: string) {
    const songId    = id     ?? currentSong?.id
    const songArtist = artist ?? currentSong?.artist
    const songTitle  = title  ?? currentSong?.title

    setLyrics(''); setSource(null); setNotFound(false); setJustSaved(false); setTriedProviders([])
    if (lyricsRef.current) lyricsRef.current.scrollTop = 0

    // ── 1. Lyrics.ovh (online DB) ─────────────────────────────────
    setLoadingStep('online')
    const online = await tryOnline(songArtist, songTitle)
    if (online) { finish('online', online, songId); return }

    // ── 2. YouTube subtitles ──────────────────────────────────────
    const ytId = currentSong?.sourceUrl?.match(/(?:v=|youtu\.be\/)([^&\n?#]+)/)?.[1]
    if (ytId) {
      setLoadingStep('youtube')
      const yt = await tryYouTube(ytId)
      if (yt) { finish('youtube', yt, songId); return }
    }

    // ── 3. AI providers cascade ───────────────────────────────────
    if (songTitle) {
      for (const p of AI_PROVIDERS) {
        setLoadingStep(p.id)
        setTriedProviders(prev => [...prev, p.id])
        const result = await tryAI(p.id, songArtist ?? null, songTitle)
        if (result) { finish(p.id, result, songId); return }
      }
    }

    setLoadingStep(null)
    setNotFound(true)
  }

  function finish(src: LyricsSource, text: string, songId?: string) {
    setLyrics(text); setSource(src); setLoadingStep(null); setTriedProviders([])
    if (songId) autoSave(songId, text)
  }

  async function tryOnline(artist?: string | null, title?: string): Promise<string | null> {
    if (!artist || !title) return null
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 7000)
      const res = await fetch(
        `/api/lyrics?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`,
        { signal: ctrl.signal }
      ).finally(() => clearTimeout(t))
      return (await res.json()).lyrics || null
    } catch { return null }
  }

  async function tryYouTube(videoId: string): Promise<string | null> {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 12000)
      const res = await fetch(`/api/lyrics/youtube?videoId=${encodeURIComponent(videoId)}`, { signal: ctrl.signal })
        .finally(() => clearTimeout(t))
      return (await res.json()).transcript || null
    } catch { return null }
  }

  async function tryAI(provider: AIProvider, artist: string | null, title: string): Promise<string | null> {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), provider === 'ollama' ? 60000 : 25000)
      const artistParam = artist ? `&artist=${encodeURIComponent(artist)}` : ''
      const res = await fetch(
        `/api/lyrics/ai?provider=${provider}${artistParam}&title=${encodeURIComponent(title)}`,
        { signal: ctrl.signal }
      ).finally(() => clearTimeout(t))
      return (await res.json()).lyrics || null
    } catch { return null }
  }

  async function autoSave(songId: string, text: string) {
    await fetch(`/api/songs/${songId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lyrics: text }),
    })
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 4000)
  }

  async function handleSave() {
    if (!currentSong) return
    await fetch(`/api/songs/${currentSong.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lyrics: editText }),
    })
    setLyrics(editText); setSource('manual'); setEditing(false)
    setNotFound(!editText); setJustSaved(true)
    setTimeout(() => setJustSaved(false), 3000)
  }

  function retry() {
    if (!currentSong) return
    lastFetchedId.current = null
    fetchAll(currentSong.id, currentSong.artist, currentSong.title)
  }

  // ── Empty state ────────────────────────────────────────────────────────────
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

  const isLoading = loadingStep !== null
  const currentAI = AI_PROVIDERS.find(p => p.id === loadingStep)
  const sourceMeta = source ? SOURCE_LABELS[source] : null

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ──────────────────────────────────────────────────────── */}
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

          {/* Source badge */}
          {!isLoading && sourceMeta && (
            <div className={`flex items-center gap-1 mt-0.5 ${sourceMeta.color}`}>
              {sourceMeta.icon}
              <span className="text-xs">{sourceMeta.text}</span>
              {justSaved && source !== 'manual' && (
                <span className="text-xs text-spotify-green ml-1">· guardada ✓</span>
              )}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {!editing && (
            <button onClick={retry} disabled={isLoading} title="Buscar con IA"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-white/5 text-spotify-light-gray hover:text-white hover:bg-white/10 transition-colors border border-white/10 disabled:opacity-40">
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} /> Buscar
            </button>
          )}
          {!editing && (
            <button onClick={() => { setEditing(true); setEditText(lyrics) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-white/5 text-spotify-light-gray hover:text-white hover:bg-white/10 transition-colors border border-white/10">
              <Edit3 className="w-3 h-3" /> {lyrics ? 'Editar' : 'Agregar'}
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

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div ref={lyricsRef} className="flex-1 overflow-y-auto pr-1 lyrics-scroll">

        {/* Loading state — shows pipeline progress */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-6 py-10">
            <Loader2 className={`w-8 h-8 animate-spin ${currentAI ? currentAI.color : 'text-spotify-green'}`} />

            {/* Current step label */}
            <div className="text-center">
              {loadingStep === 'online' && (
                <p className="text-blue-400 text-sm font-medium flex items-center gap-2 justify-center">
                  <Globe className="w-4 h-4" /> Buscando en internet (lyrics.ovh)…
                </p>
              )}
              {loadingStep === 'youtube' && (
                <p className="text-red-400 text-sm font-medium flex items-center gap-2 justify-center">
                  <Youtube className="w-4 h-4" /> Leyendo subtítulos de YouTube…
                </p>
              )}
              {currentAI && (
                <p className={`text-sm font-medium flex items-center gap-2 justify-center ${currentAI.color}`}>
                  <Sparkles className="w-4 h-4" />
                  {currentAI.emoji} Preguntando a {currentAI.label}…
                </p>
              )}
            </div>

            {/* Progress chips — AI providers tried so far */}
            {triedProviders.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {AI_PROVIDERS.map(p => {
                  const tried = triedProviders.includes(p.id)
                  const active = loadingStep === p.id
                  return (
                    <span key={p.id}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-all ${
                        active
                          ? `${p.color} border-current bg-white/5 font-semibold`
                          : tried
                          ? 'text-white/30 border-white/10 line-through'
                          : 'text-white/20 border-white/5'
                      }`}>
                      {p.emoji} {p.label}
                      {tried && !active && ' ✗'}
                      {active && <Loader2 className="w-2.5 h-2.5 animate-spin ml-0.5" />}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Editor */}
        {!isLoading && editing && (
          <div className="space-y-3">
            <p className="text-spotify-light-gray text-xs">Pega o escribe la letra manualmente:</p>
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

        {/* Not found */}
        {!isLoading && !editing && notFound && (
          <div className="flex flex-col items-center justify-center gap-5 py-14 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
              <Mic2 className="w-8 h-8 text-white/20" />
            </div>
            <div>
              <p className="text-white font-semibold mb-1">Letra no encontrada</p>
              <p className="text-spotify-light-gray text-sm max-w-xs">
                Se probaron todos los motores de IA sin éxito. Puedes agregarla manualmente.
              </p>
            </div>
            {/* Show which providers were tried */}
            <div className="flex flex-wrap gap-1.5 justify-center">
              <span className="text-xs text-white/40 px-2 py-1 rounded-full border border-white/10">🌐 lyrics.ovh ✗</span>
              {currentSong.sourceType === 'youtube' && (
                <span className="text-xs text-white/40 px-2 py-1 rounded-full border border-white/10">📺 YouTube subtítulos ✗</span>
              )}
              {AI_PROVIDERS.map(p => (
                <span key={p.id} className="text-xs text-white/40 px-2 py-1 rounded-full border border-white/10">
                  {p.emoji} {p.label} ✗
                </span>
              ))}
            </div>
            <div className="flex gap-3 flex-wrap justify-center mt-2">
              <button onClick={retry}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-full text-sm hover:bg-white/15 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" /> Reintentar
              </button>
              <button onClick={() => { setEditing(true); setEditText('') }}
                className="flex items-center gap-2 px-4 py-2 bg-spotify-green text-black font-bold rounded-full text-sm hover:bg-spotify-green/90 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Agregar manualmente
              </button>
            </div>
          </div>
        )}

        {/* Lyrics display */}
        {!isLoading && !editing && lyrics && (
          <div className="text-white/90 text-[15px] leading-[2.1] whitespace-pre-line select-text pb-4">
            {lyrics}
          </div>
        )}
      </div>
    </div>
  )
}
