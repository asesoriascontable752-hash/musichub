'use client'

import { useState } from 'react'
import { Search, Music } from 'lucide-react'
import { Song } from '@/types'
import SongCard from '@/components/Library/SongCard'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Song[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)

    const res = await fetch('/api/songs')
    if (res.ok) {
      const data = await res.json()
      const q = query.toLowerCase()
      setResults(data.songs.filter((s: Song) =>
        s.title.toLowerCase().includes(q) ||
        s.artist?.toLowerCase().includes(q) ||
        s.album?.toLowerCase().includes(q)
      ))
    }
    setLoading(false)
  }

  return (
    <div className="h-full overflow-y-auto">
    <div className="space-y-6 pb-4">
      <h1 className="text-2xl font-bold text-white">Buscar</h1>

      <form onSubmit={handleSearch} className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-spotify-light-gray" />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar canciones, artistas..."
          className="w-full pl-12 pr-4 py-3.5 bg-white/10 text-white rounded-full border border-white/10 focus:border-spotify-green focus:outline-none focus:ring-1 focus:ring-spotify-green placeholder-spotify-light-gray/60 text-sm"
          autoFocus
        />
      </form>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-spotify-green border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center gap-3">
          <Music className="w-14 h-14 text-spotify-light-gray/30" />
          <p className="text-white font-semibold">Sin resultados para "{query}"</p>
          <p className="text-spotify-light-gray text-sm">Intenta con otro término de búsqueda</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-1">
          <p className="text-spotify-light-gray text-sm mb-3">{results.length} resultado{results.length !== 1 ? 's' : ''}</p>
          {results.map(song => (
            <SongCard key={song.id} song={song} songs={results} onDelete={(id) => setResults(prev => prev.filter(s => s.id !== id))} />
          ))}
        </div>
      )}

      {!searched && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
          {['Pop', 'Rock', 'Hip-Hop', 'Electronic', 'Clásica', 'Jazz'].map(genre => (
            <div key={genre} className="bg-spotify-dark rounded-xl p-4 h-24 flex items-end cursor-pointer hover:brightness-110 transition-all"
              style={{ background: `linear-gradient(135deg, ${getGenreColor(genre)}, ${getGenreColor(genre)}88)` }}>
              <span className="text-white font-bold">{genre}</span>
            </div>
          ))}
        </div>
      )}
    </div>
    </div>
  )
}

function getGenreColor(genre: string) {
  const colors: Record<string, string> = {
    Pop: '#E8115B', Rock: '#509BF5', 'Hip-Hop': '#BC5900',
    Electronic: '#503750', Clásica: '#27856A', Jazz: '#E13300',
  }
  return colors[genre] || '#333'
}
