'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Music2, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) setError('Enlace inválido. Solicita uno nuevo.')
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Error al restablecer la contraseña')
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/login'), 3000)
  }

  return (
    <div className="bg-spotify-dark rounded-2xl p-8 shadow-2xl border border-white/5">
      {success ? (
        <div className="text-center py-4">
          <CheckCircle className="w-16 h-16 text-spotify-green mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-3">¡Contraseña actualizada!</h2>
          <p className="text-spotify-light-gray text-sm">
            Tu contraseña fue restablecida con éxito. Redirigiendo al inicio de sesión...
          </p>
        </div>
      ) : error && !token ? (
        <div className="text-center py-4">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-3">Enlace inválido</h2>
          <p className="text-spotify-light-gray text-sm mb-6">{error}</p>
          <Link
            href="/forgot-password"
            className="inline-block bg-spotify-green text-black font-bold px-6 py-3 rounded-full hover:bg-spotify-green/90 transition-all"
          >
            Solicitar nuevo enlace
          </Link>
        </div>
      ) : (
        <>
          <h2 className="text-xl font-semibold text-white mb-2">Nueva contraseña</h2>
          <p className="text-spotify-light-gray text-sm mb-6">Elige una contraseña segura para tu cuenta.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-spotify-light-gray mb-1.5">Nueva contraseña</label>
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

            <div>
              <label className="block text-sm font-medium text-spotify-light-gray mb-1.5">Confirmar contraseña</label>
              <input
                type={showPass ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repite la contraseña"
                required
                minLength={6}
                className="w-full px-4 py-3 bg-spotify-gray text-white rounded-lg border border-white/10 focus:border-spotify-green focus:outline-none focus:ring-1 focus:ring-spotify-green placeholder-spotify-light-gray/50 transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full py-3 bg-spotify-green text-black font-bold rounded-full hover:bg-spotify-green/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                'Restablecer contraseña'
              )}
            </button>
          </form>
        </>
      )}
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-spotify-black relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-spotify-green/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse-slow" />
      </div>

      <div className="relative w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-spotify-green rounded-full mb-4 shadow-lg shadow-spotify-green/30">
            <Music2 className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-3xl font-bold text-white">MusicHub</h1>
          <p className="text-spotify-light-gray mt-1">Restablecer contraseña</p>
        </div>

        <Suspense fallback={<div className="bg-spotify-dark rounded-2xl p-8 text-center text-spotify-light-gray">Cargando...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
