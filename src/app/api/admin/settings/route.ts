import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSetting, setSetting, getUserRole } from '@/lib/settings'

const ALL_KEYS = [
  'ai_anthropic_key',
  'ai_gemini_key',
  'ai_gemini_model',
  'ai_perplexity_key',
  'ai_ollama_host',
  'ai_ollama_model',
  'spotify_client_id',
  'spotify_client_secret',
]

const AI_KEYS = ALL_KEYS // alias kept for clarity

async function requireAdmin(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  const role = await getUserRole(session.user.id)
  if (role !== 'admin') return null
  return session
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const settings: Record<string, string> = {}
  for (const key of AI_KEYS) {
    const val = await getSetting(key)
    if (val !== null) {
      // Mask secret keys — show only last 4 chars
      if (key.endsWith('_key') && val.length > 8) {
        settings[key] = '••••••••' + val.slice(-4)
      } else {
        settings[key] = val
      }
    } else {
      settings[key] = ''
    }
  }

  return NextResponse.json({ settings })
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await req.json()

  for (const key of AI_KEYS) {
    if (key in body) {
      const val = String(body[key] ?? '').trim()
      // Don't overwrite if the value is the masked placeholder
      if (val.startsWith('••••') ) continue
      if (val === '') {
        // Allow clearing
        await setSetting(key, '')
      } else {
        await setSetting(key, val)
      }
    }
  }

  return NextResponse.json({ ok: true })
}
