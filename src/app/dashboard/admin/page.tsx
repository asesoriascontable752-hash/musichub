'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Shield, Save, Eye, EyeOff, CheckCircle2, AlertCircle,
  Loader2, Settings, Users, Music, Upload, FileText, Crown,
} from 'lucide-react'

// ── Users tab ─────────────────────────────────────────────────────────────────
interface UserRow {
  id: string; name: string | null; email: string; role: string
  permission: { canAddSongs: boolean; canUpload: boolean; canEditLyrics: boolean } | null
  _count: { songs: number }
}

function UsersTab() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [perms, setPerms] = useState<Record<string, { canAddSongs: boolean; canUpload: boolean; canEditLyrics: boolean }>>({})

  useEffect(() => {
    fetch('/api/admin/users').then(r => r.json()).then(d => {
      setUsers(d.users || [])
      const initial: typeof perms = {}
      for (const u of d.users || []) {
        initial[u.id] = u.permission ?? { canAddSongs: false, canUpload: false, canEditLyrics: false }
      }
      setPerms(initial)
      setLoading(false)
    })
  }, [])

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

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-spotify-green animate-spin" /></div>

  const regularUsers = users.filter(u => u.role !== 'admin')
  const admins = users.filter(u => u.role === 'admin')

  return (
    <div className="space-y-6">
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-spotify-light-gray">
        <p className="font-medium text-white mb-1">Control de permisos por usuario</p>
        <p>Los administradores tienen todos los permisos. Activa o desactiva capacidades para cada usuario regular.</p>
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
                <CheckCircle2 className="w-3.5 h-3.5" /> Todos los permisos
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
                  <PermToggle
                    label="Agregar canciones (URL/links)"
                    icon={<Music className="w-3.5 h-3.5" />}
                    checked={p.canAddSongs}
                    onChange={() => toggle(u.id, 'canAddSongs')}
                  />
                  <PermToggle
                    label="Subir archivos de audio/video"
                    icon={<Upload className="w-3.5 h-3.5" />}
                    checked={p.canUpload}
                    onChange={() => toggle(u.id, 'canUpload')}
                  />
                  <PermToggle
                    label="Editar letras"
                    icon={<FileText className="w-3.5 h-3.5" />}
                    checked={p.canEditLyrics}
                    onChange={() => toggle(u.id, 'canEditLyrics')}
                  />
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
  )
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

