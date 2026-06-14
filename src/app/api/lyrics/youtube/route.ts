import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { YoutubeTranscript } from 'youtube-transcript'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const videoId = searchParams.get('videoId')

  if (!videoId) return NextResponse.json({ transcript: null })

  try {
    // Try Spanish first, then English, then any language
    const langs = ['es', 'en', 'pt']
    let transcript: any[] | null = null

    for (const lang of langs) {
      try {
        transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang })
        if (transcript?.length) break
      } catch {}
    }

    if (!transcript?.length) {
      // Try without lang filter
      try {
        transcript = await YoutubeTranscript.fetchTranscript(videoId)
      } catch {}
    }

    if (!transcript?.length) {
      return NextResponse.json({ transcript: null })
    }

    // Join transcript lines into readable text
    const text = transcript
      .map(t => t.text.trim())
      .filter(Boolean)
      .join('\n')

    return NextResponse.json({ transcript: text })
  } catch (err: any) {
    return NextResponse.json({ transcript: null, error: err?.message })
  }
}
