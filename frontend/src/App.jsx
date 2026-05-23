import React from 'react'
import './index.css'

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import BottomNav from './components/BottomNav'
import AdminProyectos from './components/AdminProyectos';

import LoginPage            from './pages/LoginPage'
import SelectProjectPage    from './pages/SelectProjectPage'
import IncidenciasPage      from './pages/IncidenciasPage'
import IncidenciaDetailPage from './pages/IncidenciaDetailPage'
import NuevaIncidenciaPage  from './pages/NuevaIncidenciaPage'
import DashboardPage        from './pages/DashboardPage'
import UsuariosPage         from './pages/UsuariosPage'
import PerfilPage           from './pages/PerfilPage'

// RequireAuth modificado: puede requerir proyecto o no
function RequireAuth({ children, requireProject = true }) {
  const { user, proyecto, loading } = useAuth()
  if (loading) return (
    <div className="loading-screen">
      <div className="spinner"/>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  // Solo redirigir a select-project si requiere proyecto y no hay proyecto
  if (requireProject && !proyecto) return <Navigate to="/select-project" replace />
  return children
}

// Botón día/noche — oculto en /perfil (tiene el suyo) y en móvil (<768px)
// Modifica el ThemeButton para que se oculte en admin
function ThemeButton() {
  const { dark, toggle } = useTheme()
  const { pathname } = useLocation()
  // Ocultar en perfil y en admin-proyectos
  if (pathname === '/perfil' || pathname === '/admin-proyectos') return null
  return (
    <button
      onClick={toggle}
      aria-label={dark ? 'Cambiar a modo día' : 'Cambiar a modo noche'}
      className="theme-btn-desktop"
      style={{
        position: 'fixed', top: 14, right: 16, zIndex: 100,
        background: 'none', border: 'none', padding: 6,
        cursor: 'pointer', color: 'var(--txt)', opacity: 0.7,
      }}
    >
      {dark ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4"/>
          <line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>
          <line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/>
          <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
          <line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  )
}

function ProjectSidebar() {
  const { proyecto, setProject } = useAuth()
  const [open, setOpen] = React.useState(false)
  if (!proyecto) return null

  const W = open ? 212 : 52

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0,
      bottom: 'var(--nav-h)',
      zIndex: 150,
      width: W,
      transition: 'width .2s cubic-bezier(.4,0,.2,1)',
      background: 'var(--bg)',
      borderRight: '1px solid var(--border2)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>

      {/* Toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center',
          justifyContent: open ? 'flex-end' : 'center',
          height: 52, padding: '0 14px',
          background: 'none', border: 'none',
          borderBottom: '1px solid var(--border)',
          color: 'var(--txt3)', flexShrink: 0, cursor: 'pointer',
          transition: 'color .15s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--txt)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--txt3)'}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {open ? <path d="M15 18l-6-6 6-6"/> : <path d="M9 18l6-6-6-6"/>}
        </svg>
      </button>

      {/* Proyecto activo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: open ? '14px 14px' : '14px 0',
        justifyContent: open ? 'flex-start' : 'center',
        borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <div style={{
          width: 28, height: 28, flexShrink: 0,
          background: 'var(--accent)', borderRadius: 7,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
          color: '#fff',
        }}>
          {proyecto.initials}
        </div>
        {open && (
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--font)', fontSize: 12, fontWeight: 600,
              color: 'var(--txt)', whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140,
            }}>
              {proyecto.nombre}
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 10,
              color: 'var(--txt3)', marginTop: 1,
              letterSpacing: '.06em', textTransform: 'uppercase',
            }}>
              {proyecto.rol || 'Técnico'}
            </div>
          </div>
        )}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Cambiar proyecto */}
      <button
        onClick={() => setProject(null)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          height: 48,
          padding: open ? '0 14px' : '0',
          justifyContent: open ? 'flex-start' : 'center',
          background: 'none', border: 'none',
          borderTop: '1px solid var(--border)',
          color: 'var(--txt3)', width: '100%', flexShrink: 0,
          cursor: 'pointer', transition: 'color .15s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--txt3)'}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
          <path d="M17 16l4-4-4-4"/><path d="M3 12h18"/><path d="M7 8l-4 4 4 4"/>
        </svg>
        {open && (
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
            letterSpacing: '.10em', textTransform: 'uppercase', whiteSpace: 'nowrap',
          }}>
            Cambiar proyecto
          </span>
        )}
      </button>
    </div>
  )
}

function Layout({ children }) {
  const { proyecto } = useAuth()
  const sideW = proyecto ? 48 : 0
  return (
    <div style={{ display: 'flex', minHeight: '100dvh' }}>
      <ProjectSidebar />
      <div style={{
        flex: 1, marginLeft: sideW, transition: 'margin-left .22s ease',
        display: 'flex', flexDirection: 'column',
      }}>
        <ThemeButton />
        {children}
        <BottomNav />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/select-project" element={<SelectProjectPage />} />
            
            {/* Panel Admin - sin Layout ni BottomNav */}
            <Route 
              path="/admin-proyectos" 
              element={
                <RequireAuth requireProject={false}>
                  <AdminProyectos />
                </RequireAuth>
              } 
            />
            
            {/* Estas rutas SÍ requieren proyecto seleccionado */}
            <Route path="/" element={<RequireAuth><Layout><IncidenciasPage /></Layout></RequireAuth>}/>
            <Route path="/incidencia/:id" element={<RequireAuth><Layout><IncidenciaDetailPage /></Layout></RequireAuth>}/>
            <Route path="/nueva" element={<RequireAuth><Layout><NuevaIncidenciaPage /></Layout></RequireAuth>}/>
            <Route path="/dashboard" element={<RequireAuth><Layout><DashboardPage /></Layout></RequireAuth>}/>
            <Route path="/usuarios" element={<RequireAuth><Layout><UsuariosPage /></Layout></RequireAuth>}/>
            <Route path="/perfil" element={<RequireAuth><Layout><PerfilPage /></Layout></RequireAuth>}/>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}