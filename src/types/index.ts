export interface Song {
  id: string
  title: string
  artist?: string | null
  album?: string | null
  duration?: number | null
  coverUrl?: string | null
  sourceType: 'youtube' | 'local' | 'url'
  sourceUrl?: string | null
  filePath?: string | null
  lyrics?: string | null
  createdAt: string
  userId: string
}

export interface Playlist {
  id: string
  name: string
  description?: string | null
  coverUrl?: string | null
  songs?: PlaylistSong[]
  createdAt: string
  userId: string
}

export interface PlaylistSong {
  id: string
  order: number
  song: Song
}

export interface PlayerState {
  currentSong: Song | null
  queue: Song[]
  isPlaying: boolean
  volume: number
  currentTime: number
  duration: number
  isShuffled: boolean
  repeatMode: 'none' | 'one' | 'all'
  showLyrics: boolean
}

export type PlayerAction =
  | { type: 'SET_SONG'; payload: Song }
  | { type: 'SET_QUEUE'; payload: Song[] }
  | { type: 'TOGGLE_PLAY' }
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'SET_TIME'; payload: number }
  | { type: 'SET_DURATION'; payload: number }
  | { type: 'TOGGLE_SHUFFLE' }
  | { type: 'TOGGLE_REPEAT' }
  | { type: 'NEXT_SONG' }
  | { type: 'PREV_SONG' }
  | { type: 'TOGGLE_LYRICS' }
