import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

function extractSpotifyInfo(url: string): { type: string; id: string } | null {
  const m = url.match(/spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/)
  return m ? { type: m[1], id: m[2] } : null
}

async function fetchOEmbed(url: string) {
  try {
    const res = await fetch(
      `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(7000) }
    )
    const data = await res.json()
    return {
      title: data.title || '',
      artist: data.author_name || '',
      coverUrl: data.thumbnail_url || null,
    }
  } catch {}
  return null
}

async function getSpotifyToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret) return null
  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(6000),
    })
    const data = await res.json()
    return data.access_token || null
  } catch { return null }
}

async function getTrackData(trackId: string, token: string) {
  try {
    const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(6000),
    })
    const data = await res.json()
    return {
      title: data.name || '',
      artist: data.artists?.map((a: any) => a.name).join(', ') || '',
      coverUrl: data.album?.images?.[0]?.url || null,
      previewUrl: data.preview_url || null,
    }
  } catch { return null }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'URL requerida' }, { status: 400 })

  const info = extractSpotifyInfo(url)
  if (!info) return NextResponse.json({ error: 'URL de Spotify inválida' }, { status: 400 })

  // Try Spotify API first (needs SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET)
  if (info.type === 'track') {
    const token = await getSpotifyToken()
    if (token) {
      const track = await getTrackData(info.id, token)
      if (track) {
        return NextResponse.json({
          title: track.title,
          artist: track.artist,
          coverUrl: track.coverUrl,
          previewUrl: track.previewUrl,
          type: info.type,
          id: info.id,
        })
      }
    }
  }

  // Fallback: oEmbed (no credentials needed)
  const oembed = await fetchOEmbed(url)
  return NextResponse.json({
    title: oembed?.title || '',
    artist: oembed?.artist || '',
    coverUrl: oembed?.coverUrl || null,
    previewUrl: null,
    type: info.type,
    id: info.id,
  })
}
