'use client'

import React, { createContext, useContext, useReducer, useCallback } from 'react'
import { Song, PlayerState, PlayerAction } from '@/types'

const initialState: PlayerState = {
  currentSong: null,
  queue: [],
  isPlaying: false,
  volume: 0.8,
  currentTime: 0,
  duration: 0,
  isShuffled: false,
  repeatMode: 'none',
  showLyrics: false,
}

function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'SET_SONG':
      return { ...state, currentSong: action.payload, isPlaying: true, currentTime: 0 }
    case 'SET_QUEUE':
      return { ...state, queue: action.payload }
    case 'TOGGLE_PLAY':
      return { ...state, isPlaying: !state.isPlaying }
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload }
    case 'SET_VOLUME':
      return { ...state, volume: action.payload }
    case 'SET_TIME':
      return { ...state, currentTime: action.payload }
    case 'SET_DURATION':
      return { ...state, duration: action.payload }
    case 'TOGGLE_SHUFFLE':
      return { ...state, isShuffled: !state.isShuffled }
    case 'TOGGLE_REPEAT':
      const next = state.repeatMode === 'none' ? 'all' : state.repeatMode === 'all' ? 'one' : 'none'
      return { ...state, repeatMode: next }
    case 'NEXT_SONG': {
      if (state.queue.length === 0) return state
      const idx = state.queue.findIndex(s => s.id === state.currentSong?.id)
      const nextIdx = state.isShuffled
        ? Math.floor(Math.random() * state.queue.length)
        : (idx + 1) % state.queue.length
      return { ...state, currentSong: state.queue[nextIdx], isPlaying: true, currentTime: 0 }
    }
    case 'PREV_SONG': {
      if (state.queue.length === 0) return state
      const idx = state.queue.findIndex(s => s.id === state.currentSong?.id)
      const prevIdx = idx <= 0 ? state.queue.length - 1 : idx - 1
      return { ...state, currentSong: state.queue[prevIdx], isPlaying: true, currentTime: 0 }
    }
    case 'TOGGLE_LYRICS':
      return { ...state, showLyrics: !state.showLyrics }
    default:
      return state
  }
}

interface PlayerContextType {
  state: PlayerState
  dispatch: React.Dispatch<PlayerAction>
  playSong: (song: Song, queue?: Song[]) => void
}

const PlayerContext = createContext<PlayerContextType | null>(null)

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(playerReducer, initialState)

  const playSong = useCallback((song: Song, queue?: Song[]) => {
    if (queue) dispatch({ type: 'SET_QUEUE', payload: queue })
    dispatch({ type: 'SET_SONG', payload: song })
  }, [])

  return (
    <PlayerContext.Provider value={{ state, dispatch, playSong }}>
      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider')
  return ctx
}
