import { prisma } from './db'
import { getUserRole } from './settings'

export interface Permissions {
  canAddSongs: boolean
  canUpload: boolean
  canEditLyrics: boolean
}

export async function getUserPermissions(userId: string): Promise<Permissions> {
  const role = await getUserRole(userId)
  if (role === 'admin') return { canAddSongs: true, canUpload: true, canEditLyrics: true }

  const perm = await prisma.userPermission.findUnique({ where: { userId } })
  return {
    canAddSongs: perm?.canAddSongs ?? false,
    canUpload: perm?.canUpload ?? false,
    canEditLyrics: perm?.canEditLyrics ?? false,
  }
}

export async function requirePermission(
  userId: string,
  permission: keyof Permissions
): Promise<boolean> {
  const perms = await getUserPermissions(userId)
  return perms[permission]
}
