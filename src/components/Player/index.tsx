'use client'

import { useRef, useCallback, useState } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Shuffle, Repeat, Repeat1, Heart, ListMusic
} from 'lucide-react'
import { usePlayer } from '@/contexts/PlayerContext'

const ReactPlayer = dynamic(() => import('react-player/lazy'), { ssr: false })

function formatTime(secs: number) {
  if (!secs || isNaN(secs)) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function Player() {
  const { state, dispatch } = usePlayer()
  const { currentSong, isPlaying, volume, currentTime, duration, isShuffled, repeatMode } = state
  const playerRef = useRef<any>(null)
  const [liked, setLiked] = useState(false)
  const [muted, setMuted] = useState(false)

  const getPlayerUrl = useCallback(() => {
    if (!currentSong) return ''
    if (currentSong.sourceType === 'youtube') return currentSong.sourceUrl || ''
    if (currentSong.sourceType === 'local') return currentSong.filePath || ''
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
      <div className="h-24 bg-spotify-dark border-t border-white/5 flex items-center justify-center">
        <p className="text-spotify-light-gray text-sm">Selecciona una canción para reproducir</p>
      </div>
    )
  }

  const playerUrl = getPlayerUrl()

  return (
    <div className="h-24 bg-[#181818] border-t border-white/5 px-4 flex items-center gap-4 relative z-50">
      {/* Hidden audio/video player */}
      {playerUrl && (
        <div className="absolute opacity-0 pointer-events-none w-0 h-0 overflow-hidden">
          <ReactPlayer
            key={currentSong.id}
            ref={playerRef}
            url={playerUrl}
            playing={isPlaying}
            volume={muted ? 0 : volume}
            onProgress={handleProgress}
            onDuration={handleDuration}
            onEnded={handleEnded}
            progressInterval={500}
            config={{ youtube: { playerVars: { modestbranding: 1, rel: 0 } } }}
          />
        </div>
      )}

      {/* Left: Song info */}
      <div className="flex items-center gap-3 w-[30%] min-w-0">
        <div className="relative w-14 h-14 rounded-md overflow-hidden flex-shrink-0 bg-spotify-gray">
          {currentSong.coverUrl ? (
            <Image src={currentSong.coverUrl} alt={currentSong.title} fill
              className={`object-cover ${isPlaying ? 'vinyl-spinning' : ''}`} />
          ) : (
            <div className={`w-full h-full flex items-center justify-center bg-spotify-gray ${isPlaying ? 'vinyl-spinning' : ''}`}>
              <ListMusic className="w-6 h-6 text-spotify-light-gray" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-medium truncate">{currentSong.title}</p>
          <p className="text-spotify-light-gray text-xs truncate">{currentSong.artist || 'Desconocido'}</p>
        </div>
        <button onClick={() => setLiked(l => !l)}
          className={`ml-2 flex-shrink-0 transition-colors ${liked ? 'text-spotify-green' : 'text-spotify-light-gray hover:text-white'}`}>
          <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
        </button>
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
          <button onClick={() => dispatch({ type: 'TOGGLE_PLAY' })}
            className="w-9 h-9 bg-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform">
            {isPlaying
              ? <Pause className="w-5 h-5 text-black fill-current" />
              : <Play className="w-5 h-5 text-black fill-current ml-0.5" />}
          </button>
          <button onClick={() => dispatch({ type: 'NEXT_SONG' })}
            className="text-spotify-light-gray hover:text-white transition-colors">
            <SkipForward className="w-5 h-5 fill-current" />
          </button>
          <button onClick={() => dispatch({ type: 'TOGGLE_REPEAT' })}
            className={`transition-colors ${repeatMode !== 'none' ? 'text-spotify-green' : 'text-spotify-light-gray hover:text-white'}`}>
            {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full flex items-center gap-2 group">
          <span className="text-xs text-spotify-light-gray w-8 text-right">{formatTime(currentTime)}</span>
          <input type="range" min={0} max={duration || 100} value={currentTime}
            onChange={handleSeek} step={0.1} className="flex-1 accent-spotify-green"
            style={{ background: `linear-gradient(to right, #1DB954 ${(currentTime / (duration || 1)) * 100}%, #535353 0%)` }} />
          <span className="text-xs text-spotify-light-gray w-8">{formatTime(duration)}</span>
        </div>
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
  )
}
