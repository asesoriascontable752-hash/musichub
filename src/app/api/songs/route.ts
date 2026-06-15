import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'

const songSchema = z.object({
  title: z.string().min(1),
  artist: z.string().optional(),
  album: z.string().optional(),
  duration: z.number().optional(),
  coverUrl: z.string().url().optional().nullable(),
  sourceType: z.enum(['youtube', 'local', 'url']),
  sourceUrl: z.string().optional().nullable(),
  filePath: z.string().optional().nullable(),
  lyrics: z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const songs = await prisma.song.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ songs })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const allowed = await requirePermission(session.user.id, 'canAddSongs')
  if (!allowed) return NextResponse.json({ error: 'Sin permiso para agregar canciones' }, { status: 403 })

  try {
    const body = await req.json()
    const data = songSchema.parse(body)

    const song = await prisma.song.create({
      data: { ...data, userId: session.user.id },
    })

    return NextResponse.json({ song }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
