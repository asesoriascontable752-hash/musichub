'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Shield, Save, Eye, EyeOff, CheckCircle2, AlertCircle,
  Loader2, Settings, Users, Music, Upload, FileText, Crown, Search,
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
interface ProviderState { saved: boolean; testing: boolean; saving: boolean; result: { ok: boolean; msg: string } | null }

const SIMPLE_PROVIDERS = [
  {
    id: 'claude', emoji: '🤖', label: 'Claude (Anthropic)',
    desc: 'IA para buscar letras cuando otros fallan.',
    howto: 'Ve a console.anthropic.com → "API Keys" → "Create Key"',
    link: 'https://console.anthropic.com',
    fieldKey: 'ai_anthropic_key', placeholder: 'sk-ant-api03-...',
    color: 'border-orange-500/30 bg-orange-500/5',
    badge: 'text-orange-400',
  },
  {
    id: 'spotify', emoji: '🎵', label: 'Spotify',
    desc: 'Portada e info de canciones de Spotify.',
    howto: 'Ve a developer.spotify.com → "Create app" → copia Client ID y Client Secret',
    link: 'https://developer.spotify.com/dashboard',
    fieldKey: null,
    subFields: [
      { key: 'spotify_client_id', label: 'Client ID', placeholder: 'a1b2c3d4...' },
      { key: 'spotify_client_secret', label: 'Client Secret', placeholder: 'x9y8z7w6...' },
    ],
    color: 'border-green-500/30 bg-green-500/5',
    badge: 'text-spotify-green',
  },
  {
    id: 'perplexity', emoji: '🔍', label: 'Perplexity AI',
    desc: 'Búsqueda de letras adicional con IA.',
    howto: 'Ve a perplexity.ai/settings/api → "Generate" una clave',
    link: 'https://www.perplexity.ai/settings/api',
    fieldKey: 'ai_perplexity_key', placeholder: 'pplx-...',
    color: 'border-purple-500/30 bg-purple-500/5',
    badge: 'text-purple-400',
  },
]

