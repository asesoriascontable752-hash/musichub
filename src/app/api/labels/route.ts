import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const labels = await prisma.label.findMany({
    where: { userId: session.user.id },
    include: { songs: { select: { songId: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ labels })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { name, color, icon } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

  const label = await prisma.label.create({
    data: {
      name: name.trim(),
      color: color || '#1DB954',
      icon: icon || 'tag',
      userId: session.user.id,
    },
    include: { songs: { select: { songId: true } } },
  })

  return NextResponse.json({ label }, { status: 201 })
}
