'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Shield, Save, Eye, EyeOff, CheckCircle2, AlertCircle,
  Loader2, Settings, Users, Music, Upload, FileText, Crown,
} from 'lucide-react'

// ── AI Settings tab ────────────────────────────────────────────────────────────
interface ProviderConfig {
  id: string; label: string; emoji: string; color: string; bgColor: string
  fields: { key: string; label: string; placeholder: string; isSecret: boolean }[]
  docsUrl: string; docsLabel: string
}
const PROVIDERS: ProviderConfig[] = [
  { id: 'spotify', label: 'Spotify', emoji: '🎵', color: 'text-spotify-green', bgColor: 'bg-spotify-green/10 border-spotify-green/20',
    fields: [
      { key: 'spotify_client_id', label: 'Client ID', placeholder: 'a1b2c3d4e5f6...', isSecret: false },
      { key: 'spotify_client_secret', label: 'Client Secret', placeholder: '••••••••••••••••', isSecret: true },
    ],
    docsUrl: 'https://developer.spotify.com/dashboard', docsLabel: 'developer.spotify.com — gratis, crea una app' },
  { id: 'claude', label: 'Claude Haiku', emoji: '🤖', color: 'text-orange-400', bgColor: 'bg-orange-400/10 border-orange-400/20',
    fields: [{ key: 'ai_anthropic_key', label: 'API Key de Anthropic', placeholder: 'sk-ant-api03-...', isSecret: true }],
    docsUrl: 'https://console.anthropic.com', docsLabel: 'console.anthropic.com' },
  { id: 'gemini', label: 'Gemini 1.5 Flash', emoji: '✨', color: 'text-blue-400', bgColor: 'bg-blue-400/10 border-blue-400/20',
    fields: [{ key: 'ai_gemini_key', label: 'API Key de Google AI Studio', placeholder: 'AIzaSy...', isSecret: true }],
    docsUrl: 'https://aistudio.google.com/app/apikey', docsLabel: 'aistudio.google.com' },
  { id: 'perplexity', label: 'Perplexity AI', emoji: '🔍', color: 'text-purple-400', bgColor: 'bg-purple-400/10 border-purple-400/20',
    fields: [{ key: 'ai_perplexity_key', label: 'API Key de Perplexity', placeholder: 'pplx-...', isSecret: true }],
    docsUrl: 'https://www.perplexity.ai/settings/api', docsLabel: 'perplexity.ai/settings/api' },
  { id: 'ollama', label: 'Ollama (local)', emoji: '🦙', color: 'text-green-400', bgColor: 'bg-green-400/10 border-green-400/20',
    fields: [
      { key: 'ai_ollama_host', label: 'URL del servidor Ollama', placeholder: 'http://localhost:11434', isSecret: false },
      { key: 'ai_ollama_model', label: 'Modelo a usar', placeholder: 'llama3.2', isSecret: false },
    ],
    docsUrl: 'https://ollama.com', docsLabel: 'ollama.com — gratis, corre en tu PC' },
]

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
      {/* Info */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-spotify-light-gray">
        <p className="font-medium text-white mb-1">Control de permisos por usuario</p>
        <p>Los administradores tienen todos los permisos. Activa o desactiva capacidades para cada usuario regular.</p>
      </div>

      {/* Admins */}
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

      {/* Regular users */}
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

                {/* Permission toggles */}
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
                    label="Editar letras manualmente"
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

// ── AI Settings tab ────────────────────────────────────────────────────────────
function AISettingsTab() {
  const [values, setValues] = useState<Record<string, string>>({})
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(d => {
      setValues(d.settings ?? {}); setLoading(false)
    })
  }, [])

  async function handleSave() {
    setSaving(true); setError(null); setSaved(false)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) throw new Error('Error al guardar')
      setSaved(true); setTimeout(() => setSaved(false), 4000)
      fetch('/api/admin/settings').then(r => r.json()).then(d => setValues(d.settings ?? {}))
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-spotify-green animate-spin" /></div>

  return (
    <div className="space-y-4">
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-spotify-light-gray">
        <p className="font-medium text-white mb-1">¿Cómo funciona?</p>
        <p>La app busca letras en este orden: <span className="text-white">lyrics.ovh → YouTube → Claude → Gemini → Perplexity → Ollama</span>. Sin clave, ese proveedor se omite.</p>
      </div>
      {PROVIDERS.map(provider => (
        <div key={provider.id} className={`rounded-xl border p-5 ${provider.bgColor}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{provider.emoji}</span>
              <div>
                <h2 className={`font-bold text-base ${provider.color}`}>{provider.label}</h2>
                <a href={provider.docsUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-white/40 hover:text-white/70 underline underline-offset-2">{provider.docsLabel}</a>
              </div>
            </div>
            {provider.fields.some(f => (values[f.key] || '').length > 0) && (
              <span className="flex items-center gap-1 text-xs text-spotify-green"><CheckCircle2 className="w-3.5 h-3.5" /> Configurado</span>
            )}
          </div>
          <div className="space-y-3">
            {provider.fields.map(field => (
              <div key={field.key}>
                <label className="block text-xs text-white/60 mb-1.5 font-medium">{field.label}</label>
                <div className="relative">
                  <input
                    type={field.isSecret && !visible[field.key] ? 'password' : 'text'}
                    value={values[field.key] ?? ''}
                    onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={(values[field.key] || '').startsWith('••••') ? '(clave guardada — escribe para cambiar)' : field.placeholder}
                    className="w-full bg-black/30 text-white text-sm rounded-lg px-4 py-2.5 border border-white/10 focus:border-white/30 focus:outline-none pr-10 placeholder-white/20 font-mono"
                  />
                  {field.isSecret && (
                    <button type="button" onClick={() => setVisible(p => ({ ...p, [field.key]: !p[field.key] }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors">
                      {visible[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-4 mt-6">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-spotify-green text-black font-bold rounded-full hover:bg-spotify-green/90 active:scale-95 transition-all disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Guardando…' : 'Guardar configuración'}
        </button>
        {saved && <span className="flex items-center gap-1.5 text-spotify-green text-sm"><CheckCircle2 className="w-4 h-4" /> Guardado</span>}
        {error && <span className="flex items-center gap-1.5 text-red-400 text-sm"><AlertCircle className="w-4 h-4" /> {error}</span>}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
type AdminTab = 'ai' | 'users'

export default function AdminPage() {
  const { status } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState<AdminTab>('ai')
  const [isAdmin, setIsAdmin] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status !== 'authenticated') return
    fetch('/api/admin/settings').then(res => {
      if (res.status === 403) { router.push('/dashboard'); return }
      setIsAdmin(true); setChecking(false)
    })
  }, [status])

  if (checking || status === 'loading') {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-spotify-green animate-spin" /></div>
  }
  if (!isAdmin) return null

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto py-6 px-2">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-spotify-green/20 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-spotify-green" />
          </div>
          <div>
            <h1 className="text-white text-xl font-bold">Panel de Administración</h1>
            <p className="text-spotify-light-gray text-sm">Gestión de la aplicación</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-white/10 pb-4">
          <button onClick={() => setTab('ai')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${tab === 'ai' ? 'bg-white text-black' : 'text-spotify-light-gray hover:text-white bg-white/5'}`}>
            <Settings className="w-4 h-4" /> Configuración IA
          </button>
          <button onClick={() => setTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${tab === 'users' ? 'bg-white text-black' : 'text-spotify-light-gray hover:text-white bg-white/5'}`}>
            <Users className="w-4 h-4" /> Usuarios y Permisos
          </button>
        </div>

        {tab === 'ai' && <AISettingsTab />}
        {tab === 'users' && <UsersTab />}
      </div>
    </div>
  )
}
