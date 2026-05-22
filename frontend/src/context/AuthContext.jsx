import { createContext, useContext, useState } from 'react'
import { setToken, clearToken, api } from '../lib/api'

const AuthCtx = createContext(null)

function getStoredUser() {
  try {
    const s = localStorage.getItem('metro_user')
    return s ? JSON.parse(s) : null
  } catch { return null }
}

function getStoredProject() {
  try {
    const s = localStorage.getItem('metro_project')
    return s ? JSON.parse(s) : null
  } catch { return null }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('metro_token')
    if (!token) return null
    return getStoredUser()
  })

  const [proyecto, setProyectoState] = useState(() => getStoredProject())

  async function login(email, password) {
    const data = await api.post('/api/auth/login', { email, password })
    setToken(data.access_token)
    localStorage.setItem('metro_user', JSON.stringify(data.user))
    setUser(data.user)
    // Limpiar proyecto anterior al hacer login
    localStorage.removeItem('metro_project')
    setProyectoState(null)
    return data.user
  }

  function setProject(project) {
    localStorage.setItem('metro_project', JSON.stringify(project))
    setProyectoState(project)
  }

  async function logout() {
    clearToken()
    localStorage.removeItem('metro_project')
    setUser(null)
    setProyectoState(null)
    window.location.href = '/login'
  }

  return (
    <AuthCtx.Provider value={{ user, login, logout, proyecto, setProject, loading: false }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)