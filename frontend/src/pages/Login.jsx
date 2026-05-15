import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

export default function Login() {
  const [email, setEmail] = useState('')
  const [pass, setPass]   = useState('')
  const [loading, setLoading] = useState(false)
  const setAuth = useAuthStore(s => s.setAuth)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await authApi.login({ email, password: pass })
      setAuth(data.access_token, data.user)
      navigate('/', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error de autenticación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 safe-top safe-bottom">
      {/* Background grid */}
      <div className="fixed inset-0 opacity-5 pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(#3b82f6 1px,transparent 1px),linear-gradient(90deg,#3b82f6 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="w-full max-w-sm relative animate-slide-up">
        {/* Logo area */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-bg-3 border border-border-hi mb-4">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="4" y="4" width="10" height="10" rx="2" fill="#3b82f6"/>
              <rect x="18" y="4" width="10" height="10" rx="2" fill="#3b82f6" opacity=".5"/>
              <rect x="4" y="18" width="10" height="10" rx="2" fill="#3b82f6" opacity=".5"/>
              <rect x="18" y="18" width="10" height="10" rx="2" fill="#3b82f6"/>
            </svg>
          </div>
          <h1 className="font-mono font-semibold text-xl text-text tracking-tight">INCIDENCIAS</h1>
          <p className="text-text-dim text-sm font-mono mt-1">Novation · Gestión técnica</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email" required autoComplete="email"
              className="input" placeholder="tecnico@metro.es"
              value={email} onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <input
              type="password" required autoComplete="current-password"
              className="input" placeholder="••••••••"
              value={pass} onChange={e => setPass(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
            {loading ? 'Accediendo…' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-text-muted text-xs font-mono mt-4">
          Sesión activa 30 días · Sin re-login frecuente
        </p>
      </div>
    </div>
  )
}
