'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  Music2, Home, Search, Library, LogOut, Plus, User,
  Settings, Heart, Tag, Mic, Star, Bookmark, Trash2, Edit2, Check, X
} from 'lucide-react'
import VoiceRecorder from '@/components/VoiceRecorder'

interface Label {
  id: string
  name: string
  color: string
  icon: string
  songs: { songId: string }[]
}

const ICON_MAP: Record<string, React.ReactNode> = {
  heart:    <Heart className="w-3.5 h-3.5 fill-current" />,
  tag:      <Tag className="w-3.5 h-3.5" />,
  mic:      <Mic className="w-3.5 h-3.5" />,
  star:     <Star className="w-3.5 h-3.5 fill-current" />,
  bookmark: <Bookmark className="w-3.5 h-3.5" />,
}

interface SidebarProps {
  onAddSong: () => void
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ onAddSong, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.role === 'admin'

  const [labels, setLabels] = useState<Label[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [showRecorder, setShowRecorder] = useState(false)

  useEffect(() => {
    fetch('/api/labels').then(r => r.json()).then(d => setLabels(d.labels || []))

    function onLabelChange() {
      fetch('/api/labels').then(r => r.json()).then(d => setLabels(d.labels || []))
    }
    window.addEventListener('label-changed', onLabelChange)
    return () => window.removeEventListener('label-changed', onLabelChange)
  }, [])

  async function createLabel() {
    if (!newName.trim()) return
    const res = await fetch('/api/labels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), icon: 'tag', color: '#1DB954' }),
    })
    const data = await res.json()
    if (data.label) {
      setLabels(prev => [...prev, data.label])
      setNewName('')
      setCreating(false)
    }
  }

