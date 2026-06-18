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
    return { title: data.title || '', coverUrl: data.thumbnail_url || null }
  } catch {}
  return null
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'URL requerida' }, { status: 400 })

  const info = extractSpotifyInfo(url)
  if (!info) return NextResponse.json({ error: 'URL de Spotify inválida' }, { status: 400 })

  const embedUrl = `https://open.spotify.com/embed/${info.type}/${info.id}?utm_source=generator&theme=0`

  const oembed = await fetchOEmbed(url)
  return NextResponse.json({
    title: oembed?.title || '',
    artist: '',
    coverUrl: oembed?.coverUrl || null,
    embedUrl,
    type: info.type,
    id: info.id,
  })
}
