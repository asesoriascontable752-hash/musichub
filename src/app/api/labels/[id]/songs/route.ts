import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const label = await prisma.label.findFirst({ where: { id: params.id, userId: session.user.id } })
  if (!label) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const { songId } = await req.json()
  const song = await prisma.song.findFirst({ where: { id: songId, userId: session.user.id } })
  if (!song) return NextResponse.json({ error: 'Canción no encontrada' }, { status: 404 })

  await prisma.songLabel.upsert({
    where: { songId_labelId: { songId, labelId: params.id } },
    create: { songId, labelId: params.id },
    update: {},
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { songId } = await req.json()

  await prisma.songLabel.deleteMany({
    where: { songId, labelId: params.id },
  })

  return NextResponse.json({ ok: true })
}
