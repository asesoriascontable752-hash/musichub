import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { setSetting, getUserRole } from '@/lib/settings'

// One-time setup: saves Ollama config to DB for the currently logged-in admin.
// Call once from browser, then this file can be deleted.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const role = await getUserRole(session.user.id)
  if (role !== 'admin') return NextResponse.json({ error: 'Solo admin' }, { status: 403 })

  await setSetting('ai_ollama_host', 'http://localhost:11434')
  await setSetting('ai_ollama_model', 'gemma4:27b')

  return NextResponse.json({
    ok: true,
    saved: { host: 'http://localhost:11434', model: 'gemma4:27b' },
    msg: 'Ollama configurado. Puedes eliminar este endpoint.',
  })
}
