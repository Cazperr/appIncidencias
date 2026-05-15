import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const IconList = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
  </svg>
)
const IconDash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
)
const IconPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>
  </svg>
)
const IconUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>
)
const IconUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
)

export default function BottomNav() {
  const { user } = useAuth()
  return (
    <nav className="bottom-nav">
      <NavLink to="/" end>
        <IconList /><span>Incidencias</span>
      </NavLink>
      <NavLink to="/nueva">
        <IconPlus /><span>Nueva</span>
      </NavLink>
      <NavLink to="/dashboard">
        <IconDash /><span>Dashboard</span>
      </NavLink>
      {user?.rol === 'ADMIN' && (
        <NavLink to="/usuarios">
          <IconUsers /><span>Usuarios</span>
        </NavLink>
      )}
      <NavLink to="/perfil">
        <IconUser /><span>Perfil</span>
      </NavLink>
    </nav>
  )
}
