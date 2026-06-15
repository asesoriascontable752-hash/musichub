'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Link2, Upload, Youtube, Music, FileVideo, Loader2, Search, Lock, FolderOpen, CheckCircle2 } from 'lucide-react'
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
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; name: string } | null>(null)
  const [uploadDone, setUploadDone] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const folderRef = useRef<HTMLInputElement>(null)

  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be')
  const isSpotify = url.includes('spotify.com')

  useEffect(() => {
    fetch('/api/permissions/me').then(r => r.json()).then(d => setPerms(d.permissions ?? null))
  }, [])

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

  async function uploadSingleFile(file: File): Promise<Song | null> {
    const formData = new FormData()
    formData.append('file', file)

    const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
    const uploadData = await uploadRes.json()
    if (!uploadRes.ok) return null

    const songName = file.name.replace(/\.[^.]+$/, '')
    const res = await fetch('/api/songs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: songName,
        sourceType: 'local',
        filePath: uploadData.url,
      }),
    })

    if (!res.ok) return null
    const data = await res.json()
    return data.song ?? null
  }

  async function handleFiles(fileList: FileList) {
    const AUDIO_EXT = /\.(mp3|wav|flac|ogg|opus|m4a|aac|wma|aiff|aif|alac|ape|wv|mid|midi|mp4|avi|mkv|mov|webm|m4v|3gp|ts)$/i
    const files = Array.from(fileList).filter(f =>
      /^(audio|video)\//.test(f.type) || AUDIO_EXT.test(f.name)
    )
    if (!files.length) { setError('No se encontraron archivos de audio o video'); return }

    setError('')
    setLoading(true)
    setUploadDone(0)
    setUploadProgress({ current: 0, total: files.length, name: '' })

    const CONCURRENCY = 3
    let completed = 0

    async function uploadOne(file: File) {
      const song = await uploadSingleFile(file)
      completed++
      setUploadProgress({ current: completed, total: files.length, name: file.name })
      if (song) {
        window.dispatchEvent(new CustomEvent('song-added', { detail: song }))
        onAdded(song)
        setUploadDone(c => c + 1)
      }
    }

    for (let i = 0; i < files.length; i += CONCURRENCY) {
      await Promise.all(files.slice(i, i + CONCURRENCY).map(uploadOne))
    }

    setLoading(false)
    setUploadProgress(null)
    onClose()
  }

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
                {isSpotify && <p className="text-xs text-spotify-green mt-1">✓ Spotify — se abrirá el reproductor oficial de Spotify integrado</p>}
                {!isYouTube && !isSpotify && <p className="text-xs text-spotify-light-gray mt-1">YouTube, Spotify, SoundCloud, Twitch, y más</p>}
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
              {/* Drop zone */}
              <div
                onClick={() => !loading && fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => {
                  e.preventDefault(); setDragOver(false)
                  if (!loading && e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
                }}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragOver ? 'border-spotify-green bg-spotify-green/5' : 'border-white/20 hover:border-white/40'} ${loading ? 'pointer-events-none' : ''}`}>

                {loading && uploadProgress ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-spotify-green animate-spin" />
                    <p className="text-white font-medium text-sm">
                      Completadas {uploadProgress.current} de {uploadProgress.total}
                    </p>
                    <p className="text-spotify-light-gray text-xs truncate max-w-[240px]">
                      {uploadProgress.current < uploadProgress.total ? `Subiendo en paralelo…` : 'Finalizando…'}
                    </p>
                    {/* Progress bar */}
                    <div className="w-full bg-white/10 rounded-full h-1.5 mt-1">
                      <div
                        className="bg-spotify-green h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                      />
                    </div>
                    {uploadDone > 0 && (
                      <p className="text-spotify-green text-xs flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {uploadDone} {uploadDone === 1 ? 'canción agregada' : 'canciones agregadas'}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex gap-3">
                      <Music className="w-8 h-8 text-spotify-light-gray" />
                      <FileVideo className="w-8 h-8 text-spotify-light-gray" />
                    </div>
                    <p className="text-white font-medium">Arrastra archivos aquí</p>
                    <p className="text-spotify-light-gray text-sm">o elige una opción abajo</p>
                    <p className="text-spotify-light-gray/60 text-xs">MP3, WAV, FLAC, OGG, MP4 · Máx 100MB por archivo</p>
                  </div>
                )}
              </div>

              {/* Buttons */}
              {!loading && (
                <div className="flex gap-3">
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white hover:bg-white/10 transition-colors">
                    <Upload className="w-4 h-4 text-spotify-green" />
                    Seleccionar archivos
                  </button>
                  <button
                    onClick={() => folderRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white hover:bg-white/10 transition-colors">
                    <FolderOpen className="w-4 h-4 text-spotify-green" />
                    Seleccionar carpeta
                  </button>
                </div>
              )}

              {error && <p className="text-red-400 text-sm">{error}</p>}

              {/* Hidden inputs */}
              <input
                ref={fileRef}
                type="file"
                accept="audio/*,video/*"
                multiple
                className="hidden"
                onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = '' }}
              />
              <input
                ref={folderRef}
                type="file"
                // @ts-ignore — non-standard but widely supported
                webkitdirectory=""
                multiple
                className="hidden"
                onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = '' }}
              />
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
