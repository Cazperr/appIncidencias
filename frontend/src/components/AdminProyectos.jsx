import { useEffect, useState } from 'react'
import { api } from '../lib/api'

const TIPOS = ['metro', 'generico']
const ROLES = ['ADMIN', 'TECNICO', 'VIEWER']

export default function AdminProyectos() {
  const [tab, setTab] = useState('proyectos')

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Panel de administración</div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {[['proyectos', 'Proyectos'], ['usuarios', 'Usuarios']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              background: 'none', border: 'none', padding: '10px 18px',
              fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600,
              letterSpacing: '.06em', textTransform: 'uppercase',
              color: tab === key ? 'var(--accent)' : 'var(--txt2)',
              borderBottom: `2px solid ${tab === key ? 'var(--accent)' : 'transparent'}`,
              marginBottom: -1, cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'proyectos' ? <TabProyectos /> : <TabUsuarios />}
    </div>
  )
}

// ── TAB PROYECTOS ──────────────────────────────────────────────────────────────

function TabProyectos() {
  const [proyectos, setProyectos] = useState([])
  const [loading, setLoading]     = useState(true)
  const [err, setErr]             = useState('')
  const [showForm, setShowForm]   = useState(false)
  const [editP, setEditP]         = useState(null)

  async function load() {
    setLoading(true)
    try { setProyectos(await api.get('/api/proyectos')) }
    catch(e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function toggleActivo(p) {
    try { await api.delete(`/api/proyectos/${p.id}`); load() }
    catch(e) { setErr(e.message) }
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditP(null); setShowForm(true) }}>+ Nuevo proyecto</button>
      </div>

      {err && <div className="alert alert-error" style={{ marginBottom: 12 }}>{err}</div>}

      {loading ? <div className="loading-screen"><div className="spinner"/></div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {proyectos.map(p => (
            <div key={p.id} className="card" style={{ opacity: p.activo ? 1 : 0.5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 8, background: 'var(--accent)', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: '#fff',
                }}>
                  {p.initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--txt)' }}>{p.nombre}</div>
                  <div style={{ fontSize: 11, color: 'var(--txt2)', marginTop: 2 }}>
                    {p.id} · <span style={{ color: p.tipo === 'metro' ? 'var(--accent)' : 'var(--c-sol)' }}>{p.tipo}</span>
                  </div>
                  {p.descripcion && <div style={{ fontSize: 12, color: 'var(--txt3)', marginTop: 2 }}>{p.descripcion}</div>}
                </div>
                <span style={{
                  fontSize: 10, fontFamily: 'var(--font-mono)',
                  color: p.activo ? 'var(--c-sol)' : 'var(--txt3)',
                  border: '1px solid currentColor', borderRadius: 4, padding: '2px 6px',
                }}>
                  {p.activo ? 'ACTIVO' : 'INACTIVO'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => { setEditP(p); setShowForm(true) }}>Editar</button>
                <button className={`btn btn-sm ${p.activo ? 'btn-danger' : 'btn-success'}`} onClick={() => toggleActivo(p)}>
                  {p.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <ProyectoModal proyecto={editP} onClose={() => setShowForm(false)} onDone={() => { setShowForm(false); load() }} />
      )}
    </>
  )
}

// ── TAB USUARIOS ───────────────────────────────────────────────────────────────

function TabUsuarios() {
  const [users, setUsers]         = useState([])
  const [proyectos, setProyectos] = useState([])
  const [loading, setLoading]     = useState(true)
  const [err, setErr]             = useState('')
  const [showForm, setShowForm]   = useState(false)
  const [editUser, setEditUser]   = useState(null)
  const [expanded, setExpanded]   = useState(null)

  async function load() {
    setLoading(true)
    try {
      const [us, ps] = await Promise.all([api.get('/api/usuarios'), api.get('/api/proyectos')])
      setUsers(us); setProyectos(ps)
    } catch(e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function toggleActivo(u) {
    try { await api.put(`/api/usuarios/${u.id}`, { activo: !u.activo }); load() }
    catch(e) { setErr(e.message) }
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditUser(null); setShowForm(true) }}>+ Nuevo usuario</button>
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
                  fontSize: 16, fontWeight: 700, color: 'var(--txt)', flexShrink: 0,
                }}>
                  {u.nombre.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--txt)' }}>{u.nombre}</div>
                  <div style={{ fontSize: 11, color: 'var(--txt2)' }}>
                    {u.username && <span style={{ color: 'var(--accent2)', marginRight: 6 }}>@{u.username}</span>}
                    {u.email}
                  </div>
                </div>
                <span style={{
                  fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700,
                  color: u.rol === 'ADMIN' ? 'var(--accent)' : u.rol === 'VIEWER' ? 'var(--txt2)' : 'var(--c-sol)',
                  border: '1px solid currentColor', borderRadius: 4, padding: '2px 6px',
                }}>{u.rol}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => { setEditUser(u); setShowForm(true) }}>Editar</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(expanded === u.id ? null : u.id)}>
                  {expanded === u.id ? 'Ocultar proyectos' : 'Proyectos'}
                </button>
                <button className={`btn btn-sm ${u.activo ? 'btn-danger' : 'btn-success'}`} onClick={() => toggleActivo(u)}>
                  {u.activo ? 'Desactivar' : 'Activar'}
                </button>
                {u.ultimo_login && (
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--txt2)', alignSelf: 'center' }}>
                    Último: {u.ultimo_login?.substring(0,10)}
                  </span>
                )}
              </div>
              {expanded === u.id && <ProyectosUsuario userId={u.id} proyectos={proyectos} />}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <UsuarioModal user={editUser} onClose={() => setShowForm(false)} onDone={() => { setShowForm(false); load() }} />
      )}
    </>
  )
}

