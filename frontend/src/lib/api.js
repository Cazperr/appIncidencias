const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Carga el token inmediatamente al importar el modulo
let _token = localStorage.getItem('metro_token') || null

export function setToken(t) { 
  _token = t 
  if (t) localStorage.setItem('metro_token', t)
}
export function clearToken() { 
  _token = null 
  localStorage.removeItem('metro_token')
  localStorage.removeItem('metro_user')
}
export function getToken() { return _token }

async function apiFetch(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  if (_token) headers['Authorization'] = `Bearer ${_token}`

  const res = await fetch(`${BASE}${path}`, { ...opts, headers })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error de red' }))
    // 401 en /api/auth/login = credenciales incorrectas, no redirigir
    if (res.status === 401 && !path.includes('/auth/login')) {
      clearToken()
      window.location.href = '/login'
      return
    }
    throw new Error(err.detail || `HTTP ${res.status}`)
  }

  if (res.status === 204) return null
  return res.json()
}

export const api = {
  get:    (path)       => apiFetch(path),
  post:   (path, body) => apiFetch(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (path, body) => apiFetch(path, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (path)       => apiFetch(path, { method: 'DELETE' }),
}