function GeminiCard({ values, setValues }: { values: Record<string, string>; setValues: React.Dispatch<React.SetStateAction<Record<string, string>>> }) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [visible, setVisible] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const [models, setModels] = useState<string[]>([])
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [testing, setTesting] = useState(false)

  async function save() {
    setSaving(true); setSaved(false)
    await fetch('/api/admin/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ai_gemini_key: values['ai_gemini_key'] ?? '', ai_gemini_model: values['ai_gemini_model'] ?? '' }),
    })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function listModels() {
    setLoadingModels(true); setModels([]); setTestResult(null)
    const res = await fetch('/api/admin/test', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'gemini-models' }),
    })
    const data = await res.json()
    setLoadingModels(false)
    if (data.ok) setModels(data.models || [])
    else setTestResult({ ok: false, msg: data.error })
  }

  async function test() {
    setTesting(true); setTestResult(null)
    const res = await fetch('/api/admin/test', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'gemini' }),
    })
    const data = await res.json()
    setTesting(false)
    setTestResult({ ok: data.ok, msg: data.ok ? data.msg : data.error })
  }

  const hasKey = (values['ai_gemini_key'] ?? '').length > 3

  return (
    <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✨</span>
          <div>
            <h3 className="font-bold text-base text-blue-400">Gemini (Google)</h3>
            <p className="text-xs text-white/50 mt-0.5">Busca letras de canciones con IA de Google.</p>
          </div>
        </div>
        {hasKey && !testResult && (
          <span className="flex items-center gap-1 text-xs text-spotify-green shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" /> Clave guardada
          </span>
        )}
      </div>

      <div className="mb-3 p-3 rounded-lg bg-black/20 border border-white/5 text-xs text-white/50">
        <span className="text-white/70 font-medium">Dónde obtener la clave: </span>
        Ve a aistudio.google.com → crea un proyecto → &quot;Get API Key&quot;
        {' — '}
        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-spotify-green underline underline-offset-2 hover:text-white">
          Abrir sitio →
        </a>
      </div>

      <div className="space-y-2 mb-4">
        <div>
          <label className="block text-xs text-white/50 mb-1">API Key de Google AI Studio</label>
          <div className="relative">
            <input
              type={visible ? 'text' : 'password'}
              value={values['ai_gemini_key'] ?? ''}
              onChange={e => setValues(p => ({ ...p, ai_gemini_key: e.target.value }))}
              placeholder="AIzaSy..."
              className="w-full bg-black/30 text-white text-sm rounded-lg px-4 py-2.5 border border-white/10 focus:border-white/30 focus:outline-none pr-10 placeholder-white/20 font-mono"
            />
            <button type="button" onClick={() => setVisible(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70">
              {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1">Modelo a usar</label>
          <input
            value={values['ai_gemini_model'] ?? ''}
            onChange={e => setValues(p => ({ ...p, ai_gemini_model: e.target.value }))}
            placeholder="gemini-1.5-flash"
            className="w-full bg-black/30 text-white text-sm rounded-lg px-4 py-2.5 border border-white/10 focus:border-white/30 focus:outline-none placeholder-white/20 font-mono"
          />
        </div>
      </div>

      {/* Model chips */}
      {models.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-white/50 mb-2">Modelos disponibles — haz clic para seleccionar:</p>
          <div className="flex flex-wrap gap-1.5">
            {models.map(m => (
              <button key={m} onClick={() => setValues(p => ({ ...p, ai_gemini_model: m }))}
                className={`px-2.5 py-1 rounded-full text-xs font-mono transition-colors ${values['ai_gemini_model'] === m ? 'bg-blue-400 text-black font-bold' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
                {m}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-white text-black font-bold rounded-full text-sm hover:bg-white/90 active:scale-95 transition-all disabled:opacity-50">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {saving ? 'Guardando…' : 'Guardar'}
        </button>

        <button onClick={listModels} disabled={loadingModels || !hasKey}
          className="flex items-center gap-1.5 px-4 py-2 bg-white/10 text-white font-semibold rounded-full text-sm hover:bg-white/20 active:scale-95 transition-all disabled:opacity-40">
          {loadingModels ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          {loadingModels ? 'Buscando…' : 'Ver modelos disponibles'}
        </button>

        <button onClick={test} disabled={testing || !hasKey}
          className="flex items-center gap-1.5 px-4 py-2 bg-white/10 text-white font-semibold rounded-full text-sm hover:bg-white/20 active:scale-95 transition-all disabled:opacity-40">
          {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          {testing ? 'Probando…' : 'Probar'}
        </button>

        {saved && <span className="flex items-center gap-1 text-spotify-green text-sm"><CheckCircle2 className="w-4 h-4" /> Guardado</span>}
        {testResult && (
          <span className={`flex items-center gap-1 text-sm ${testResult.ok ? 'text-spotify-green' : 'text-red-400'}`}>
            {testResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {testResult.msg}
          </span>
        )}
      </div>
    </div>
  )
}

function OllamaCard({ values, setValues }: { values: Record<string, string>; setValues: React.Dispatch<React.SetStateAction<Record<string, string>>> }) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const [models, setModels] = useState<string[]>([])
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [testing, setTesting] = useState(false)

  async function save() {
    setSaving(true); setSaved(false)
    await fetch('/api/admin/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ai_ollama_host: values['ai_ollama_host'] ?? '', ai_ollama_model: values['ai_ollama_model'] ?? '' }),
    })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function listModels() {
    setLoadingModels(true); setModels([]); setTestResult(null)
    const res = await fetch('/api/admin/test', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'ollama-models' }),
    })
    const data = await res.json()
    setLoadingModels(false)
    if (data.ok) setModels(data.models || [])
    else setTestResult({ ok: false, msg: data.error })
  }

  async function test() {
    setTesting(true); setTestResult(null)
    const res = await fetch('/api/admin/test', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'ollama' }),
    })
    const data = await res.json()
    setTesting(false)
    setTestResult({ ok: data.ok, msg: data.ok ? data.msg : data.error })
    if (data.ok && data.models?.length) setModels(data.models)
  }

  return (
    <div className="rounded-xl border border-green-400/30 bg-green-400/5 p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🦙</span>
          <div>
            <h3 className="font-bold text-base text-green-400">Ollama (local)</h3>
            <p className="text-xs text-white/50 mt-0.5">IA gratuita que corre en tu propio PC.</p>
          </div>
        </div>
        {(values['ai_ollama_host'] || values['ai_ollama_model']) && !testResult && (
          <span className="flex items-center gap-1 text-xs text-spotify-green shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" /> Configurado
          </span>
        )}
      </div>

      <div className="mb-3 p-3 rounded-lg bg-black/20 border border-white/5 text-xs text-white/50">
        <span className="text-white/70 font-medium">Requisito: </span>
        Ollama debe estar corriendo en tu PC.{' '}
        <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" className="text-spotify-green underline underline-offset-2 hover:text-white">
          Descargar Ollama →
        </a>
        <span className="ml-2 text-yellow-400/70">⚠ Solo funciona cuando accedes desde tu computador (no desde el celular o enlace externo).</span>
      </div>

      <div className="space-y-2 mb-4">
        <div>
          <label className="block text-xs text-white/50 mb-1">URL del servidor Ollama</label>
          <input value={values['ai_ollama_host'] ?? 'http://localhost:11434'}
            onChange={e => setValues(p => ({ ...p, ai_ollama_host: e.target.value }))}
            className="w-full bg-black/30 text-white text-sm rounded-lg px-4 py-2.5 border border-white/10 focus:border-white/30 focus:outline-none placeholder-white/20 font-mono"
            placeholder="http://localhost:11434" />
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1">Modelo a usar</label>
          <input value={values['ai_ollama_model'] ?? ''}
            onChange={e => setValues(p => ({ ...p, ai_ollama_model: e.target.value }))}
            className="w-full bg-black/30 text-white text-sm rounded-lg px-4 py-2.5 border border-white/10 focus:border-white/30 focus:outline-none placeholder-white/20 font-mono"
            placeholder="llama3.2" />
        </div>
      </div>

      {/* Model chips */}
      {models.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-white/50 mb-2">Modelos instalados — haz clic para seleccionar:</p>
          <div className="flex flex-wrap gap-1.5">
            {models.map(m => (
              <button key={m} onClick={() => setValues(p => ({ ...p, ai_ollama_model: m }))}
                className={`px-2.5 py-1 rounded-full text-xs font-mono transition-colors ${values['ai_ollama_model'] === m ? 'bg-green-400 text-black font-bold' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
                {m}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-white text-black font-bold rounded-full text-sm hover:bg-white/90 active:scale-95 transition-all disabled:opacity-50">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {saving ? 'Guardando…' : 'Guardar'}
        </button>

        <button onClick={listModels} disabled={loadingModels}
          className="flex items-center gap-1.5 px-4 py-2 bg-white/10 text-white font-semibold rounded-full text-sm hover:bg-white/20 active:scale-95 transition-all disabled:opacity-40">
          {loadingModels ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          {loadingModels ? 'Buscando…' : 'Ver modelos disponibles'}
        </button>

        <button onClick={test} disabled={testing}
          className="flex items-center gap-1.5 px-4 py-2 bg-white/10 text-white font-semibold rounded-full text-sm hover:bg-white/20 active:scale-95 transition-all disabled:opacity-40">
          {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          {testing ? 'Probando…' : 'Probar'}
        </button>

        {saved && <span className="flex items-center gap-1 text-spotify-green text-sm"><CheckCircle2 className="w-4 h-4" /> Guardado</span>}
        {testResult && (
          <span className={`flex items-center gap-1 text-sm ${testResult.ok ? 'text-spotify-green' : 'text-red-400'}`}>
            {testResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {testResult.msg}
          </span>
        )}
      </div>
    </div>
  )
}

function AISettingsTab() {
  const [values, setValues] = useState<Record<string, string>>({})
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [states, setStates] = useState<Record<string, ProviderState>>({})

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(d => {
      setValues(d.settings ?? {})
      setLoading(false)
    })
  }, [])

  function setState(id: string, patch: Partial<ProviderState>) {
    setStates(prev => ({ ...prev, [id]: { ...{ saved: false, testing: false, saving: false, result: null }, ...prev[id], ...patch } }))
  }

  async function saveProvider(providerId: string, keys: string[]) {
    setState(providerId, { saving: true, result: null })
    const body: Record<string, string> = {}
    for (const k of keys) body[k] = values[k] ?? ''
    const res = await fetch('/api/admin/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      setState(providerId, { saving: false, saved: true })
      setTimeout(() => setState(providerId, { saved: false }), 3000)
    } else {
      setState(providerId, { saving: false, result: { ok: false, msg: 'Error al guardar' } })
    }
  }

  async function testProvider(providerId: string) {
    setState(providerId, { testing: true, result: null })
    const res = await fetch('/api/admin/test', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: providerId }),
    })
    const data = await res.json()
    setState(providerId, { testing: false, result: { ok: data.ok, msg: data.ok ? data.msg : data.error } })
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-spotify-green animate-spin" /></div>

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-spotify-light-gray">
        <p className="text-white font-semibold mb-1">¿Para qué sirve cada clave?</p>
        <p>Cada servicio necesita su propia clave para funcionar. Pega la clave, guarda y prueba. No se comparte con nadie — se guarda solo en tu base de datos.</p>
      </div>

      {SIMPLE_PROVIDERS.map(p => {
        const st = states[p.id] ?? { saved: false, testing: false, saving: false, result: null }
        const allKeys = p.fieldKey ? [p.fieldKey] : (p.subFields?.map(f => f.key) ?? [])
        const hasValue = allKeys.some(k => (values[k] ?? '').length > 3)

        return (
          <div key={p.id} className={`rounded-xl border p-5 ${p.color}`}>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{p.emoji}</span>
                <div>
                  <h3 className={`font-bold text-base ${p.badge}`}>{p.label}</h3>
                  <p className="text-xs text-white/50 mt-0.5">{p.desc}</p>
                </div>
              </div>
              {hasValue && !st.result && (
                <span className="flex items-center gap-1 text-xs text-spotify-green shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Clave guardada
                </span>
              )}
            </div>

            {/* How to get key */}
            <div className="mb-3 p-3 rounded-lg bg-black/20 border border-white/5 text-xs text-white/50">
              <span className="text-white/70 font-medium">Dónde obtener la clave: </span>{p.howto}
              {' — '}
              <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-spotify-green underline underline-offset-2 hover:text-white">
                Abrir sitio →
              </a>
            </div>

            {/* Fields */}
            <div className="space-y-2 mb-4">
              {p.fieldKey ? (
                <div className="relative">
                  <input
                    type={visible[p.fieldKey] ? 'text' : 'password'}
                    value={values[p.fieldKey] ?? ''}
                    onChange={e => setValues(prev => ({ ...prev, [p.fieldKey!]: e.target.value }))}
                    placeholder={p.placeholder}
                    className="w-full bg-black/30 text-white text-sm rounded-lg px-4 py-2.5 border border-white/10 focus:border-white/30 focus:outline-none pr-10 placeholder-white/20 font-mono"
                  />
                  <button type="button" onClick={() => setVisible(v => ({ ...v, [p.fieldKey!]: !v[p.fieldKey!] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70">
                    {visible[p.fieldKey] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              ) : (
                p.subFields?.map(sf => (
                  <div key={sf.key}>
                    <label className="block text-xs text-white/50 mb-1">{sf.label}</label>
                    <div className="relative">
                      <input
                        type={visible[sf.key] ? 'text' : 'password'}
                        value={values[sf.key] ?? ''}
                        onChange={e => setValues(prev => ({ ...prev, [sf.key]: e.target.value }))}
                        placeholder={sf.placeholder}
                        className="w-full bg-black/30 text-white text-sm rounded-lg px-4 py-2.5 border border-white/10 focus:border-white/30 focus:outline-none pr-10 placeholder-white/20 font-mono"
                      />
                      <button type="button" onClick={() => setVisible(v => ({ ...v, [sf.key]: !v[sf.key] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70">
                        {visible[sf.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Buttons + result */}
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => saveProvider(p.id, allKeys)} disabled={st.saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-white text-black font-bold rounded-full text-sm hover:bg-white/90 active:scale-95 transition-all disabled:opacity-50">
                {st.saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {st.saving ? 'Guardando…' : 'Guardar'}
              </button>

              <button onClick={() => testProvider(p.id)} disabled={st.testing || !hasValue}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/10 text-white font-semibold rounded-full text-sm hover:bg-white/20 active:scale-95 transition-all disabled:opacity-40">
                {st.testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                {st.testing ? 'Probando…' : 'Probar'}
              </button>

              {st.saved && (
                <span className="flex items-center gap-1 text-spotify-green text-sm"><CheckCircle2 className="w-4 h-4" /> Guardado</span>
              )}
              {st.result && (
                <span className={`flex items-center gap-1 text-sm ${st.result.ok ? 'text-spotify-green' : 'text-red-400'}`}>
                  {st.result.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {st.result.msg}
                </span>
              )}
            </div>
          </div>
        )
      })}

      <GeminiCard values={values} setValues={setValues} />
      <OllamaCard values={values} setValues={setValues} />
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
type AdminTab = 'ai' | 'users'

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState<AdminTab>('ai')

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
