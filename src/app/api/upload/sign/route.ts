import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'
import path from 'path'

const AUDIO_EXT = /\.(mp3|wav|flac|ogg|opus|m4a|aac|wma|weba|aiff|aif|alac|ape|wv|mid|midi)$/i
const VIDEO_EXT = /\.(mp4|avi|mkv|mov|webm|m4v|3gp|ts|ogv)$/i

export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return NextResponse.json({ error: 'Supabase no configurado' }, { status: 501 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const allowed = await requirePermission(session.user.id, 'canUpload')
  if (!allowed) return NextResponse.json({ error: 'Sin permiso para subir archivos' }, { status: 403 })

  const { fileName, contentType } = await req.json()
  if (!fileName) return NextResponse.json({ error: 'fileName requerido' }, { status: 400 })

  const isAudio = /^audio\//.test(contentType || '') || AUDIO_EXT.test(fileName)
  const isVideo = /^video\//.test(contentType || '') || VIDEO_EXT.test(fileName)
  if (!isAudio && !isVideo) {
    return NextResponse.json({ error: `Formato no soportado: ${fileName}` }, { status: 400 })
  }

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { persistSession: false } }
  )

  const ext = path.extname(fileName) || (isVideo ? '.mp4' : '.mp3')
  const storagePath = `${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`

  const { data, error } = await supabase.storage
    .from('musichub')
    .createSignedUploadUrl(storagePath)

  if (error || !data) {
    // Diagnostic: list buckets to see what's available
    const { data: buckets } = await supabase.storage.listBuckets()
    const names = buckets?.map(b => b.name).join(', ') || 'ninguno'
    return NextResponse.json({
      error: `${error?.message ?? 'sin datos'} | buckets: [${names}] | url: ${process.env.SUPABASE_URL?.slice(0, 40)}`,
    }, { status: 500 })
  }

  const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/musichub/${storagePath}`

  return NextResponse.json({
    signedUrl: data.signedUrl,
    path: storagePath,
    publicUrl,
    fileType: isVideo ? 'video' : 'audio',
  })
}
