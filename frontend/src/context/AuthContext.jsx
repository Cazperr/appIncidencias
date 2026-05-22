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
  const [loading, setLoading] = useState(false)

  async function login(email, password) {
    const data = await api.post('/api/auth/login', { email, password })
    setToken(data.access_token)
    
    // Asegurar que el usuario incluya el rol
    const userData = {
      ...data.user,
      rol: data.user.rol || 'VIEWER'
    }
    
    localStorage.setItem('metro_user', JSON.stringify(userData))
    setUser(userData)
    // Limpiar proyecto anterior al hacer login
    localStorage.removeItem('metro_project')
    setProyectoState(null)
    return userData
  }

  function setProject(project) {
    if (project === null) {
      // Cambiar proyecto: limpiar y redirigir
      localStorage.removeItem('metro_project')
      setProyectoState(null)
      window.location.href = '/select-project'
    } else {
      localStorage.setItem('metro_project', JSON.stringify(project))
      setProyectoState(project)
    }
  }

  async function logout() {
    clearToken()
    localStorage.removeItem('metro_project')
    localStorage.removeItem('metro_user')
    setUser(null)
    setProyectoState(null)
    window.location.href = '/login'
  }

  // Verificar si el usuario es admin
  const isAdmin = user?.rol === 'ADMIN'

  return (
    <AuthCtx.Provider value={{ 
      user, 
      login, 
      logout, 
      proyecto, 
      setProject, 
      loading,
      isAdmin
    }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)