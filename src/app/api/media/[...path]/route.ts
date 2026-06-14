import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readFile, stat } from 'fs/promises'
import path from 'path'
import { lookup } from 'mime-types'

// Serves files from UPLOAD_DIR when it is outside /public (e.g. Railway volume)
export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: pathSegments } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return new NextResponse('No autorizado', { status: 401 })

  const baseDir = process.env.UPLOAD_DIR
  if (!baseDir) return new NextResponse('Not configured', { status: 404 })

  const segments = pathSegments
  // Security: first segment must be the requesting user's ID
  if (segments[0] !== session.user.id) return new NextResponse('Prohibido', { status: 403 })

  const filePath = path.join(baseDir, ...segments)
  // Prevent path traversal
  if (!filePath.startsWith(baseDir)) return new NextResponse('Prohibido', { status: 403 })

  try {
    await stat(filePath)
    const buffer = await readFile(filePath)
    const mimeType = (lookup(filePath) as string) || 'application/octet-stream'
    return new NextResponse(buffer, { headers: { 'Content-Type': mimeType, 'Cache-Control': 'private, max-age=31536000' } })
  } catch {
    return new NextResponse('No encontrado', { status: 404 })
  }
}
