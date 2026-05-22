import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const IconList = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
  </svg>
)
const IconDash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="3" width="7" height="7" rx="1.5"/>
    <rect x="14" y="3" width="7" height="7" rx="1.5"/>
    <rect x="3" y="14" width="7" height="7" rx="1.5"/>
    <rect x="14" y="14" width="7" height="7" rx="1.5"/>
  </svg>
)
const IconPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 8v8M8 12h8"/>
  </svg>
)
const IconAdmin = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)
const IconUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
)

export default function BottomNav() {
  const { user } = useAuth()
  return (
    <nav className="bottom-nav">
      <NavLink to="/" end>
        <IconList /><span>Lista</span>
      </NavLink>
      <NavLink to="/nueva">
        <IconPlus /><span>Nueva</span>
      </NavLink>
      <NavLink to="/dashboard">
        <IconDash /><span>Dashboard</span>
      </NavLink>
      {user?.rol === 'ADMIN' && (
        <NavLink to="/admin-proyectos">
          <IconAdmin /><span>Admin</span>
        </NavLink>
      )}
      <NavLink to="/perfil">
        <IconUser /><span>Perfil</span>
      </NavLink>
    </nav>
  )
}