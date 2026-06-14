import { prisma } from './db'

// Raw-SQL helpers for the Setting table
// (avoids needing Prisma client regeneration)

export async function getSetting(key: string): Promise<string | null> {
  try {
    const rows = await prisma.$queryRaw<{ value: string }[]>`
      SELECT value FROM Setting WHERE key = ${key}
    `
    return rows[0]?.value ?? null
  } catch {
    return null
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO Setting (key, value, updatedAt)
    VALUES (${key}, ${value}, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = CURRENT_TIMESTAMP
  `
}

export async function getAllSettings(keys: string[]): Promise<Record<string, string>> {
  try {
    const rows = await prisma.$queryRaw<{ key: string; value: string }[]>`
      SELECT key, value FROM Setting WHERE key IN (${keys.join(',')})
    `
    return Object.fromEntries(rows.map(r => [r.key, r.value]))
  } catch {
    return {}
  }
}

export async function getUserRole(userId: string): Promise<string> {
  try {
    const rows = await prisma.$queryRaw<{ role: string }[]>`
      SELECT role FROM User WHERE id = ${userId}
    `
    return rows[0]?.role ?? 'user'
  } catch {
    return 'user'
  }
}
