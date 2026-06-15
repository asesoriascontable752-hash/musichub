import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSetting } from '@/lib/settings'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { provider } = await req.json()

  try {
    if (provider === 'spotify') {
      const clientId = await getSetting('spotify_client_id')
      const clientSecret = await getSetting('spotify_client_secret')
      if (!clientId || !clientSecret) return NextResponse.json({ ok: false, error: 'Falta Client ID o Client Secret' })
      const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
        },
        body: 'grant_type=client_credentials',
      })
      if (!res.ok) { const d = await res.json(); return NextResponse.json({ ok: false, error: d.error_description ?? `HTTP ${res.status}` }) }
      return NextResponse.json({ ok: true, msg: 'Spotify autenticado correctamente ✓' })
    }

    return NextResponse.json({ ok: false, error: 'Proveedor desconocido' })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message ?? 'Error de red' })
  }
}
