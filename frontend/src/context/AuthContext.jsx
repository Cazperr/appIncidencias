import { createContext, useContext, useState } from 'react'
import { setToken, clearToken, getToken, api } from '../lib/api'

const AuthCtx = createContext(null)

// Leer usuario del localStorage de forma sincrona (sin useEffect)
function getStoredUser() {
  try {
    const s = localStorage.getItem('metro_user')
    return s ? JSON.parse(s) : null
  } catch { return null }
}

export function AuthProvider({ children }) {
  // Estado inicial sincróno — no hay loading, no hay delay
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('metro_token')
    if (!token) return null
    return getStoredUser()
  })

  async function login(email, password) {
    const data = await api.post('/api/auth/login', { email, password })
    setToken(data.access_token)
    localStorage.setItem('metro_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  async function logout() {
    clearToken()
    setUser(null)
    window.location.href = '/login'
  }

  return (
    <AuthCtx.Provider value={{ user, login, logout, loading: false }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)