  async function renameLabel(id: string) {
    if (!editName.trim()) return
    const res = await fetch(`/api/labels/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim() }),
    })
    const data = await res.json()
    if (data.label) {
      setLabels(prev => prev.map(l => l.id === id ? data.label : l))
      setEditingId(null)
    }
  }

  async function deleteLabel(id: string) {
    await fetch(`/api/labels/${id}`, { method: 'DELETE' })
    setLabels(prev => prev.filter(l => l.id !== id))
    if (pathname.includes('?')) router.push('/dashboard')
  }

  function navigateToLabel(id: string) {
    router.push(`/dashboard?label=${id}`)
    onClose?.()
  }

  const activeLabelId = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('label')
    : null

  return (
    <>
    <aside className={`
      w-64 bg-spotify-black flex flex-col flex-shrink-0
      fixed md:static inset-y-0 left-0 z-50 h-full
      transition-transform duration-300 ease-in-out
      ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
    `}>
      {/* Logo */}
      <div className="p-6 pb-4 flex items-center justify-between">
        <Link href="/dashboard" onClick={onClose} className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-spotify-green rounded-full flex items-center justify-center shadow-lg shadow-spotify-green/20 group-hover:shadow-spotify-green/40 transition-shadow">
            <Music2 className="w-5 h-5 text-black" />
          </div>
          <span className="text-xl font-bold text-white">MusicHub</span>
        </Link>
        <button
          onClick={onClose}
          className="md:hidden text-white/40 hover:text-white transition-colors p-1"
          aria-label="Cerrar menú"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="px-3">
        <NavItem href="/dashboard" icon={<Home className="w-5 h-5" />} label="Inicio" active={pathname === '/dashboard' && !activeLabelId} onClick={onClose} />
        <NavItem href="/dashboard/search" icon={<Search className="w-5 h-5" />} label="Buscar" active={pathname === '/dashboard/search'} onClick={onClose} />
        <NavItem href="/dashboard/library" icon={<Library className="w-5 h-5" />} label="Tu biblioteca" active={pathname === '/dashboard/library'} onClick={onClose} />
        {isAdmin && (
          <NavItem href="/dashboard/admin" icon={<Settings className="w-5 h-5" />} label="Admin IA" active={pathname === '/dashboard/admin'} highlight onClick={onClose} />
        )}
      </nav>

      <div className="mx-3 my-4 h-px bg-white/10" />

      {/* Labels section */}
      <div className="px-5 flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-spotify-light-gray uppercase tracking-wider">Etiquetas</span>
        <div className="flex gap-1">
          <button onClick={() => { setCreating(true); setNewName('') }}
            className="w-6 h-6 rounded-full flex items-center justify-center text-spotify-light-gray hover:text-white hover:bg-white/10 transition-colors"
            title="Nueva etiqueta">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* New label input */}
      {creating && (
        <div className="px-3 mb-2 flex gap-1">
          <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') createLabel(); if (e.key === 'Escape') setCreating(false) }}
            placeholder="Nombre de etiqueta"
            className="flex-1 px-2.5 py-1.5 bg-white/10 text-white text-xs rounded-md border border-white/20 focus:border-spotify-green focus:outline-none placeholder-white/30" />
          <button onClick={createLabel} className="text-spotify-green hover:text-white transition-colors p-1"><Check className="w-3.5 h-3.5" /></button>
          <button onClick={() => setCreating(false)} className="text-white/30 hover:text-white transition-colors p-1"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Label list */}
      <div className="flex-1 overflow-y-auto px-3 space-y-0.5">
        {/* "Todos" button */}
        <button onClick={() => { router.push('/dashboard'); onClose?.() }}
          className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors flex items-center gap-2 ${!activeLabelId && pathname === '/dashboard' ? 'text-white bg-white/10' : 'text-spotify-light-gray hover:text-white hover:bg-white/5'}`}>
          <Library className="w-3.5 h-3.5" /> Todas las canciones
        </button>

        {labels.map(label => (
          <div key={label.id} className="group relative">
            {editingId === label.id ? (
              <div className="flex gap-1 px-1 py-0.5">
                <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') renameLabel(label.id); if (e.key === 'Escape') setEditingId(null) }}
                  className="flex-1 px-2 py-1 bg-white/10 text-white text-xs rounded border border-white/20 focus:border-spotify-green focus:outline-none" />
                <button onClick={() => renameLabel(label.id)} className="text-spotify-green p-1"><Check className="w-3 h-3" /></button>
                <button onClick={() => setEditingId(null)} className="text-white/30 p-1"><X className="w-3 h-3" /></button>
              </div>
            ) : (
              <button onClick={() => navigateToLabel(label.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors flex items-center gap-2 ${activeLabelId === label.id ? 'text-white bg-white/10' : 'text-spotify-light-gray hover:text-white hover:bg-white/5'}`}>
                <span style={{ color: label.color }}>{ICON_MAP[label.icon] || <Tag className="w-3.5 h-3.5" />}</span>
                <span className="flex-1 truncate">{label.name}</span>
                <span className="text-white/30 text-[10px]">{label.songs.length}</span>
              </button>
            )}
            {/* Hover actions */}
            {editingId !== label.id && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-0.5 bg-spotify-black rounded">
                <button onClick={e => { e.stopPropagation(); setEditingId(label.id); setEditName(label.name) }}
                  className="p-1 text-white/30 hover:text-white transition-colors"><Edit2 className="w-2.5 h-2.5" /></button>
                <button onClick={e => { e.stopPropagation(); deleteLabel(label.id) }}
                  className="p-1 text-white/30 hover:text-red-400 transition-colors"><Trash2 className="w-2.5 h-2.5" /></button>
              </div>
            )}
          </div>
        ))}

        {labels.length === 0 && !creating && (
          <p className="text-xs text-white/20 px-3 py-2">Sin etiquetas aún</p>
        )}

        <div className="h-2" />

        <div className="border-t border-white/5 mt-2 pt-3 space-y-0.5">
          {/* Add music button */}
          <button onClick={onAddSong}
            className="w-full text-left px-3 py-2.5 rounded-md text-spotify-light-gray hover:text-white hover:bg-white/5 transition-colors text-sm flex items-center gap-3">
            <div className="w-8 h-8 bg-spotify-gray rounded-sm flex items-center justify-center flex-shrink-0">
              <Plus className="w-4 h-4" />
            </div>
            Agregar música
          </button>

          {/* Voice recorder button */}
          <button onClick={() => { setShowRecorder(true); onClose?.() }}
            className="w-full text-left px-3 py-2.5 rounded-md text-spotify-light-gray hover:text-white hover:bg-white/5 transition-colors text-sm flex items-center gap-3">
            <div className="w-8 h-8 bg-red-500/20 rounded-sm flex items-center justify-center flex-shrink-0">
              <Mic className="w-4 h-4 text-red-400" />
            </div>
            Grabar audio
          </button>
        </div>
      </div>

      {/* User */}
      <div className="p-3 border-t border-white/5">
        <div className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-white/5 transition-colors group">
          <div className="w-8 h-8 bg-spotify-green rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-black" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{session?.user?.name || 'Usuario'}</p>
            <p className="text-xs text-spotify-light-gray truncate">{session?.user?.email}</p>
          </div>
          <button onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-spotify-light-gray hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100" title="Cerrar sesión">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>

    {/* Voice recorder modal */}
    {showRecorder && (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
        <div className="bg-spotify-dark rounded-2xl w-full max-w-sm shadow-2xl border border-white/10 overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-5 pb-4">
            <div className="flex items-center gap-2">
              <Mic className="w-5 h-5 text-red-400" />
              <h2 className="text-base font-bold text-white">Grabar audio</h2>
            </div>
            <button onClick={() => setShowRecorder(false)} className="text-spotify-light-gray hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="px-6 pb-6">
            <VoiceRecorder onSaved={() => setShowRecorder(false)} />
          </div>
        </div>
      </div>
    )}
    </>
  )
}

function NavItem({ href, icon, label, active, highlight, onClick }: {
  href: string; icon: React.ReactNode; label: string; active: boolean; highlight?: boolean; onClick?: () => void
}) {
  return (
    <Link href={href} onClick={onClick}
      className={`flex items-center gap-4 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
        active ? 'text-white bg-white/10'
        : highlight ? 'text-spotify-green hover:text-spotify-green hover:bg-spotify-green/10'
        : 'text-spotify-light-gray hover:text-white hover:bg-white/5'
      }`}>
      {icon}{label}
    </Link>
  )
}
