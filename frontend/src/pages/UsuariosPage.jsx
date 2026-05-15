import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const ROLES = ['ADMIN', 'TECNICO', 'VIEWER']

export default function UsuariosPage() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editUser, setEditUser] = useState(null)

  async function load() {
    setLoading(true)
    try { setUsers(await api.get('/api/usuarios')) }
    catch(e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function toggleActivo(u) {
    try { await api.put(`/api/usuarios/${u.id}`, { activo: !u.activo }); load() }
    catch(e) { setErr(e.message) }
  }

  if (me?.rol !== 'ADMIN') return (
    <div className="page"><div className="alert alert-error">Acceso restringido a administradores</div></div>
  )

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Usuarios</div>
          <div className="page-subtitle">{users.length} registrados</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditUser(null); setShowForm(true) }}>
          + Nuevo
        </button>
      </div>

      {err && <div className="alert alert-error" style={{ marginBottom: 12 }}>{err}</div>}

      {loading ? <div className="loading-screen"><div className="spinner"/></div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {users.map(u => (
            <div key={u.id} className="card" style={{ opacity: u.activo ? 1 : 0.5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 8,
                  background: u.rol === 'ADMIN' ? 'var(--accent2)' : 'var(--bg4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-cond)', fontSize: 16, fontWeight: 800, color: 'var(--txt)',
                  flexShrink: 0,
                }}>
                  {u.nombre.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.nombre}</div>
                  <div style={{ fontSize: 11, color: 'var(--txt3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                </div>
                <span style={{
                  fontFamily: 'var(--font-cond)', fontSize: 10, fontWeight: 700,
                  letterSpacing: '.08em', textTransform: 'uppercase',
                  color: u.rol === 'ADMIN' ? 'var(--accent)' : u.rol === 'VIEWER' ? 'var(--txt3)' : 'var(--c-sol)',
                  border: '1px solid currentColor', borderRadius: 4, padding: '2px 6px',
                }}>{u.rol}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => { setEditUser(u); setShowForm(true) }}>
                  Editar
                </button>
                {u.id !== me.id && (
                  <button className={`btn btn-sm ${u.activo ? 'btn-danger' : 'btn-success'}`}
                    onClick={() => toggleActivo(u)}>
                    {u.activo ? 'Desactivar' : 'Activar'}
                  </button>
                )}
                {u.ultimo_login && (
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--txt3)', alignSelf: 'center' }}>
                    Último: {u.ultimo_login?.substring(0,10)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <UsuarioModal
          user={editUser}
          onClose={() => setShowForm(false)}
          onDone={() => { setShowForm(false); load() }}
        />
      )}
    </div>
  )
}

function UsuarioModal({ user, onClose, onDone }) {
  const [form, setForm] = useState({
    nombre: user?.nombre || '',
    email: user?.email || '',
    rol: user?.rol || 'TECNICO',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setErr('')
    try {
      const body = { nombre: form.nombre, email: form.email, rol: form.rol }
      if (form.password) body.password = form.password
      if (user) { await api.put(`/api/usuarios/${user.id}`, body) }
      else {
        if (!form.password) { setErr('La contraseña es obligatoria'); setLoading(false); return }
        await api.post('/api/usuarios', body)
      }
      onDone()
    } catch(e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{user ? 'Editar usuario' : 'Nuevo usuario'}</span>
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field"><label>Nombre *</label>
              <input value={form.nombre} onChange={e => set('nombre', e.target.value)} required />
            </div>
            <div className="field"><label>Email *</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
            </div>
            <div className="field"><label>Rol</label>
              <select value={form.rol} onChange={e => set('rol', e.target.value)}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="field">
              <label>{user ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}</label>
              <input type="password" value={form.password} onChange={e => set('password', e.target.value)}
                placeholder="••••••••" required={!user} />
            </div>
            {err && <div className="alert alert-error">{err}</div>}
            <button className="btn btn-primary btn-full" type="submit" disabled={loading} style={{ padding: 14 }}>
              {loading ? <span className="spinner" style={{ width: 18, height: 18, borderTopColor: '#fff' }}/> : user ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
