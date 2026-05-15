import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { api } from '../lib/api'

export default function PerfilPage() {
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const nav = useNavigate()
  const [pwForm, setPwForm] = useState({ password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]   = useState('')
  const [err, setErr]   = useState('')

  async function handleLogout() { await logout(); nav('/login', { replace: true }) }

  async function handleChangePassword(e) {
    e.preventDefault()
    if (pwForm.password !== pwForm.confirm) { setErr('Las contrasenas no coinciden'); return }
    if (pwForm.password.length < 6) { setErr('Minimo 6 caracteres'); return }
    setLoading(true); setErr(''); setMsg('')
    try {
      await api.put(`/api/usuarios/${user.id}`, { password: pwForm.password })
      setMsg('Contrasena actualizada'); setPwForm({ password: '', confirm: '' })
    } catch(e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  const ROL_COLOR = { ADMIN: 'var(--accent)', TECNICO: 'var(--c-sol)', VIEWER: 'var(--txt3)' }

  return (
    <div className="page">
      <div className="page-title" style={{ marginBottom: 20 }}>Perfil</div>

      {/* Info usuario */}
      <div className="card" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: 12, background: 'var(--accent2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-cond)', fontSize: 24, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
          {user?.nombre?.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{user?.nombre}</div>
          <div style={{ fontSize: 12, color: 'var(--txt3)', marginTop: 2 }}>{user?.email}</div>
          <div style={{ marginTop: 6 }}>
            <span style={{ fontFamily: 'var(--font-cond)', fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: ROL_COLOR[user?.rol] || 'var(--txt3)', border: '1px solid currentColor', borderRadius: 4, padding: '2px 8px' }}>{user?.rol}</span>
          </div>
        </div>
      </div>


      {/* Toggle tema */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-cond)', fontSize: 14, fontWeight: 700 }}>
              {dark ? 'Modo noche' : 'Modo dia'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--txt3)', marginTop: 2 }}>
              {dark ? 'Cambia a modo claro' : 'Cambia a modo oscuro'}
            </div>
          </div>
          <div className="toggle-wrap" style={{ cursor: 'pointer' }} onClick={toggle}>
            <span className="toggle">
              <input type="checkbox" checked={!dark} readOnly />
              <span className="toggle-slider"/>
            </span>
          </div>
        </div>
      </div>

      {/* Cambiar contrasena */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: 'var(--font-cond)', fontSize: 13, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--txt2)', marginBottom: 14 }}>
          Cambiar contrasena
        </div>
        <form onSubmit={handleChangePassword}>
          <div className="form-grid">
            <div className="field">
              <label>Nueva contrasena</label>
              <input type="password" value={pwForm.password} placeholder="••••••••"
                onChange={e => setPwForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div className="field">
              <label>Confirmar contrasena</label>
              <input type="password" value={pwForm.confirm} placeholder="••••••••"
                onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} />
            </div>
            {err && <div className="alert alert-error">{err}</div>}
            {msg && <div className="alert alert-success">{msg}</div>}
            <button className="btn btn-ghost btn-full" type="submit" disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 16, height: 16 }}/> : 'Actualizar contrasena'}
            </button>
          </div>
        </form>
      </div>

      <button className="btn btn-danger btn-full" onClick={handleLogout} style={{ padding: 14 }}>
        Cerrar sesion
      </button>
    </div>
  )
}