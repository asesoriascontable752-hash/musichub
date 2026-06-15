import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import Anthropic from '@anthropic-ai/sdk'
import { authOptions } from '@/lib/auth'
import { getSetting } from '@/lib/settings'

// Read a key from DB first, fallback to env var
async function getKey(dbKey: string, envVar: string): Promise<string | undefined> {
  const fromDb = await getSetting(dbKey)
  if (fromDb && fromDb.trim() && !fromDb.startsWith('••••')) return fromDb.trim()
  return process.env[envVar] || undefined
}

const PROMPT = (artist: string | null | undefined, title: string) =>
  artist
    ? `Proporciona ÚNICAMENTE la letra completa de la canción "${title}" de "${artist}". Sin introducción, sin explicaciones, sin comillas — solo el texto puro de la letra. Si no conoces esta canción con certeza, responde exactamente: NOT_FOUND`
    : `Proporciona ÚNICAMENTE la letra completa de la canción titulada "${title}". Sin introducción, sin explicaciones, sin comillas — solo el texto puro de la letra. Si no conoces esta canción con certeza, responde exactamente: NOT_FOUND`

function isValid(text: string) {
  return text && !text.startsWith('NOT_FOUND') && text.length > 60
}

// ── Claude Haiku ──────────────────────────────────────────────────────────────
async function fromClaude(artist: string | null | undefined, title: string): Promise<string | null> {
  const key = await getKey('ai_anthropic_key', 'ANTHROPIC_API_KEY')
  if (!key || key.includes('PEGA')) return null
  try {
    const client = new Anthropic({ apiKey: key })
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: PROMPT(artist, title) }],
    })
    const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
    return isValid(text) ? text : null
  } catch (e: any) {
    console.error('[claude]', e?.message)
    return null
  }
}

// ── Gemini ────────────────────────────────────────────────────────────────────
async function fromGemini(artist: string | null | undefined, title: string): Promise<string | null> {
  const key = await getKey('ai_gemini_key', 'GEMINI_API_KEY')
  if (!key) return null
  const model = await getKey('ai_gemini_model', 'GEMINI_MODEL') || 'gemini-1.5-flash'
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: PROMPT(artist, title) }] }],
          generationConfig: { maxOutputTokens: 2048, temperature: 0.1 },
          safetySettings: [
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          ],
        }),
        signal: AbortSignal.timeout(20000),
      }
    )
    const data = await res.json()
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
    return isValid(text) ? text : null
  } catch (e: any) {
    console.error('[gemini]', e?.message)
    return null
  }
}

// ── Perplexity Sonar ──────────────────────────────────────────────────────────
async function fromPerplexity(artist: string | null | undefined, title: string): Promise<string | null> {
  const key = await getKey('ai_perplexity_key', 'PERPLEXITY_API_KEY')
  if (!key) return null
  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: 'Eres una base de datos de letras de canciones. Proporciona solo el texto de la letra sin ningún otro texto.' },
          { role: 'user', content: PROMPT(artist, title) },
        ],
        max_tokens: 2048,
        temperature: 0.1,
      }),
      signal: AbortSignal.timeout(20000),
    })
    const data = await res.json()
    const text: string = data.choices?.[0]?.message?.content?.trim() ?? ''
    return isValid(text) ? text : null
  } catch (e: any) {
    console.error('[perplexity]', e?.message)
    return null
  }
}

// ── Ollama (local) ────────────────────────────────────────────────────────────
async function fromOllama(artist: string | null | undefined, title: string): Promise<string | null> {
  const host = await getKey('ai_ollama_host', 'OLLAMA_HOST') || 'http://localhost:11434'
  const model = await getKey('ai_ollama_model', 'OLLAMA_MODEL') || 'gemma4:27b'
  try {
    const res = await fetch(`${host}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: PROMPT(artist, title),
        stream: false,
        options: { temperature: 0.1, num_predict: 2048 },
      }),
      signal: AbortSignal.timeout(60000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const text: string = data.response?.trim() ?? ''
    return isValid(text) ? text : null
  } catch (e: any) {
    console.error('[ollama]', e?.message)
    return null
  }
}

// ── Provider map ──────────────────────────────────────────────────────────────
type Provider = 'claude' | 'gemini' | 'perplexity' | 'ollama'

const PROVIDERS: Record<Provider, (a: string | null | undefined, t: string) => Promise<string | null>> = {
  claude: fromClaude,
  gemini: fromGemini,
  perplexity: fromPerplexity,
  ollama: fromOllama,
}

// ── Route ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const artist = searchParams.get('artist')?.trim()
  const title = searchParams.get('title')?.trim()
  const provider = (searchParams.get('provider') ?? '') as Provider

  if (!title) {
    return NextResponse.json({ lyrics: null, provider: null })
  }

  // Single provider requested
  if (provider && PROVIDERS[provider]) {
    const lyrics = await PROVIDERS[provider](artist, title)
    return NextResponse.json({ lyrics, provider: lyrics ? provider : null })
  }

  // Cascade through all providers
  for (const [name, fn] of Object.entries(PROVIDERS) as [Provider, typeof fromClaude][]) {
    const lyrics = await fn(artist, title)
    if (lyrics) return NextResponse.json({ lyrics, provider: name })
  }

  return NextResponse.json({ lyrics: null, provider: null })
}
