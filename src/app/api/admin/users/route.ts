import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getUserRole } from '@/lib/settings'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const role = await getUserRole(session.user.id)
  if (role !== 'admin') return NextResponse.json({ error: 'Prohibido' }, { status: 403 })

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      permission: true,
      _count: { select: { songs: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ users })
}
