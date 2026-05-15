import { useState } from 'react'
import { api } from '../lib/api'

const MOTIVOS = ['Falta de piezas', 'Falta de material', 'Falta de acceso', 'Pendiente de proveedor', 'Otro']

export default function ModalPendiente({ incId, onClose, onDone }) {
  const [form, setForm] = useState({
    motivo: MOTIVOS[0],
    descripcion_trabajos: '',
    tiempo_desplazamiento: '',
    num_tecnicos: 1,
  })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.descripcion_trabajos.trim()) { setErr('Describe los trabajos realizados'); return }
    if (!form.tiempo_desplazamiento) { setErr('Indica el tiempo de desplazamiento'); return }
    setLoading(true); setErr('')
    try {
      await api.post(`/api/incidencias/${incId}/pendiente`, {
        ...form,
        num_tecnicos: Number(form.num_tecnicos),
      })
      onDone()
    } catch(e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">⏳ Pendiente Resolución</span>
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">

            <div className="field">
              <label>Motivo *</label>
              <select value={form.motivo} onChange={e => set('motivo', e.target.value)}>
                {MOTIVOS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>

            <div className="field">
              <label>Trabajos realizados en esta visita *</label>
              <textarea
                placeholder="Describe qué se ha hecho y qué queda pendiente..."
                value={form.descripcion_trabajos}
                onChange={e => set('descripcion_trabajos', e.target.value)}
                style={{ minHeight: 100 }} required />
            </div>

            <div className="form-grid form-grid-2">
              <div className="field">
                <label>Desplazamiento (min) *</label>
                <input type="number" min="0" placeholder="ej. 25"
                  value={form.tiempo_desplazamiento}
                  onChange={e => set('tiempo_desplazamiento', e.target.value)} required />
              </div>
              <div className="field">
                <label>Num. técnicos</label>
                <input type="number" min="1" max="10"
                  value={form.num_tecnicos}
                  onChange={e => set('num_tecnicos', e.target.value)} />
              </div>
            </div>

            {err && <div className="alert alert-error">{err}</div>}

            <div className="alert alert-info" style={{ fontSize: 12 }}>
              Se guardará la visita parcial. La incidencia quedará en <strong>Pendiente Resolución</strong> hasta que se reanude.
            </div>

            <button className="btn btn-warn btn-full" type="submit" disabled={loading}
              style={{ padding: '14px', fontSize: 16 }}>
              {loading
                ? <span className="spinner" style={{ width: 18, height: 18 }}/>
                : '⏳ Dejar pendiente de resolución'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
