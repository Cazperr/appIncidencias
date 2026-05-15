import { useState } from 'react'
import { api } from '../lib/api'

export default function ModalCierre({ incId, onClose, onDone }) {
  const [form, setForm] = useState({
    tiempo_desplazamiento: '',
    descripcion_trabajos: '',
    num_tecnicos: 1,
    pieza_cambiada: false,
    sn_nueva: '', pn_nueva: '',
    sn_vieja: '', pn_vieja: '',
  })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.descripcion_trabajos.trim()) { setErr('La descripción es obligatoria'); return }
    if (!form.tiempo_desplazamiento) { setErr('Indica el tiempo de desplazamiento'); return }
    setLoading(true); setErr('')
    try {
      await api.post(`/api/incidencias/${incId}/solucionar`, {
        ...form,
        num_tecnicos: Number(form.num_tecnicos),
        pieza_cambiada: form.pieza_cambiada,
      })
      onDone()
    } catch(e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">✅ Solucionar incidencia</span>
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">

            {/* Tiempos */}
            <div className="form-grid form-grid-2">
              <div className="field">
                <label>Desplazamiento (min) *</label>
                <input type="number" min="0" placeholder="ej. 25"
                  value={form.tiempo_desplazamiento}
                  onChange={e => set('tiempo_desplazamiento', e.target.value)} required />
              </div>
              <div className="field">
                <label>Núm. técnicos</label>
                <input type="number" min="1" max="10"
                  value={form.num_tecnicos}
                  onChange={e => set('num_tecnicos', e.target.value)} />
              </div>
            </div>

            {/* Descripción */}
            <div className="field">
              <label>Descripción de trabajos realizados *</label>
              <textarea placeholder="Describe los trabajos realizados…"
                value={form.descripcion_trabajos}
                onChange={e => set('descripcion_trabajos', e.target.value)}
                style={{ minHeight: 110 }} required />
            </div>

            {/* Pieza cambiada */}
            <div>
              <label className="toggle-wrap">
                <span className="toggle">
                  <input type="checkbox" checked={form.pieza_cambiada}
                    onChange={e => set('pieza_cambiada', e.target.checked)} />
                  <span className="toggle-slider" />
                </span>
                <span style={{ fontFamily: 'var(--font-cond)', fontSize: 14, fontWeight: 600 }}>
                  ¿Se ha cambiado alguna pieza?
                </span>
              </label>
            </div>

            {/* Piezas — solo si pieza_cambiada */}
            {form.pieza_cambiada && (
              <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 14 }}>
                <p style={{ fontFamily: 'var(--font-cond)', fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--txt3)', marginBottom: 12 }}>
                  Pieza instalada (nueva)
                </p>
                <div className="form-grid form-grid-2" style={{ marginBottom: 14 }}>
                  <div className="field">
                    <label>S/N nueva</label>
                    <input placeholder="Número de serie" value={form.sn_nueva}
                      onChange={e => set('sn_nueva', e.target.value)} />
                  </div>
                  <div className="field">
                    <label>P/N nueva</label>
                    <input placeholder="Part number" value={form.pn_nueva}
                      onChange={e => set('pn_nueva', e.target.value)} />
                  </div>
                </div>

                <p style={{ fontFamily: 'var(--font-cond)', fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--txt3)', marginBottom: 12 }}>
                  Pieza retirada (vieja)
                </p>
                <div className="form-grid form-grid-2">
                  <div className="field">
                    <label>S/N vieja</label>
                    <input placeholder="Número de serie" value={form.sn_vieja}
                      onChange={e => set('sn_vieja', e.target.value)} />
                  </div>
                  <div className="field">
                    <label>P/N vieja</label>
                    <input placeholder="Part number" value={form.pn_vieja}
                      onChange={e => set('pn_vieja', e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {err && <div className="alert alert-error">{err}</div>}

            <button className="btn btn-success btn-full" type="submit" disabled={loading}
              style={{ padding: '14px', fontSize: 16 }}>
              {loading ? <span className="spinner" style={{ width: 18, height: 18, borderTopColor: '#fff' }} /> : '✅ Confirmar solución'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
