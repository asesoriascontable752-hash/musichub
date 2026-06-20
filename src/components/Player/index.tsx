'use client'

import { useRef, useCallback, useState } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Shuffle, Repeat, Repeat1, ListMusic
} from 'lucide-react'
import { usePlayer } from '@/contexts/PlayerContext'

const ReactPlayer = dynamic(() => import('react-player/lazy'), { ssr: false })

function formatTime(secs: number) {
  if (!secs || isNaN(secs)) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function getSpotifyEmbedUrl(sourceUrl: string): string | null {
  const m = sourceUrl.match(/spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/)
  if (!m) return null
  return `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator&theme=0`
}

export default function Player() {
  const { state, dispatch } = usePlayer()
  const { currentSong, isPlaying, volume, currentTime, duration, isShuffled, repeatMode } = state
  const playerRef = useRef<any>(null)
  const [muted, setMuted] = useState(false)

  const isSpotify = currentSong?.sourceType === 'spotify'
  const spotifyEmbed = isSpotify && currentSong?.sourceUrl ? getSpotifyEmbedUrl(currentSong.sourceUrl) : null

  const getPlayerUrl = useCallback(() => {
    if (!currentSong) return ''
    if (currentSong.sourceType === 'youtube') return currentSong.sourceUrl || ''
    if (currentSong.sourceType === 'local') return currentSong.filePath || ''
    if (currentSong.sourceType === 'spotify') return ''
    return currentSong.sourceUrl || currentSong.filePath || ''
  }, [currentSong])

  const handleProgress = useCallback(({ playedSeconds }: { playedSeconds: number }) => {
    dispatch({ type: 'SET_TIME', payload: playedSeconds })
  }, [dispatch])

  const handleDuration = useCallback((d: number) => {
    dispatch({ type: 'SET_DURATION', payload: d })
  }, [dispatch])

  const handleEnded = useCallback(() => {
    if (repeatMode === 'one') {
      playerRef.current?.seekTo(0)
      dispatch({ type: 'SET_PLAYING', payload: true })
    } else {
      dispatch({ type: 'NEXT_SONG' })
    }
  }, [repeatMode, dispatch])

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    dispatch({ type: 'SET_TIME', payload: val })
    playerRef.current?.seekTo(val, 'seconds')
  }, [dispatch])

  const handleVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    dispatch({ type: 'SET_VOLUME', payload: val })
    if (val > 0) setMuted(false)
  }, [dispatch])

  if (!currentSong) {
    return (
      <div className="h-16 md:h-24 bg-spotify-dark border-t border-white/5 flex items-center justify-center">
        <p className="text-spotify-light-gray text-xs md:text-sm">Selecciona una canción para reproducir</p>
      </div>
    )
  }

  const playerUrl = getPlayerUrl()
  const progress = duration ? (currentTime / duration) * 100 : 0

  return (
    <>
      {/* Spotify embed */}
      {spotifyEmbed && (
        <div className="bg-[#121212] border-t border-white/5 px-4 py-2">
          <iframe
            src={spotifyEmbed}
            width="100%"
            height="80"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-lg"
            style={{ border: 'none' }}
          />
        </div>
      )}

      <div className="bg-[#181818] border-t border-white/5 px-3 md:px-4 relative z-50">
        {/* Hidden ReactPlayer — off-screen but with real size so YouTube iframe works on mobile */}
        {playerUrl && !isSpotify && (
          <div
            className="fixed opacity-0 pointer-events-none overflow-hidden"
            style={{ left: '-9999px', top: '-9999px', width: '1px', height: '1px' }}
          >
            <ReactPlayer
              key={currentSong.id}
              ref={playerRef}
              url={playerUrl}
              playing={isPlaying}
              volume={muted ? 0 : volume}
              width="1px"
              height="1px"
              onProgress={handleProgress}
              onDuration={handleDuration}
              onEnded={handleEnded}
              progressInterval={500}
              config={{
                youtube: {
                  playerVars: { modestbranding: 1, rel: 0, playsinline: 1 },
                },
              }}
            />
          </div>
        )}

        {/* ── Mobile layout ── */}
        <div className="flex md:hidden flex-col pt-2 pb-3 gap-2">
          {/* Row 1: Cover + info + controls */}
          <div className="flex items-center gap-3">
            {/* Cover */}
            <div className="relative w-11 h-11 rounded-md overflow-hidden flex-shrink-0 bg-spotify-gray">
              {currentSong.coverUrl ? (
                <Image src={currentSong.coverUrl} alt={currentSong.title} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ListMusic className="w-5 h-5 text-spotify-light-gray" />
                </div>
              )}
            </div>

            {/* Title */}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{currentSong.title}</p>
              <p className="text-spotify-light-gray text-xs truncate">{currentSong.artist || 'Desconocido'}</p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                onClick={() => dispatch({ type: 'PREV_SONG' })}
                className="text-spotify-light-gray active:text-white transition-colors p-2"
              >
                <SkipBack className="w-5 h-5 fill-current" />
              </button>

              {!isSpotify && (
                <button
                  onClick={() => dispatch({ type: 'TOGGLE_PLAY' })}
                  className="w-10 h-10 bg-white rounded-full flex items-center justify-center active:scale-95 transition-transform mx-1"
                >
                  {isPlaying
                    ? <Pause className="w-5 h-5 text-black fill-current" />
                    : <Play className="w-5 h-5 text-black fill-current ml-0.5" />}
                </button>
              )}

              <button
                onClick={() => dispatch({ type: 'NEXT_SONG' })}
                className="text-spotify-light-gray active:text-white transition-colors p-2"
              >
                <SkipForward className="w-5 h-5 fill-current" />
              </button>
            </div>
          </div>

          {/* Row 2: Seek bar + times */}
          {!isSpotify && (
            <div className="flex items-center gap-2 px-1">
              <span className="text-[10px] text-spotify-light-gray w-7 text-right flex-shrink-0">{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                step={0.1}
                className="flex-1 h-1 accent-spotify-green"
                style={{ background: `linear-gradient(to right, #1DB954 ${progress}%, #535353 0%)` }}
              />
              <span className="text-[10px] text-spotify-light-gray w-7 flex-shrink-0">{formatTime(duration)}</span>
            </div>
          )}
        </div>

        {/* ── Desktop layout ── */}
        <div className="hidden md:flex h-24 items-center gap-4">
          {/* Left: Song info */}
          <div className="flex items-center gap-3 w-[30%] min-w-0">
            <div className="relative w-14 h-14 rounded-md overflow-hidden flex-shrink-0 bg-spotify-gray">
              {currentSong.coverUrl ? (
                <Image src={currentSong.coverUrl} alt={currentSong.title} fill
                  className={`object-cover ${isPlaying && !isSpotify ? 'vinyl-spinning' : ''}`} />
              ) : (
                <div className={`w-full h-full flex items-center justify-center bg-spotify-gray ${isPlaying && !isSpotify ? 'vinyl-spinning' : ''}`}>
                  <ListMusic className="w-6 h-6 text-spotify-light-gray" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{currentSong.title}</p>
              <p className="text-spotify-light-gray text-xs truncate">{currentSong.artist || 'Desconocido'}</p>
              {isSpotify && <p className="text-[10px] text-spotify-green">▶ Reproductor de Spotify</p>}
            </div>
          </div>

          {/* Center: Controls */}
          <div className="flex-1 flex flex-col items-center gap-1 max-w-[40%]">
            <div className="flex items-center gap-4">
              <button onClick={() => dispatch({ type: 'TOGGLE_SHUFFLE' })}
                className={`transition-colors ${isShuffled ? 'text-spotify-green' : 'text-spotify-light-gray hover:text-white'}`}>
                <Shuffle className="w-4 h-4" />
              </button>
              <button onClick={() => dispatch({ type: 'PREV_SONG' })}
                className="text-spotify-light-gray hover:text-white transition-colors">
                <SkipBack className="w-5 h-5 fill-current" />
              </button>

              {!isSpotify && (
                <button onClick={() => dispatch({ type: 'TOGGLE_PLAY' })}
                  className="w-9 h-9 bg-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform">
                  {isPlaying
                    ? <Pause className="w-5 h-5 text-black fill-current" />
                    : <Play className="w-5 h-5 text-black fill-current ml-0.5" />}
                </button>
              )}
              {isSpotify && (
                <div className="w-9 h-9 bg-spotify-green/20 rounded-full flex items-center justify-center border border-spotify-green/40"
                  title="Usa el reproductor de Spotify de arriba">
                  <svg className="w-4 h-4 text-spotify-green" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                </div>
              )}

              <button onClick={() => dispatch({ type: 'NEXT_SONG' })}
                className="text-spotify-light-gray hover:text-white transition-colors">
                <SkipForward className="w-5 h-5 fill-current" />
              </button>
              <button onClick={() => dispatch({ type: 'TOGGLE_REPEAT' })}
                className={`transition-colors ${repeatMode !== 'none' ? 'text-spotify-green' : 'text-spotify-light-gray hover:text-white'}`}>
                {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
              </button>
            </div>

            {!isSpotify && (
              <div className="w-full flex items-center gap-2">
                <span className="text-xs text-spotify-light-gray w-8 text-right">{formatTime(currentTime)}</span>
                <input type="range" min={0} max={duration || 100} value={currentTime}
                  onChange={handleSeek} step={0.1} className="flex-1 accent-spotify-green"
                  style={{ background: `linear-gradient(to right, #1DB954 ${(currentTime / (duration || 1)) * 100}%, #535353 0%)` }} />
                <span className="text-xs text-spotify-light-gray w-8">{formatTime(duration)}</span>
              </div>
            )}
            {isSpotify && (
              <p className="text-xs text-white/30 mt-1">Controla desde el reproductor de Spotify</p>
            )}
          </div>

          {/* Right: Volume */}
          <div className="flex items-center gap-3 w-[30%] justify-end">
            <button onClick={() => setMuted(m => !m)} className="text-spotify-light-gray hover:text-white transition-colors">
              {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <div className="w-28">
              <input type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume}
                onChange={handleVolume} className="w-full accent-spotify-green"
                style={{ background: `linear-gradient(to right, #1DB954 ${(muted ? 0 : volume) * 100}%, #535353 0%)` }} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
