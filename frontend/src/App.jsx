import './index.css'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import BottomNav from './components/BottomNav'

import LoginPage            from './pages/LoginPage'
import IncidenciasPage      from './pages/IncidenciasPage'
import IncidenciaDetailPage from './pages/IncidenciaDetailPage'
import NuevaIncidenciaPage  from './pages/NuevaIncidenciaPage'
import DashboardPage        from './pages/DashboardPage'
import UsuariosPage         from './pages/UsuariosPage'
import PerfilPage           from './pages/PerfilPage'

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="loading-screen">
      <div className="spinner"/>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

// Botón día/noche — oculto en /perfil (tiene el suyo) y en móvil (<768px)
function ThemeButton() {
  const { dark, toggle } = useTheme()
  const { pathname } = useLocation()
  if (pathname === '/perfil') return null
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

function Layout({ children }) {
  return <><ThemeButton />{children}<BottomNav /></>
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
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