// ── PROYECTOS DE UN USUARIO ────────────────────────────────────────────────────

function ProyectosUsuario({ userId, proyectos }) {
  const [asignados, setAsignados] = useState([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(null)
  const [err, setErr]             = useState('')

  async function load() {
    try {
      const results = await Promise.all(
        proyectos.map(p =>
          api.get(`/api/proyectos/${p.id}/usuarios`)
            .then(users => {
              const u = users.find(u => u.id === userId)
              return u ? { ...p, rol: u.rol } : null
            })
            .catch(() => null)
        )
      )
      setAsignados(results.filter(Boolean))
    } catch(e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [userId])

  async function asignar(proyectoId, rol) {
    setSaving(proyectoId)
    try { await api.post(`/api/proyectos/${proyectoId}/usuarios`, { usuario_id: userId, rol }); await load() }
    catch(e) { setErr(e.message) }
    finally { setSaving(null) }
  }

  async function desasignar(proyectoId) {
    setSaving(proyectoId)
    try { await api.delete(`/api/proyectos/${proyectoId}/usuarios/${userId}`); await load() }
    catch(e) { setErr(e.message) }
    finally { setSaving(null) }
  }

  const asignadoIds = new Set(asignados.map(p => p.id))

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
      <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--txt2)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>
        Proyectos asignados
      </div>
      {err && <div className="alert alert-error" style={{ marginBottom: 8, fontSize: 12 }}>{err}</div>}
      {loading ? <div className="spinner" style={{ width: 16, height: 16 }} /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {proyectos.map(p => {
            const asig = asignados.find(a => a.id === p.id)
            const isSaving = saving === p.id
            return (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                background: asig ? 'color-mix(in srgb, var(--accent) 6%, transparent)' : 'var(--bg3)',
                borderRadius: 'var(--radius)',
                border: `1px solid ${asig ? 'color-mix(in srgb, var(--accent) 20%, transparent)' : 'var(--border)'}`,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: asig ? 'var(--accent)' : 'var(--bg4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
                  color: asig ? '#fff' : 'var(--txt2)', flexShrink: 0,
                }}>{p.initials}</div>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>{p.nombre}</div>
                {asig ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <select value={asig.rol} onChange={e => asignar(p.id, e.target.value)} disabled={isSaving}
                      style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 4, color: 'var(--txt)', fontSize: 11, padding: '3px 6px' }}>
                      {ROLES.map(r => <option key={r}>{r}</option>)}
                    </select>
                    <button className="btn btn-danger btn-sm" onClick={() => desasignar(p.id)} disabled={isSaving}
                      style={{ fontSize: 11, padding: '4px 8px' }}>Quitar</button>
                  </div>
                ) : (
                  <button className="btn btn-ghost btn-sm" onClick={() => asignar(p.id, 'TECNICO')} disabled={isSaving}
                    style={{ fontSize: 11 }}>
                    {isSaving ? <span className="spinner" style={{ width: 12, height: 12 }}/> : '+ Asignar'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── MODALES ────────────────────────────────────────────────────────────────────

function ProyectoModal({ proyecto, onClose, onDone }) {
  const [form, setForm] = useState({
    id: proyecto?.id || '', nombre: proyecto?.nombre || '',
    descripcion: proyecto?.descripcion || '', initials: proyecto?.initials || '',
    tipo: proyecto?.tipo || 'generico', db_url: proyecto?.db_url || '', db_token: '',
  })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true); setErr('')
    try {
      if (proyecto) await api.put(`/api/proyectos/${proyecto.id}`, form)
      else await api.post('/api/proyectos', form)
      onDone()
    } catch(e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{proyecto ? 'Editar proyecto' : 'Nuevo proyecto'}</span>
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-grid" style={{ gap: 14 }}>
            <div className="field"><label>ID único *</label>
              <input value={form.id} onChange={e => set('id', e.target.value)} required placeholder="metro-madrid" disabled={!!proyecto} />
            </div>
            <div className="field"><label>Nombre *</label>
              <input value={form.nombre} onChange={e => set('nombre', e.target.value)} required placeholder="Metro de Madrid" />
            </div>
            <div className="field"><label>Iniciales *</label>
              <input value={form.initials} onChange={e => set('initials', e.target.value)} required placeholder="MM" maxLength={4} />
            </div>
            <div className="field"><label>Tipo</label>
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                {TIPOS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="field"><label>Descripción</label>
              <input value={form.descripcion} onChange={e => set('descripcion', e.target.value)} placeholder="Descripción del proyecto" />
            </div>
            <div className="field"><label>URL de BD (Turso) *</label>
              <input value={form.db_url} onChange={e => set('db_url', e.target.value)} required placeholder="libsql://nombre.turso.io" />
            </div>
            <div className="field"><label>Token de BD</label>
              <input value={form.db_token} onChange={e => set('db_token', e.target.value)} placeholder="Token Turso" type="password" />
            </div>
            {err && <div className="alert alert-error">{err}</div>}
            <button className="btn btn-primary btn-full" type="submit" disabled={loading} style={{ padding: 14 }}>
              {loading ? <span className="spinner" style={{ width: 18, height: 18, borderTopColor: '#fff' }}/> : proyecto ? 'Guardar cambios' : 'Crear proyecto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function UsuarioModal({ user, onClose, onDone }) {
  const [form, setForm] = useState({
    nombre: user?.nombre || '', username: user?.username || '',
    email: user?.email || '', rol: user?.rol || 'TECNICO', password: '',
  })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true); setErr('')
    try {
      const body = { nombre: form.nombre, username: form.username || null, email: form.email, rol: form.rol }
      if (form.password) body.password = form.password
      if (user) await api.put(`/api/usuarios/${user.id}`, body)
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
          <div className="form-grid" style={{ gap: 14 }}>
            <div className="field"><label>Nombre completo *</label>
              <input value={form.nombre} onChange={e => set('nombre', e.target.value)} required />
            </div>
            <div className="field"><label>Username</label>
              <input value={form.username} onChange={e => set('username', e.target.value)} placeholder="login rápido" />
            </div>
            <div className="field"><label>Email *</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
            </div>
            <div className="field"><label>Rol</label>
              <select value={form.rol} onChange={e => set('rol', e.target.value)}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="field"><label>{user ? 'Nueva contraseña (vacío = no cambiar)' : 'Contraseña *'}</label>
              <input type="password" value={form.password} onChange={e => set('password', e.target.value)} required={!user} />
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