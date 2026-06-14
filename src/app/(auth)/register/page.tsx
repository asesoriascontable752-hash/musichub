'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Music2, Eye, EyeOff, UserPlus } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Error al registrarse')
      return
    }

    router.push('/login?registered=true')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-spotify-black relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-spotify-green/10 rounded-full blur-3xl animate-pulse-slow" />
      </div>

      <div className="relative w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-spotify-green rounded-full mb-4 shadow-lg shadow-spotify-green/30">
            <Music2 className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-3xl font-bold text-white">MusicHub</h1>
          <p className="text-spotify-light-gray mt-1">Crea tu cuenta gratis</p>
        </div>

        <div className="bg-spotify-dark rounded-2xl p-8 shadow-2xl border border-white/5">
          <h2 className="text-xl font-semibold text-white mb-6">Crear cuenta</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-spotify-light-gray mb-1.5">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Tu nombre"
                required
                minLength={2}
                className="w-full px-4 py-3 bg-spotify-gray text-white rounded-lg border border-white/10 focus:border-spotify-green focus:outline-none focus:ring-1 focus:ring-spotify-green placeholder-spotify-light-gray/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-spotify-light-gray mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="w-full px-4 py-3 bg-spotify-gray text-white rounded-lg border border-white/10 focus:border-spotify-green focus:outline-none focus:ring-1 focus:ring-spotify-green placeholder-spotify-light-gray/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-spotify-light-gray mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  className="w-full px-4 py-3 bg-spotify-gray text-white rounded-lg border border-white/10 focus:border-spotify-green focus:outline-none focus:ring-1 focus:ring-spotify-green placeholder-spotify-light-gray/50 transition-colors pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-spotify-light-gray hover:text-white transition-colors"
                >
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-spotify-green text-black font-bold rounded-full hover:bg-spotify-green/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Crear cuenta
                </>
              )}
            </button>
          </form>

          <p className="text-center text-spotify-light-gray text-sm mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-white font-semibold hover:text-spotify-green transition-colors">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
