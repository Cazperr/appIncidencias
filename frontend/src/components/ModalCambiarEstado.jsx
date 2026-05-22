import { useState } from 'react'
import { api } from '../lib/api'
import { ESTADOS } from '../lib/constants'

export default function ModalCambiarEstado({ inc, onClose, onDone, estados = ESTADOS }) {
  const [estado, setEstado] = useState(inc.estado_actual)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (estado === inc.estado_actual) { onClose(); return }
    setLoading(true); setErr('')
    try {
      await api.put(`/api/incidencias/${inc.id}`, {
        estado_actual: estado,
        updated_at: inc.updated_at,
      })
      onDone()
    } catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">🔄 Cambiar estado</span>
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div style={{ marginBottom: 14, fontSize: 12, color: 'var(--txt2)' }}>
          Estado actual: <strong style={{ color: 'var(--txt)' }}>{inc.estado_actual}</strong>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field">
              <label>Nuevo estado</label>
              <select value={estado} onChange={e => setEstado(e.target.value)}>
                {estados.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {err && <div className="alert alert-error">{err}</div>}

            <button className="btn btn-primary btn-full" type="submit" disabled={loading}
              style={{ padding: 14 }}>
              {loading
                ? <span className="spinner" style={{ width: 18, height: 18, borderTopColor: '#fff' }} />
                : 'Confirmar cambio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
