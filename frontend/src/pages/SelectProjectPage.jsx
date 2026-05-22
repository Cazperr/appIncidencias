import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { api, setToken } from '../lib/api'
import DashboardComparativa from '../components/DashboardComparativa'

export default function SelectProjectPage() {
  const { user, logout, setProject } = useAuth()
  const { dark, toggle } = useTheme()
  const nav = useNavigate()
  const [projects, setProjects]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [active, setActive]           = useState(null)
  const [selecting, setSelecting]     = useState(false)
  const [error, setError]             = useState('')

  useEffect(() => {
    api.get('/api/auth/mis-proyectos')
      .then(data => {
        setProjects(data)
        if (data.length > 0) setActive(data[0])
      })
      .catch(() => setError('Error cargando proyectos'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSelect(project) {
    setSelecting(true)
    try {
      const data = await api.post('/api/auth/select-project', { proyecto_id: project.id })
      localStorage.setItem('metro_token', data.access_token)
      setToken(data.access_token)
      setProject({ ...data.proyecto, stats: project.stats || {} })
      nav('/', { replace: true })
    } catch {
      setError('Error al seleccionar proyecto')
      setSelecting(false)
    }
  }

  function handleComparativaSelect(p) {
    const found = projects.find(x => x.id === p.id)
    if (found) setActive(found)
  }

  const s = active?.stats || { total: '—', pendientes: '—', resueltas: '—', criticas: '—' }
  const pct = s.total && s.resueltas && s.total !== '—'
    ? Math.round((s.resueltas / s.total) * 100) : 0

  return (
    <div className="select-project-page">
      <header className="select-project-topbar">
        <span className="select-project-brand">NOVATION</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--txt3)', fontFamily: 'var(--font-mono)' }}>
            {user?.nombre}
          </span>
          <button type="button" onClick={toggle} style={{
            background: 'none', border: 'none', padding: 6,
            cursor: 'pointer', color: 'var(--txt)', opacity: 0.7,
          }}>
            {dark ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="4"/>
                <line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>
                <line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/>
                <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
                <line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
          <button type="button" onClick={logout} className="btn btn-ghost btn-sm">Salir</button>
        </div>
      </header>

      <div className="select-project-body">
        <aside className="select-project-sidebar">
          <div className="select-project-sidebar-label">Proyectos</div>

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
              <div className="spinner" />
            </div>
          )}

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 10 }}>{error}</div>
          )}

          <div className="select-project-list">
            {projects.map(p => {
              const isActive = active?.id === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActive(p)}
                  className={`select-project-item${isActive ? ' select-project-item--active' : ''}`}
                >
                  <span className={`select-project-avatar${isActive ? ' select-project-avatar--active' : ''}`}>
                    {p.initials}
                  </span>
                  <span className="select-project-item-text">
                    <span className="select-project-item-name">{p.nombre}</span>
                    <span className="select-project-item-rol">{p.rol}</span>
                  </span>
                </button>
              )
            })}
          </div>

          {active && (
            <div className="select-project-panel">
              <div className="select-project-panel-label">Entrar a</div>
              <div className="select-project-panel-name">{active.nombre}</div>

              <div className="select-project-mini-stats">
                {[
                  { label: 'Total', val: s.total },
                  { label: 'Pend.', val: s.pendientes },
                  { label: 'Res.', val: s.resueltas },
                ].map(st => (
                  <div key={st.label} className="select-project-mini-stat">
                    <div className="select-project-mini-val">{st.val}</div>
                    <div className="select-project-mini-lbl">{st.label}</div>
                  </div>
                ))}
              </div>

              <div className="select-project-pct-bar">
                <div className="select-project-pct-head">
                  <span>Resolución</span>
                  <span>{pct}%</span>
                </div>
                <div className="select-project-pct-track">
                  <div className="select-project-pct-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-full"
                onClick={() => handleSelect(active)}
                disabled={selecting}
                style={{ marginTop: 4 }}
              >
                {selecting ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Entrar al proyecto'}
              </button>
            </div>
          )}
        </aside>

        <main className="select-project-main">
          <DashboardComparativa
            embedded
            activeProjectId={active?.id}
            onSelectProject={handleComparativaSelect}
          />
        </main>
      </div>
    </div>
  )
}