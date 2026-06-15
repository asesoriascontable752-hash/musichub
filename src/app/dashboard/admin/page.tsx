'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Shield, Save, CheckCircle2, Loader2, Users, Music, Upload, FileText, Crown,
} from 'lucide-react'

interface UserRow {
  id: string; name: string | null; email: string; role: string
  permission: { canAddSongs: boolean; canUpload: boolean; canEditLyrics: boolean } | null
  _count: { songs: number }
}

function PermToggle({ label, icon, checked, onChange }: { label: string; icon: React.ReactNode; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div className="flex-1 flex items-center gap-2 text-sm text-spotify-light-gray group-hover:text-white transition-colors">
        {icon}{label}
      </div>
      <button type="button" onClick={onChange}
        className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-spotify-green' : 'bg-white/20'}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </label>
  )
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [perms, setPerms] = useState<Record<string, { canAddSongs: boolean; canUpload: boolean; canEditLyrics: boolean }>>({})

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status !== 'authenticated') return
    const role = (session?.user as any)?.role
    if (role !== 'admin') { router.push('/dashboard'); return }

    fetch('/api/admin/users').then(r => r.json()).then(d => {
      setUsers(d.users || [])
      const initial: typeof perms = {}
      for (const u of d.users || []) {
        initial[u.id] = u.permission ?? { canAddSongs: false, canUpload: false, canEditLyrics: false }
      }
      setPerms(initial)
      setLoading(false)
    })
  }, [status, session])

  async function savePermissions(userId: string) {
    setSaving(userId)
    await fetch(`/api/admin/permissions/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(perms[userId]),
    })
    setSaving(null)
  }

  function toggle(userId: string, key: keyof typeof perms[string]) {
    setPerms(prev => ({ ...prev, [userId]: { ...prev[userId], [key]: !prev[userId][key] } }))
  }

  if (status === 'loading' || status === 'unauthenticated') {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-spotify-green animate-spin" /></div>
  }
  if ((session?.user as any)?.role !== 'admin') return null

  const admins = users.filter(u => u.role === 'admin')
  const regularUsers = users.filter(u => u.role !== 'admin')

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto py-6 px-2">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-spotify-green/20 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-spotify-green" />
          </div>
          <div>
            <h1 className="text-white text-xl font-bold">Panel de Administración</h1>
            <p className="text-spotify-light-gray text-sm">Gestión de usuarios y permisos</p>
          </div>
        </div>

        {loading && <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-spotify-green animate-spin" /></div>}

        {!loading && (
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-spotify-light-gray">
              <p className="font-medium text-white mb-1">Control de permisos</p>
              <p>Los administradores tienen acceso completo. Activa o desactiva capacidades para cada usuario.</p>
            </div>

            {admins.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-spotify-light-gray uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Crown className="w-3.5 h-3.5 text-spotify-green" /> Administradores
                </h3>
                {admins.map(u => (
                  <div key={u.id} className="flex items-center gap-4 p-4 bg-spotify-green/5 border border-spotify-green/20 rounded-xl mb-2">
                    <div className="w-9 h-9 bg-spotify-green rounded-full flex items-center justify-center flex-shrink-0 text-black font-bold text-sm">
                      {(u.name || u.email)[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{u.name || '—'}</p>
                      <p className="text-spotify-light-gray text-xs truncate">{u.email}</p>
                    </div>
                    <span className="text-xs text-spotify-green font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Acceso completo
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div>
              <h3 className="text-xs font-semibold text-spotify-light-gray uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users className="w-3.5 h-3.5" /> Usuarios ({regularUsers.length})
              </h3>

              {regularUsers.length === 0 && (
                <p className="text-spotify-light-gray text-sm text-center py-8">No hay otros usuarios registrados aún.</p>
              )}

              <div className="space-y-3">
                {regularUsers.map(u => {
                  const p = perms[u.id] ?? { canAddSongs: false, canUpload: false, canEditLyrics: false }
                  return (
                    <div key={u.id} className="p-4 bg-white/5 border border-white/10 rounded-xl">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                          {(u.name || u.email)[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{u.name || '—'}</p>
                          <p className="text-spotify-light-gray text-xs truncate">{u.email} · {u._count.songs} canciones</p>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <PermToggle label="Agregar canciones" icon={<Music className="w-3.5 h-3.5" />} checked={p.canAddSongs} onChange={() => toggle(u.id, 'canAddSongs')} />
                        <PermToggle label="Subir archivos" icon={<Upload className="w-3.5 h-3.5" />} checked={p.canUpload} onChange={() => toggle(u.id, 'canUpload')} />
                        <PermToggle label="Editar letras" icon={<FileText className="w-3.5 h-3.5" />} checked={p.canEditLyrics} onChange={() => toggle(u.id, 'canEditLyrics')} />
                      </div>

                      <button onClick={() => savePermissions(u.id)} disabled={saving === u.id}
                        className="mt-4 flex items-center gap-2 px-4 py-2 bg-spotify-green text-black font-bold rounded-full text-sm hover:bg-spotify-green/90 active:scale-95 transition-all disabled:opacity-60">
                        {saving === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Guardar permisos
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
