'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Link2, Upload, Youtube, Music, FileVideo, Loader2, Search, Lock } from 'lucide-react'
import { Song } from '@/types'

type Tab = 'url' | 'upload'

interface Perms { canAddSongs: boolean; canUpload: boolean }
interface AddSongModalProps { onClose: () => void; onAdded: (song: Song) => void }

export default function AddSongModal({ onClose, onAdded }: AddSongModalProps) {
  const [tab, setTab] = useState<Tab>('url')
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchingInfo, setFetchingInfo] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [perms, setPerms] = useState<Perms | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be')
  const isSpotify = url.includes('spotify.com')

  useEffect(() => {
    fetch('/api/permissions/me').then(r => r.json()).then(d => setPerms(d.permissions ?? null))
  }, [])

  // Auto-fetch metadata 600ms after the user stops typing/pasting
  const lastAutoFetched = useRef('')
  useEffect(() => {
    if (!url || url === lastAutoFetched.current) return
    const timer = setTimeout(() => {
      lastAutoFetched.current = url
      if (isYouTube) fetchYouTubeInfo()
      else if (isSpotify) fetchSpotifyInfo()
    }, 600)
    return () => clearTimeout(timer)
  }, [url])

  async function fetchYouTubeInfo() {
    if (!isYouTube || !url) return
    setFetchingInfo(true)
    try {
      const res = await fetch(`/api/youtube-info?url=${encodeURIComponent(url)}`)
      const data = await res.json()
      if (data.title) setTitle(data.title)
      if (data.artist) setArtist(data.artist)
    } catch {}
    setFetchingInfo(false)
  }

  async function fetchSpotifyInfo() {
    if (!isSpotify || !url) return
    setFetchingInfo(true)
    try {
      const res = await fetch(`/api/spotify-info?url=${encodeURIComponent(url)}`)
      const data = await res.json()
      if (data.title) setTitle(data.title)
      if (data.artist) setArtist(data.artist)
    } catch {}
    setFetchingInfo(false)
  }

  async function handleUrlBlur() {
    if (isYouTube) fetchYouTubeInfo()
    else if (isSpotify) fetchSpotifyInfo()
  }

  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url || !title) { setError('URL y título son requeridos'); return }
    setError('')
    setLoading(true)

    let sourceType: Song['sourceType'] = 'url'
    let coverUrl: string | null = null

    if (isYouTube) {
      sourceType = 'youtube'
      const idMatch = url.match(/(?:v=|youtu\.be\/)([^&\n?#]+)/)
      if (idMatch) coverUrl = `https://img.youtube.com/vi/${idMatch[1]}/hqdefault.jpg`
    } else if (isSpotify) {
      sourceType = 'spotify'
      try {
        const res = await fetch(`/api/spotify-info?url=${encodeURIComponent(url)}`)
        const data = await res.json()
        if (data.coverUrl) coverUrl = data.coverUrl
      } catch {}
    }

    const res = await fetch('/api/songs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, artist: artist || undefined, sourceType, sourceUrl: url, coverUrl }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) { setError(data.error || 'Error al agregar'); return }
    window.dispatchEvent(new CustomEvent('song-added', { detail: data.song }))
    onAdded(data.song)
    onClose()
  }

  async function handleFile(file: File) {
    if (!file) return
    setError('')
    setLoading(true)

    const formData = new FormData()
    formData.append('file', file)

    const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
    const uploadData = await uploadRes.json()

    if (!uploadRes.ok) { setError(uploadData.error || 'Error al subir'); setLoading(false); return }

    const songName = file.name.replace(/\.[^.]+$/, '')
    const res = await fetch('/api/songs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title || songName,
        artist: artist || undefined,
        sourceType: 'local',
        filePath: uploadData.url,
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) { setError(data.error || 'Error al guardar'); return }
    window.dispatchEvent(new CustomEvent('song-added', { detail: data.song }))
    onAdded(data.song)
    onClose()
  }

  // Permission denied view
  const noPerm = perms !== null && (
    (tab === 'url' && !perms.canAddSongs) ||
    (tab === 'upload' && (!perms.canUpload || !perms.canAddSongs))
  )

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-spotify-dark rounded-2xl w-full max-w-md shadow-2xl border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 className="text-lg font-bold text-white">Agregar música</h2>
          <button onClick={onClose} className="text-spotify-light-gray hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 gap-2 mb-6">
          <TabBtn active={tab === 'url'} onClick={() => setTab('url')} icon={<Link2 className="w-4 h-4" />} label="URL / Link" />
          <TabBtn active={tab === 'upload'} onClick={() => setTab('upload')} icon={<Upload className="w-4 h-4" />} label="Archivo local" />
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* No permission banner */}
          {noPerm && (
            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <Lock className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 font-semibold text-sm">Sin permisos</p>
                <p className="text-white/60 text-xs mt-0.5">No tienes permiso para {tab === 'upload' ? 'subir archivos' : 'agregar canciones'}. Contacta al administrador.</p>
              </div>
            </div>
          )}

          {tab === 'url' && !noPerm && (
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-spotify-light-gray mb-1.5">URL</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    {isYouTube && <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />}
                    {isSpotify && <Music className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-spotify-green" />}
                    {!isYouTube && !isSpotify && <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-spotify-light-gray" />}
                    <input type="url" value={url} onChange={e => setUrl(e.target.value)} onBlur={handleUrlBlur}
                      placeholder="https://youtube.com/watch?v=... o https://open.spotify.com/track/..."
                      className="w-full pl-10 pr-3 py-2.5 bg-spotify-gray text-white rounded-lg border border-white/10 focus:border-spotify-green focus:outline-none text-sm placeholder-spotify-light-gray/40" />
                  </div>
                  {(isYouTube || isSpotify) && (
                    <button type="button" onClick={isSpotify ? fetchSpotifyInfo : fetchYouTubeInfo}
                      disabled={fetchingInfo}
                      className="px-3 py-2.5 bg-spotify-gray rounded-lg border border-white/10 hover:border-white/20 text-spotify-light-gray hover:text-white transition-colors">
                      {fetchingInfo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                {isSpotify && (
                  <p className="text-xs text-spotify-green mt-1">
                    ✓ Spotify — se abrirá el reproductor oficial de Spotify integrado
                  </p>
                )}
                {!isYouTube && !isSpotify && (
                  <p className="text-xs text-spotify-light-gray mt-1">YouTube, Spotify, SoundCloud, Twitch, y más</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-spotify-light-gray mb-1.5">Título *</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Nombre de la canción"
                  className="w-full px-3 py-2.5 bg-spotify-gray text-white rounded-lg border border-white/10 focus:border-spotify-green focus:outline-none text-sm placeholder-spotify-light-gray/40" />
              </div>
              <div>
                <label className="block text-sm text-spotify-light-gray mb-1.5">Artista (opcional)</label>
                <input type="text" value={artist} onChange={e => setArtist(e.target.value)} placeholder="Nombre del artista"
                  className="w-full px-3 py-2.5 bg-spotify-gray text-white rounded-lg border border-white/10 focus:border-spotify-green focus:outline-none text-sm placeholder-spotify-light-gray/40" />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button type="submit" disabled={loading}
                className="w-full py-3 bg-spotify-green text-black font-bold rounded-full hover:bg-spotify-green/90 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Agregar'}
              </button>
            </form>
          )}

          {tab === 'upload' && !noPerm && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-spotify-light-gray mb-1.5">Título (opcional)</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Se auto-detecta del nombre del archivo"
                  className="w-full px-3 py-2.5 bg-spotify-gray text-white rounded-lg border border-white/10 focus:border-spotify-green focus:outline-none text-sm placeholder-spotify-light-gray/40" />
              </div>
              <div>
                <label className="block text-sm text-spotify-light-gray mb-1.5">Artista (opcional)</label>
                <input type="text" value={artist} onChange={e => setArtist(e.target.value)} placeholder="Nombre del artista"
                  className="w-full px-3 py-2.5 bg-spotify-gray text-white rounded-lg border border-white/10 focus:border-spotify-green focus:outline-none text-sm placeholder-spotify-light-gray/40" />
              </div>
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragOver ? 'border-spotify-green bg-spotify-green/5' : 'border-white/20 hover:border-white/40'}`}>
                {loading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-spotify-green animate-spin" />
                    <p className="text-sm text-spotify-light-gray">Subiendo archivo...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex gap-3">
                      <Music className="w-8 h-8 text-spotify-light-gray" />
                      <FileVideo className="w-8 h-8 text-spotify-light-gray" />
                    </div>
                    <p className="text-white font-medium">Arrastra tu archivo aquí</p>
                    <p className="text-spotify-light-gray text-sm">o haz clic para seleccionar</p>
                    <p className="text-spotify-light-gray/60 text-xs">MP3, WAV, FLAC, OGG, MP4, AVI · Máx 100MB</p>
                  </div>
                )}
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <input ref={fileRef} type="file" accept="audio/*,video/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${active ? 'bg-white text-black' : 'bg-spotify-gray text-spotify-light-gray hover:text-white hover:bg-white/10'}`}>
      {icon} {label}
    </button>
  )
}
