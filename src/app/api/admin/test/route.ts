import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSetting } from '@/lib/settings'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { provider } = await req.json()

  try {
    if (provider === 'gemini') {
      const key = await getSetting('ai_gemini_key')
      if (!key) return NextResponse.json({ ok: false, error: 'No hay clave guardada' })
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
      if (!res.ok) { const d = await res.json(); return NextResponse.json({ ok: false, error: d.error?.message ?? `HTTP ${res.status}` }) }
      return NextResponse.json({ ok: true, msg: 'Gemini responde correctamente ✓' })
    }

    if (provider === 'claude') {
      const key = await getSetting('ai_anthropic_key')
      if (!key) return NextResponse.json({ ok: false, error: 'No hay clave guardada' })
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 10, messages: [{ role: 'user', content: 'Hola' }] }),
      })
      if (!res.ok) { const d = await res.json(); return NextResponse.json({ ok: false, error: d.error?.message ?? `HTTP ${res.status}` }) }
      return NextResponse.json({ ok: true, msg: 'Claude Haiku responde correctamente ✓' })
    }

    if (provider === 'spotify') {
      const clientId = await getSetting('spotify_client_id')
      const clientSecret = await getSetting('spotify_client_secret')
      if (!clientId || !clientSecret) return NextResponse.json({ ok: false, error: 'Falta Client ID o Client Secret' })
      const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64') },
        body: 'grant_type=client_credentials',
      })
      if (!res.ok) { const d = await res.json(); return NextResponse.json({ ok: false, error: d.error_description ?? `HTTP ${res.status}` }) }
      return NextResponse.json({ ok: true, msg: 'Spotify autenticado correctamente ✓' })
    }

    if (provider === 'perplexity') {
      const key = await getSetting('ai_perplexity_key')
      if (!key) return NextResponse.json({ ok: false, error: 'No hay clave guardada' })
      const res = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'sonar', max_tokens: 10, messages: [{ role: 'user', content: 'Hola' }] }),
      })
      if (!res.ok) { const d = await res.json(); return NextResponse.json({ ok: false, error: d.error?.message ?? `HTTP ${res.status}` }) }
      return NextResponse.json({ ok: true, msg: 'Perplexity responde correctamente ✓' })
    }

    return NextResponse.json({ ok: false, error: 'Proveedor desconocido' })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message ?? 'Error de red' })
  }
}
