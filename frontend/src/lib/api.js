import { toast } from '../components/ErrorToast'

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

// Errores que NO deben mostrar toast (se manejan localmente)
const SILENT_PATHS = ['/api/auth/login', '/api/auth/select-project']

async function apiFetch(path, opts = {}) {
  if (!path.startsWith('/')) path = '/' + path

  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  if (_token) headers['Authorization'] = `Bearer ${_token}`

  let res
  try {
    res = await fetch(`${BASE}${path}`, { ...opts, headers })
  } catch (networkErr) {
    // Error de red — sin conexión al backend
    const msg = 'Sin conexión con el servidor'
    if (!SILENT_PATHS.some(p => path.includes(p))) toast.error(msg)
    throw new Error(msg)
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error de red' }))

    if (res.status === 401 && !path.includes('/auth/login')) {
      clearToken()
      const isElectron = window.navigator.userAgent.includes('Electron')
      window.location.href = isElectron ? '#/login' : '/login'
      return
    }

    const detail = Array.isArray(err.detail)
      ? err.detail.map(e => e.msg || JSON.stringify(e)).join(', ')
      : (typeof err.detail === 'object' ? JSON.stringify(err.detail) : err.detail)

    const msg = detail || `HTTP ${res.status}`

    // Mostrar toast para errores no silenciosos
    const isSilent = SILENT_PATHS.some(p => path.includes(p))
    if (!isSilent) {
      if (res.status >= 500) toast.error(`Error del servidor: ${msg}`)
      else if (res.status === 403) toast.warn(`Sin permisos: ${msg}`)
      else if (res.status === 404) toast.warn(`No encontrado`)
      else toast.error(msg)
    }

    throw new Error(msg)
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
