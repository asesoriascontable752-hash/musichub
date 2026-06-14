import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { requirePermission } from '@/lib/permissions'

const ALLOWED_AUDIO = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/aac', 'audio/m4a', 'audio/mp4']
const ALLOWED_VIDEO = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov', 'video/quicktime']
const MAX_SIZE = 100 * 1024 * 1024 // 100MB

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  if (process.env.VERCEL) {
    return NextResponse.json(
      { error: 'La subida de archivos locales no está disponible en Vercel. Usa enlaces de YouTube o Spotify.' },
      { status: 501 }
    )
  }

  const allowed = await requirePermission(session.user.id, 'canUpload')
  if (!allowed) return NextResponse.json({ error: 'Sin permiso para subir archivos' }, { status: 403 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'Archivo demasiado grande (máx 100MB)' }, { status: 400 })

    const isAudio = ALLOWED_AUDIO.includes(file.type)
    const isVideo = ALLOWED_VIDEO.includes(file.type)
    if (!isAudio && !isVideo) {
      return NextResponse.json({ error: 'Formato no permitido. Solo audio y video.' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // UPLOAD_DIR env var allows persistent volume on Railway/VPS
    // Default: public/uploads (dev), /data/uploads (prod)
    const baseUploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads')
    const userDir = path.join(baseUploadDir, session.user.id)
    await mkdir(userDir, { recursive: true })

    const ext = path.extname(file.name) || (isVideo ? '.mp4' : '.mp3')
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
    const filePath = path.join(userDir, safeName)

    await writeFile(filePath, buffer)

    // If using a custom upload dir outside public/, serve via /api/media
    const isCustomDir = !!process.env.UPLOAD_DIR
    const publicPath = isCustomDir
      ? `/api/media/${session.user.id}/${safeName}`
      : `/uploads/${session.user.id}/${safeName}`
    return NextResponse.json({
      url: publicPath,
      name: file.name,
      type: isVideo ? 'video' : 'audio',
      size: file.size,
    })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Error al subir archivo' }, { status: 500 })
  }
}
