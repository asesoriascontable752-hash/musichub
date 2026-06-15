import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSetting, setSetting, getUserRole } from '@/lib/settings'

const ALL_KEYS = [
  'spotify_client_id',
  'spotify_client_secret',
]

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
  for (const key of ALL_KEYS) {
    const val = await getSetting(key)
    if (val !== null) {
      if (key.endsWith('_secret') && val.length > 8) {
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

  for (const key of ALL_KEYS) {
    if (key in body) {
      const val = String(body[key] ?? '').trim()
      if (val.startsWith('••••')) continue
      await setSetting(key, val)
    }
  }

  return NextResponse.json({ ok: true })
}