// ── Spotify Settings tab ───────────────────────────────────────────────────────
function SpotifyTab() {
  const [values, setValues] = useState({ spotify_client_id: '', spotify_client_secret: '' })
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(d => {
      setValues({
        spotify_client_id: d.settings?.spotify_client_id ?? '',
        spotify_client_secret: d.settings?.spotify_client_secret ?? '',
      })
      setLoading(false)
    })
  }, [])

  async function save() {
    setSaving(true); setSaved(false); setResult(null)
    await fetch('/api/admin/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function test() {
    setTesting(true); setResult(null)
    const res = await fetch('/api/admin/test', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'spotify' }),
    })
    const data = await res.json()
    setTesting(false)
    setResult({ ok: data.ok, msg: data.ok ? data.msg : data.error })
  }

  const hasValues = values.spotify_client_id.length > 3 && values.spotify_client_secret.length > 3

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-spotify-green animate-spin" /></div>

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-spotify-light-gray">
        <p className="text-white font-semibold mb-1">¿Para qué sirve Spotify?</p>
        <p>Permite mostrar la portada y el artista de las canciones automáticamente al agregarlas por URL o nombre.</p>
      </div>

      <div className="rounded-xl border border-spotify-green/30 bg-spotify-green/5 p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🎵</span>
          <div>
            <h3 className="font-bold text-base text-spotify-green">Spotify</h3>
            <p className="text-xs text-white/50 mt-0.5">Portadas e información de canciones.</p>
          </div>
          {hasValues && !result && (
            <span className="ml-auto flex items-center gap-1 text-xs text-spotify-green">
              <CheckCircle2 className="w-3.5 h-3.5" /> Configurado
            </span>
          )}
        </div>

        <div className="mb-3 p-3 rounded-lg bg-black/20 border border-white/5 text-xs text-white/50">
          <span className="text-white/70 font-medium">Cómo obtener las claves: </span>
          Ve a developer.spotify.com → &quot;Create app&quot; → copia el Client ID y Client Secret
          {' — '}
          <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer"
            className="text-spotify-green underline underline-offset-2 hover:text-white">
            Abrir Spotify Developer →
          </a>
        </div>

        <div className="space-y-2 mb-4">
          <div>
            <label className="block text-xs text-white/50 mb-1">Client ID</label>
            <input
              type="text"
              value={values.spotify_client_id}
              onChange={e => setValues(p => ({ ...p, spotify_client_id: e.target.value }))}
              placeholder="a1b2c3d4e5f6..."
              className="w-full bg-black/30 text-white text-sm rounded-lg px-4 py-2.5 border border-white/10 focus:border-white/30 focus:outline-none placeholder-white/20 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Client Secret</label>
            <div className="relative">
              <input
                type={visible ? 'text' : 'password'}
                value={values.spotify_client_secret}
                onChange={e => setValues(p => ({ ...p, spotify_client_secret: e.target.value }))}
                placeholder="••••••••••••••••"
                className="w-full bg-black/30 text-white text-sm rounded-lg px-4 py-2.5 border border-white/10 focus:border-white/30 focus:outline-none pr-10 placeholder-white/20 font-mono"
              />
              <button type="button" onClick={() => setVisible(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70">
                {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={save} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-white text-black font-bold rounded-full text-sm hover:bg-white/90 active:scale-95 transition-all disabled:opacity-50">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Guardando…' : 'Guardar'}
          </button>

          <button onClick={test} disabled={testing || !hasValues}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/10 text-white font-semibold rounded-full text-sm hover:bg-white/20 active:scale-95 transition-all disabled:opacity-40">
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {testing ? 'Probando…' : 'Probar conexión'}
          </button>

          {saved && <span className="flex items-center gap-1 text-spotify-green text-sm"><CheckCircle2 className="w-4 h-4" /> Guardado</span>}
          {result && (
            <span className={`flex items-center gap-1 text-sm ${result.ok ? 'text-spotify-green' : 'text-red-400'}`}>
              {result.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {result.msg}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
type AdminTab = 'spotify' | 'users'

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState<AdminTab>('spotify')

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status !== 'authenticated') return
    const role = (session?.user as any)?.role
    if (role !== 'admin') router.push('/dashboard')
  }, [status, session])

  if (status === 'loading' || status === 'unauthenticated') {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-spotify-green animate-spin" /></div>
  }
  const role = (session?.user as any)?.role
  if (role !== 'admin') return null

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto py-6 px-2">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-spotify-green/20 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-spotify-green" />
          </div>
          <div>
            <h1 className="text-white text-xl font-bold">Panel de Administración</h1>
            <p className="text-spotify-light-gray text-sm">Gestión de la aplicación</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 border-b border-white/10 pb-4">
          <button onClick={() => setTab('spotify')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${tab === 'spotify' ? 'bg-white text-black' : 'text-spotify-light-gray hover:text-white bg-white/5'}`}>
            <Settings className="w-4 h-4" /> Spotify
          </button>
          <button onClick={() => setTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${tab === 'users' ? 'bg-white text-black' : 'text-spotify-light-gray hover:text-white bg-white/5'}`}>
            <Users className="w-4 h-4" /> Usuarios y Permisos
          </button>
        </div>

        {tab === 'spotify' && <SpotifyTab />}
        {tab === 'users' && <UsersTab />}
      </div>
    </div>
  )
}
