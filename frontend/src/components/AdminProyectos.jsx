// src/lib/adminApi.js
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function getToken() {
  return localStorage.getItem('metro_token')
}

async function adminFetch(endpoint, options = {}) {
  const token = getToken()
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...(options.headers || {})
    }
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(error || `Error ${response.status}`)
  }
  
  return response.json()
}

export const adminApi = {
  get: (endpoint) => adminFetch(endpoint),
  post: (endpoint, data) => adminFetch(endpoint, { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }),
  put: (endpoint, data) => adminFetch(endpoint, { 
    method: 'PUT', 
    body: JSON.stringify(data) 
  }),
  delete: (endpoint) => adminFetch(endpoint, { 
    method: 'DELETE' 
  }),
}
export default function AdminProyectos() { return null }