import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const song = await prisma.song.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!song) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  await prisma.song.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const song = await prisma.song.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!song) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const body = await req.json()
  const updated = await prisma.song.update({
    where: { id },
    data: body,
  })
  return NextResponse.json({ song: updated })
}
