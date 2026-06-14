import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getUserRole } from '@/lib/settings'

export async function PATCH(req: NextRequest, { params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const role = await getUserRole(session.user.id)
  if (role !== 'admin') return NextResponse.json({ error: 'Prohibido' }, { status: 403 })

  const { canAddSongs, canUpload, canEditLyrics } = await req.json()

  const perm = await prisma.userPermission.upsert({
    where: { userId: params.userId },
    update: { canAddSongs, canUpload, canEditLyrics },
    create: { userId: params.userId, canAddSongs, canUpload, canEditLyrics },
  })

  return NextResponse.json({ permission: perm })
}
