import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const artist = searchParams.get('artist')
  const title = searchParams.get('title')

  if (!artist || !title) {
    return NextResponse.json({ error: 'Se requiere artista y título' }, { status: 400 })
  }

  try {
    const encoded = `${encodeURIComponent(artist)}/${encodeURIComponent(title)}`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)

    const res = await fetch(`https://api.lyrics.ovh/v1/${encoded}`, {
      headers: { 'User-Agent': 'MusicHub/1.0' },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout))

    if (!res.ok) {
      return NextResponse.json({ lyrics: null, message: 'Letra no encontrada' })
    }

    const data = await res.json()
    return NextResponse.json({ lyrics: data.lyrics || null })
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return NextResponse.json({ lyrics: null, message: 'Tiempo de espera agotado' })
    }
    return NextResponse.json({ lyrics: null, message: 'Error al buscar letra' })
  }
}
