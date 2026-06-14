import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSetting } from '@/lib/settings'

// In-memory token cache (Client Credentials)
let tokenCache: { token: string; expires: number } | null = null

// ── Official Spotify API (Client Credentials) ──────────────────────────────
async function getClientCredentialsToken(clientId: string, clientSecret: string): Promise<string | null> {
  if (tokenCache && tokenCache.expires > Date.now()) return tokenCache.token
  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(8000),
    })
    const data = await res.json()
    if (data.access_token) {
      tokenCache = { token: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 }
      return tokenCache.token
    }
  } catch {}
  return null
}

// ── Anonymous token (no API key needed) ───────────────────────────────────
async function getAnonymousToken(): Promise<string | null> {
  try {
    const res = await fetch(
      'https://open.spotify.com/get_access_token?reason=transport&productType=web_player',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
          Referer: 'https://open.spotify.com/',
        },
        signal: AbortSignal.timeout(6000),
      }
    )
    const data = await res.json()
    return data.accessToken || null
  } catch {}
  return null
}

// ── Get track info via API ─────────────────────────────────────────────────
async function fetchTrackInfo(trackId: string, token: string) {
  const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) return null
  const data = await res.json()
  return {
    title: data.name as string,
    artist: (data.artists as any[])?.map(a => a.name).join(', ') || '',
    album: data.album?.name as string,
    coverUrl: (data.album?.images?.[0]?.url as string) || null,
    duration: data.duration_ms ? data.duration_ms / 1000 : undefined,
  }
}

// ── oEmbed fallback ────────────────────────────────────────────────────────
async function fetchOEmbed(url: string) {
  try {
    const res = await fetch(
      `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(7000) }
    )
    const data = await res.json()
    // oEmbed title is track name only (no artist), but use as fallback
    return { title: data.title || '', coverUrl: data.thumbnail_url || null }
  } catch {}
  return null
}

function extractSpotifyInfo(url: string): { type: string; id: string } | null {
  const m = url.match(/spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/)
  return m ? { type: m[1], id: m[2] } : null
}

// ── Route ─────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'URL requerida' }, { status: 400 })

  const info = extractSpotifyInfo(url)
  if (!info) return NextResponse.json({ error: 'URL de Spotify inválida' }, { status: 400 })

  const embedUrl = `https://open.spotify.com/embed/${info.type}/${info.id}?utm_source=generator&theme=0`

  // Only tracks support metadata lookup
  if (info.type !== 'track') {
    const oembed = await fetchOEmbed(url)
    return NextResponse.json({ title: oembed?.title || '', artist: '', coverUrl: oembed?.coverUrl, embedUrl, type: info.type, id: info.id })
  }

  // 1. Try official API with admin credentials
  const clientId = await getSetting('spotify_client_id')
  const clientSecret = await getSetting('spotify_client_secret')

  if (clientId && clientSecret && !clientId.startsWith('••••')) {
    const token = await getClientCredentialsToken(clientId, clientSecret)
    if (token) {
      const trackInfo = await fetchTrackInfo(info.id, token)
      if (trackInfo) {
        return NextResponse.json({ ...trackInfo, embedUrl, type: info.type, id: info.id })
      }
    }
  }

  // 2. Try anonymous token (no credentials needed)
  const anonToken = await getAnonymousToken()
  if (anonToken) {
    const trackInfo = await fetchTrackInfo(info.id, anonToken)
    if (trackInfo) {
      return NextResponse.json({ ...trackInfo, embedUrl, type: info.type, id: info.id })
    }
  }

  // 3. oEmbed fallback (title only, no artist)
  const oembed = await fetchOEmbed(url)
  return NextResponse.json({
    title: oembed?.title || '',
    artist: '',
    coverUrl: oembed?.coverUrl || null,
    embedUrl,
    type: info.type,
    id: info.id,
    note: 'Sin credenciales de Spotify — artista no disponible',
  })
}
