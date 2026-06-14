import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const label = await prisma.label.findFirst({ where: { id, userId: session.user.id } })
  if (!label) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const { name, color, icon } = await req.json()
  const updated = await prisma.label.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(color !== undefined && { color }),
      ...(icon !== undefined && { icon }),
    },
    include: { songs: { select: { songId: true } } },
  })

  return NextResponse.json({ label: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const label = await prisma.label.findFirst({ where: { id, userId: session.user.id } })
  if (!label) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  await prisma.label.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
