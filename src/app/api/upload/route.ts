import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { requirePermission } from '@/lib/permissions'

const AUDIO_EXT = /\.(mp3|wav|flac|ogg|opus|m4a|aac|wma|weba|aiff|aif|alac|ape|wv|mid|midi)$/i
const VIDEO_EXT = /\.(mp4|avi|mkv|mov|webm|m4v|3gp|ts|ogv)$/i
const MAX_SIZE = 100 * 1024 * 1024 // 100MB

function isAudioFile(file: File) {
  return /^audio\//.test(file.type) || AUDIO_EXT.test(file.name)
}
function isVideoFile(file: File) {
  return /^video\//.test(file.type) || VIDEO_EXT.test(file.name)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const allowed = await requirePermission(session.user.id, 'canUpload')
  if (!allowed) return NextResponse.json({ error: 'Sin permiso para subir archivos' }, { status: 403 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'Archivo demasiado grande (máx 100MB)' }, { status: 400 })

    const isAudio = isAudioFile(file)
    const isVideo = isVideoFile(file)

    if (!isAudio && !isVideo) {
      return NextResponse.json({ error: `Formato no soportado: ${file.name}` }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // ── Supabase Storage (production) ────────────────────────────────────────
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY,
        { auth: { persistSession: false } }
      )

      const ext      = path.extname(file.name) || (isVideo ? '.mp4' : '.mp3')
      const fileName = `${session!.user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
      const mimeType = file.type || (isVideo ? 'video/mp4' : 'audio/mpeg')

      const { error } = await supabase.storage
        .from('musichub')
        .upload(fileName, buffer, { contentType: mimeType, upsert: false })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('musichub')
        .getPublicUrl(fileName)

      return NextResponse.json({
        url:  publicUrl,
        name: file.name,
        type: isVideo ? 'video' : 'audio',
        size: file.size,
      })
    }

    // ── Cloudinary (fallback) ────────────────────────────────────────────────
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      const { v2: cloudinary } = await import('cloudinary')
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key:    process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      })

      const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: 'video', folder: `musichub/${session!.user!.id}` },
          (error, result) => {
            if (error || !result) reject(error ?? new Error('No result'))
            else resolve(result as { secure_url: string })
          }
        )
        stream.end(buffer)
      })

      return NextResponse.json({
        url:  result.secure_url,
        name: file.name,
        type: isVideo ? 'video' : 'audio',
        size: file.size,
      })
    }

    // ── Local filesystem (development) ───────────────────────────────────────
    const baseDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads')
    const userDir = path.join(baseDir, session.user.id)
    await mkdir(userDir, { recursive: true })

    const ext     = path.extname(file.name) || (isVideo ? '.mp4' : '.mp3')
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
    const filePath = path.join(userDir, safeName)
    await writeFile(filePath, buffer)

    const isCustomDir = !!process.env.UPLOAD_DIR
    const publicUrl   = isCustomDir
      ? `/api/media/${session.user.id}/${safeName}`
      : `/uploads/${session.user.id}/${safeName}`

    return NextResponse.json({
      url:  publicUrl,
      name: file.name,
      type: isVideo ? 'video' : 'audio',
      size: file.size,
    })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Error al subir archivo' }, { status: 500 })
  }
}
