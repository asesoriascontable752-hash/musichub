import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const song = await prisma.song.findUnique({ where: { id } })
  if (!song) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const isOwner = song.userId === session.user.id
  const isAdmin = (session.user as any).role === 'admin'
  if (!isOwner && !isAdmin) return NextResponse.json({ error: 'Solo el dueño puede eliminar' }, { status: 403 })

  await prisma.song.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const song = await prisma.song.findUnique({ where: { id } })
  if (!song) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const isOwner = song.userId === session.user.id
  const isAdmin = (session.user as any).role === 'admin'

  const body = await req.json()
  const isLyricsOnly = Object.keys(body).length === 1 && 'lyrics' in body

  if (!isOwner && !isAdmin) {
    // Other users may only edit lyrics if they have the permission
    if (!isLyricsOnly) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    const canEdit = await requirePermission(session.user.id, 'canEditLyrics')
    if (!canEdit) return NextResponse.json({ error: 'Sin permiso para editar letras' }, { status: 403 })
  }

  const updated = await prisma.song.update({ where: { id }, data: body })
  return NextResponse.json({ song: updated })
}
