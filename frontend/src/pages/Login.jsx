import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

export default function Login() {
  const [email, setEmail]     = useState('')
  const [pass, setPass]       = useState('')
  const [loading, setLoading] = useState(false)
  const setAuth  = useAuthStore(s => s.setAuth)
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
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
    }}>
      {/* subtle grid bg */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', opacity: .04,
        backgroundImage: 'linear-gradient(var(--border3) 1px,transparent 1px),linear-gradient(90deg,var(--border3) 1px,transparent 1px)',
        backgroundSize: '48px 48px',
      }} />

      <div style={{ width: '100%', maxWidth: 360, position: 'relative', animation: 'fade-in .22s ease' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 52, height: 52, borderRadius: 12,
            background: 'var(--accent)', marginBottom: 16,
          }}>
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
              <path d="M3 3V25H10V14L18 25H25V3H18V14L10 3H3Z" fill="white"/>
            </svg>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 600, letterSpacing: '.12em', color: 'var(--txt)' }}>
            NOVATION
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--txt3)', marginTop: 4, letterSpacing: '.06em' }}>
            Sistema de incidencias
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border2)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px 22px',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="tecnico@metro.es"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Contraseña</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={pass}
                onChange={e => setPass(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
              style={{ marginTop: 4, padding: '12px', fontSize: 14, letterSpacing: '.03em' }}
            >
              {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Accediendo…</> : 'Entrar'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--txt3)' }}>
          Sesión activa 30 días
        </div>
      </div>
    </div>
  )
}
