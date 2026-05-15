const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

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
  if (!path.startsWith('/')) path = '/' + path
  
  // Login NO lleva slash (FastAPI lo maneja sin barra)
  // Incidencias y otros endpoints SÍ llevan slash
  const needsSlash = !path.includes('/auth/login') && !path.includes('/auth/refresh')
  
  let finalPath = path
  if (needsSlash) {
    const [basePath, ...rest] = path.split('?')
    const cleanPath = basePath.endsWith('/') ? basePath : basePath + '/'
    finalPath = rest.length > 0 ? cleanPath + '?' + rest.join('?') : cleanPath
  }
  
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  if (_token) headers['Authorization'] = `Bearer ${_token}`

  const res = await fetch(`${BASE}${finalPath}`, { ...opts, headers })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error de red' }))
    if (res.status === 401 && !finalPath.includes('/auth/login')) {
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