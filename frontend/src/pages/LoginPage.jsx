import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [email, setEmail]   = useState('')
  const [pass, setPass]     = useState('')
  const [err, setErr]       = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErr(''); setLoading(true)
    try {
      await login(email, pass)
      nav('/', { replace: true })
    } catch (e) {
      setErr(e.message || 'Email o contraseña incorrectos')
      setShake(true)
      setTimeout(() => setShake(false), 500)
    } finally {
      setLoading(false)
    }
  }

  const inputErr = {
    borderColor: 'var(--c-revisar)',
    boxShadow: '0 0 0 2px rgba(229,0,20,0.18)',
    background: 'rgba(229,0,20,0.05)',
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', background: 'var(--bg)',
    }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 56, height: 56, borderRadius: 12,
            background: 'var(--accent)', marginBottom: 16,
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <h1 style={{
            fontFamily: 'var(--font-cond)', fontSize: 26, fontWeight: 800,
            letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--txt)',
          }}>NOVATION</h1>
          <p style={{ fontSize: 12, color: 'var(--txt3)', marginTop: 4, fontFamily: 'var(--font-cond)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
            Sistema de incidencias
          </p>
        </div>

        <form onSubmit={handleSubmit}
          style={{
            display: 'flex', flexDirection: 'column', gap: 14,
            animation: shake ? 'shake .4s ease' : 'none',
          }}
        >
          <div className="field">
            <label style={{ color: err ? 'var(--c-revisar)' : undefined }}>Email</label>
            <input
              type="email" value={email} onChange={e => { setEmail(e.target.value); setErr('') }}
              placeholder="tecnico@metro.es" required autoComplete="email" autoFocus
              style={err ? inputErr : undefined}
            />
          </div>
          <div className="field">
            <label style={{ color: err ? 'var(--c-revisar)' : undefined }}>Contraseña</label>
            <input
              type="password" value={pass} onChange={e => { setPass(e.target.value); setErr('') }}
              placeholder="••••••••" required autoComplete="current-password"
              style={err ? inputErr : undefined}
            />
          </div>

          {err && (
            <div style={{
              background: 'rgba(229,0,20,0.1)',
              border: '1px solid rgba(229,0,20,0.35)',
              borderRadius: 'var(--radius)',
              padding: '10px 14px',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--c-revisar)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {err}
            </div>
          )}

          <button className="btn btn-primary btn-full" type="submit" disabled={loading}
            style={{ marginTop: 8, padding: '14px', fontSize: 16 }}>
            {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Entrar'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: 'var(--txt3)' }}>
          La sesión se mantiene 30 días
        </p>
      </div>
    </div>
  )
}