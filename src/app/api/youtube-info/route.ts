import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')

  if (!url) return NextResponse.json({ error: 'URL requerida' }, { status: 400 })

  const videoId = extractYouTubeId(url)
  if (!videoId) return NextResponse.json({ error: 'URL de YouTube inválida' }, { status: 400 })

  try {
    // Use oEmbed to get video title/author (no API key required)
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    const res = await fetch(oembedUrl)

    if (!res.ok) {
      return NextResponse.json({
        videoId,
        title: 'YouTube Video',
        artist: 'Desconocido',
        coverUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        embedUrl: `https://www.youtube.com/watch?v=${videoId}`,
      })
    }

    const data = await res.json()
    return NextResponse.json({
      videoId,
      title: data.title || 'YouTube Video',
      artist: data.author_name || 'Desconocido',
      coverUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      embedUrl: `https://www.youtube.com/watch?v=${videoId}`,
    })
  } catch {
    return NextResponse.json({
      videoId,
      title: 'YouTube Video',
      artist: 'Desconocido',
      coverUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      embedUrl: `https://www.youtube.com/watch?v=${videoId}`,
    })
  }
}
