'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, Square, Play, Pause, Trash2, Save, Loader2, ChevronDown, ChevronUp, Music, Globe, Lock } from 'lucide-react'
import { Song } from '@/types'

interface VoiceRecorderProps {
  onSaved: () => void
  currentSong?: Song | null
}

type State = 'idle' | 'recording' | 'stopped' | 'saving'

const WAVE_HEIGHTS = [40, 65, 90, 55, 80, 45, 85, 60, 75, 50, 70, 40]

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  return `${m}:${(s % 60).toString().padStart(2, '0')}`
}

function getBestMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  return (
    ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
      .find(t => MediaRecorder.isTypeSupported(t)) ?? ''
  )
}

export default function VoiceRecorder({ onSaved, currentSong }: VoiceRecorderProps) {
  const [recState, setRecState] = useState<State>('idle')
  const [seconds, setSeconds] = useState(0)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [lyricsExpanded, setLyricsExpanded] = useState(true)
  const [isPublicRec, setIsPublicRec] = useState(false)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const blobRef = useRef<Blob | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const hasLyrics = !!(currentSong?.lyrics)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [audioUrl])

  async function startRecording() {
    setError('')
    if (typeof MediaRecorder === 'undefined') {
      setError('Tu navegador no soporta grabación de audio.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = getBestMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      recorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        blobRef.current = blob
        setAudioUrl(URL.createObjectURL(blob))
        setRecState('stopped')
        stream.getTracks().forEach(t => t.stop())
      }

      recorder.start(100)
      setRecState('recording')
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
    } catch (err: any) {
      setError(
        err.name === 'NotAllowedError'
          ? 'Permiso de micrófono denegado. Actívalo en la configuración del navegador.'
          : 'No se pudo acceder al micrófono: ' + err.message
      )
    }
  }

  function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    recorderRef.current?.stop()
  }

  function togglePlay() {
    if (!audioRef.current) return
    if (playing) { audioRef.current.pause(); setPlaying(false) }
    else { audioRef.current.play(); setPlaying(true) }
  }

  function discard() {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
    blobRef.current = null
    setSeconds(0)
    setRecState('idle')
    setPlaying(false)
    setError('')
  }

  async function save() {
    if (!blobRef.current) return
    if (!name.trim()) { setError('Escribe un nombre para la grabación'); return }
    setRecState('saving')
    setError('')

    try {
      const labelsRes = await fetch('/api/labels')
      const labelsData = await labelsRes.json()
      let label = (labelsData.labels as any[])?.find(l => l.name === 'Grabaciones')

      if (!label) {
        const cr = await fetch('/api/labels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Grabaciones', color: '#ef4444', icon: 'mic' }),
        })
        label = (await cr.json()).label
      }

      const mime = blobRef.current.type
      const ext = mime.includes('mp4') ? '.m4a' : mime.includes('ogg') ? '.ogg' : '.webm'
      const fileName = `${name.trim().replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ _-]/g, '_')}${ext}`
      const file = new File([blobRef.current], fileName, { type: mime })

      let fileUrl: string | null = null

      const signRes = await fetch('/api/upload/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, contentType: mime }),
      })
      if (signRes.ok) {
        const { signedUrl, publicUrl } = await signRes.json()
        const put = await fetch(signedUrl, { method: 'PUT', headers: { 'Content-Type': mime }, body: file })
        if (put.ok) fileUrl = publicUrl
      }

      if (!fileUrl) {
        const fd = new FormData()
        fd.append('file', file)
        const up = await fetch('/api/upload', { method: 'POST', body: fd })
        if (!up.ok) {
          const d = await up.json().catch(() => ({}))
          throw new Error(d.error || 'Error al subir audio')
        }
        fileUrl = (await up.json()).url
      }

      const songRes = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: name.trim(), sourceType: 'local', filePath: fileUrl, isPublic: isPublicRec }),
      })
      if (!songRes.ok) {
        const d = await songRes.json().catch(() => ({}))
        throw new Error(d.error || 'Error al guardar')
      }
      const song = (await songRes.json()).song

      if (label) {
        await fetch(`/api/labels/${label.id}/songs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ songId: song.id }),
        })
      }

      window.dispatchEvent(new CustomEvent('song-added', { detail: song }))
      window.dispatchEvent(new CustomEvent('label-changed'))
      onSaved()
    } catch (err: any) {
      setError(err.message || 'Error desconocido')
      setRecState('stopped')
    }
  }

  const recorderPanel = (
    <div className="space-y-4">

      {/* ── Nombre + privacidad — siempre visible ── */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-spotify-light-gray uppercase tracking-wider mb-1.5">
            Nombre de la grabación
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && recState === 'stopped' && save()}
            placeholder="Ej: Idea melodía, Verso coro..."
            disabled={recState === 'saving'}
            className="w-full px-3 py-2.5 bg-spotify-gray text-white rounded-lg border border-white/10 focus:border-spotify-green focus:outline-none text-sm placeholder-spotify-light-gray/40 disabled:opacity-50"
          />
        </div>

        {/* Privacidad toggle — siempre visible */}
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
          <div>
            <p className="text-sm font-medium text-white">Privacidad</p>
            <p className="text-xs text-white/40 mt-0.5">
              {isPublicRec ? 'Visible para todos los usuarios' : 'Solo tú puedes verla'}
            </p>
          </div>
          <button
            onClick={() => setIsPublicRec(v => !v)}
            disabled={recState === 'saving'}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 ${
              isPublicRec
                ? 'bg-spotify-green/20 text-spotify-green border border-spotify-green/40'
                : 'bg-white/10 text-white/60 border border-white/15'
            }`}
          >
            {isPublicRec ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            {isPublicRec ? 'Pública' : 'Privada'}
          </button>
        </div>
      </div>

      <div className="h-px bg-white/10" />

      {/* ── Controles de grabación ── */}
      <div className="flex flex-col items-center gap-3 py-2">
        {/* Timer */}
        <span className={`text-4xl font-mono font-bold tabular-nums ${recState === 'recording' ? 'text-red-400' : 'text-white/60'}`}>
          {formatTime(seconds)}
        </span>

        {/* Waveform */}
        {recState === 'recording' && (
          <div className="flex items-end justify-center gap-1 h-10">
            {WAVE_HEIGHTS.map((h, i) => (
              <div
                key={i}
                className="w-1.5 bg-red-400 rounded-full origin-bottom"
                style={{
                  height: `${h}%`,
                  animation: 'waveBar 0.7s ease-in-out infinite',
                  animationDelay: `${i * 0.06}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Botón grabar / parar */}
        {recState === 'idle' && (
          <button
            onClick={startRecording}
            className="w-20 h-20 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30 active:scale-95 transition-all"
          >
            <Mic className="w-8 h-8 text-white" />
          </button>
        )}

        {recState === 'recording' && (
          <button
            onClick={stopRecording}
            className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all"
          >
            <Square className="w-8 h-8 text-red-500 fill-current" />
          </button>
        )}

        <p className={`text-sm text-center ${recState === 'recording' ? 'text-red-400 animate-pulse' : 'text-spotify-light-gray'}`}>
          {recState === 'idle' && 'Toca el micrófono para comenzar'}
          {recState === 'recording' && 'Grabando · toca el cuadrado para detener'}
        </p>
      </div>

      {/* ── Preview + guardar (después de parar) ── */}
      {(recState === 'stopped' || recState === 'saving') && audioUrl && (
        <div className="space-y-3 border-t border-white/10 pt-4">
          {/* Player de preview */}
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
            <button
              onClick={togglePlay}
              className="w-10 h-10 bg-spotify-green rounded-full flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
            >
              {playing
                ? <Pause className="w-5 h-5 text-black fill-current" />
                : <Play className="w-5 h-5 text-black fill-current ml-0.5" />}
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-medium truncate">{name || 'Sin nombre'}</p>
              <p className="text-spotify-light-gray text-xs">{formatTime(seconds)} · Grabaciones</p>
            </div>
            <audio ref={audioRef} src={audioUrl} onEnded={() => setPlaying(false)} className="hidden" />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={discard}
              disabled={recState === 'saving'}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-spotify-light-gray hover:text-white transition-colors disabled:opacity-40"
            >
              <Trash2 className="w-4 h-4" />
              Grabar otra vez
            </button>
            <button
              onClick={save}
              disabled={recState === 'saving' || !name.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-spotify-green text-black font-bold rounded-xl text-sm active:scale-95 transition-all disabled:opacity-50"
            >
              {recState === 'saving'
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                : <><Save className="w-4 h-4" /> Guardar</>}
            </button>
          </div>
        </div>
      )}

      {error && recState === 'idle' && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  )

  if (!hasLyrics) return recorderPanel

  return (
    <div className="flex flex-col md:flex-row gap-0 md:gap-6">
      {/* Panel de letra */}
      <div className="flex-1 min-w-0 border-b md:border-b-0 md:border-r border-white/10 pb-4 md:pb-0 md:pr-6 mb-4 md:mb-0">
        <button
          onClick={() => setLyricsExpanded(v => !v)}
          className="w-full flex items-center justify-between mb-3 group"
        >
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-spotify-green" />
            <div className="text-left">
              <p className="text-white text-sm font-medium truncate max-w-[200px]">{currentSong!.title}</p>
              {currentSong!.artist && <p className="text-spotify-light-gray text-xs">{currentSong!.artist}</p>}
            </div>
          </div>
          <span className="text-white/40 group-hover:text-white transition-colors flex-shrink-0 ml-2">
            {lyricsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>

        {lyricsExpanded && (
          <div className="h-56 md:h-[22rem] overflow-y-auto bg-white/5 rounded-xl p-4">
            <pre className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap font-sans">
              {currentSong!.lyrics}
            </pre>
          </div>
        )}
        {!lyricsExpanded && (
          <p className="text-xs text-white/30 italic">Toca para ver la letra</p>
        )}
      </div>

      {/* Controles del grabador */}
      <div className="md:w-64 flex-shrink-0">
        {recorderPanel}
      </div>
    </div>
  )
}
