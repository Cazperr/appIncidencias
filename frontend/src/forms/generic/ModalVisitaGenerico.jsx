import { useState } from 'react'
import { api } from '../../lib/api'

const SL  = { fontFamily: 'var(--font-cond)', fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--txt2)', marginBottom: 10 }
const BOX = { background: 'var(--bg4)', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', padding: 14 }

function today()   { return new Date().toISOString().slice(0, 10) }
function nowTime() { return new Date().toTimeString().slice(0, 5) }
function newEquipo() { return { descripcion: '', sn_nuevo: '', pn_nuevo: '', sn_viejo: '', pn_viejo: '' } }

export default function ModalVisitaGenerico({ incId, isMetro = false, onClose, onDone }) {
  const [form, setForm] = useState({
    fecha_inicio: today(),
    hora_inicio: '08:00',
    fecha_fin: today(),
    hora_fin: nowTime(),
    tiempo_desplazamiento: '',
    num_tecnicos: 1,
    descripcion_trabajos: '',
    material_utilizado: false,
    material_descripcion: '',
    equipos_sustituidos: false,
    equipos: [],
    estado_resultante: isMetro ? 'EN CURSO' : 'PENDIENTE NOVA',
  })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function addEquipo() { setForm(f => ({ ...f, equipos: [...f.equipos, newEquipo()] })) }
  function removeEquipo(i) { setForm(f => ({ ...f, equipos: f.equipos.filter((_, idx) => idx !== i) })) }
  function setEquipo(i, k, v) {
    setForm(f => ({ ...f, equipos: f.equipos.map((eq, idx) => idx === i ? { ...eq, [k]: v } : eq) }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.descripcion_trabajos.trim()) { setErr('La descripción es obligatoria'); return }
    if (form.equipos_sustituidos && form.equipos.length === 0) { setErr('Añade al menos un equipo'); return }

    setLoading(true); setErr('')
    try {
      await api.post(`/api/incidencias/${incId}/visita`, {
        fecha_inicio: form.fecha_inicio,
        hora_inicio: form.hora_inicio,
        fecha_fin: form.fecha_fin,
        hora_fin: form.hora_fin,
        tiempo_desplazamiento: form.tiempo_desplazamiento ? String(form.tiempo_desplazamiento) : null,
        num_tecnicos: Number(form.num_tecnicos),
        descripcion_trabajos: form.descripcion_trabajos,
        material_descripcion: form.material_utilizado ? form.material_descripcion : null,
        equipos: form.equipos_sustituidos ? form.equipos : null,
        estado_resultante: form.estado_resultante,
      })
      onDone()
    } catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Registrar escalado</span>
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>



        <form onSubmit={handleSubmit}>
          <div className="form-grid">

            {/* Tiempos */}
            <p style={SL}>⏱ Tiempos</p>
            <div className="form-grid form-grid-2">
              <div className="field">
                <label>Fecha inicio</label>
                <input type="date" value={form.fecha_inicio} onChange={e => set('fecha_inicio', e.target.value)} />
              </div>
              <div className="field">
                <label>Hora inicio</label>
                <input type="time" value={form.hora_inicio} onChange={e => set('hora_inicio', e.target.value)} />
              </div>
              <div className="field">
                <label>Fecha fin</label>
                <input type="date" value={form.fecha_fin} onChange={e => set('fecha_fin', e.target.value)} />
              </div>
              <div className="field">
                <label>Hora fin</label>
                <input type="time" value={form.hora_fin} onChange={e => set('hora_fin', e.target.value)} />
              </div>
              <div className="field">
                <label>Desplazamiento (min)</label>
                <input type="number" min="0" placeholder="ej. 25"
                  value={form.tiempo_desplazamiento} onChange={e => set('tiempo_desplazamiento', e.target.value)} />
              </div>
              <div className="field">
                <label>Núm. técnicos</label>
                <input type="number" min="1" max="20"
                  value={form.num_tecnicos} onChange={e => set('num_tecnicos', e.target.value)} />
              </div>
            </div>

            {/* Descripción */}
            <div className="field">
              <label>Descripción de trabajos realizados *</label>
              <textarea placeholder="Describe los trabajos realizados en este escalado…"
                value={form.descripcion_trabajos}
                onChange={e => set('descripcion_trabajos', e.target.value)}
                style={{ minHeight: 90 }} required />
            </div>

            {/* Material */}
            <div>
              <label className="toggle-wrap">
                <span className="toggle">
                  <input type="checkbox" checked={form.material_utilizado}
                    onChange={e => set('material_utilizado', e.target.checked)} />
                  <span className="toggle-slider" />
                </span>
                <span style={{ fontFamily: 'var(--font-cond)', fontSize: 14, fontWeight: 600 }}>
                  ¿Se ha utilizado material o piezas?
                </span>
              </label>
            </div>

            {form.material_utilizado && (
              <div style={BOX}>
                <div className="field" style={{ marginBottom: 16 }}>
                  <label>Material utilizado</label>
                  <textarea
                    placeholder={"10m cable UTP cat6\n2x fuente alimentación 48V"}
                    value={form.material_descripcion}
                    onChange={e => set('material_descripcion', e.target.value)}
                    style={{ minHeight: 70, fontFamily: 'var(--font-mono)', fontSize: 13 }}
                  />
                </div>

                <div>
                  <label className="toggle-wrap">
                    <span className="toggle">
                      <input type="checkbox" checked={form.equipos_sustituidos}
                        onChange={e => {
                          set('equipos_sustituidos', e.target.checked)
                          if (e.target.checked && form.equipos.length === 0) addEquipo()
                        }} />
                      <span className="toggle-slider" />
                    </span>
                    <span style={{ fontFamily: 'var(--font-cond)', fontSize: 13, fontWeight: 600 }}>
                      ¿Algún equipo con S/N y P/N?
                    </span>
                  </label>
                </div>

                {form.equipos_sustituidos && (
                  <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {form.equipos.map((eq, i) => (
                      <div key={i} style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', padding: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <span style={{ fontFamily: 'var(--font-cond)', fontSize: 11, fontWeight: 700, color: 'var(--txt3)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                            Equipo {i + 1}
                          </span>
                          <button type="button" onClick={() => removeEquipo(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt3)', padding: 2 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                            </svg>
                          </button>
                        </div>

                        <div className="field" style={{ marginBottom: 10 }}>
                          <label>Descripción del equipo</label>
                          <input placeholder="ej. Fuente de alimentación SAI"
                            value={eq.descripcion} onChange={e => setEquipo(i, 'descripcion', e.target.value)} />
                        </div>

                        <p style={{ ...SL, marginBottom: 8 }}>Nuevo (instalado)</p>
                        <div className="form-grid form-grid-2" style={{ marginBottom: 10 }}>
                          <div className="field">
                            <label>S/N nuevo</label>
                            <input placeholder="Número de serie" value={eq.sn_nuevo} onChange={e => setEquipo(i, 'sn_nuevo', e.target.value)} />
                          </div>
                          <div className="field">
                            <label>P/N nuevo</label>
                            <input placeholder="Part number" value={eq.pn_nuevo} onChange={e => setEquipo(i, 'pn_nuevo', e.target.value)} />
                          </div>
                        </div>

                        <p style={{ ...SL, marginBottom: 8 }}>Viejo (retirado)</p>
                        <div className="form-grid form-grid-2">
                          <div className="field">
                            <label>S/N viejo</label>
                            <input placeholder="Número de serie" value={eq.sn_viejo} onChange={e => setEquipo(i, 'sn_viejo', e.target.value)} />
                          </div>
                          <div className="field">
                            <label>P/N viejo</label>
                            <input placeholder="Part number" value={eq.pn_viejo} onChange={e => setEquipo(i, 'pn_viejo', e.target.value)} />
                          </div>
                        </div>
                      </div>
                    ))}

                    <button type="button" onClick={addEquipo} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'none', border: '1px dashed var(--border2)',
                      borderRadius: 'var(--radius)', padding: '10px 14px',
                      cursor: 'pointer', color: 'var(--txt3)',
                      fontFamily: 'var(--font-cond)', fontSize: 13, fontWeight: 600,
                      width: '100%', justifyContent: 'center',
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 5v14M5 12h14"/>
                      </svg>
                      Añadir equipo
                    </button>
                  </div>
                )}
              </div>
            )}

            {err && <div className="alert alert-error">{err}</div>}

            {/* Estado resultante */}
            <div className="field">
              <label>Estado tras el escalado</label>
              <select value={form.estado_resultante} onChange={e => set('estado_resultante', e.target.value)}>
                {isMetro ? (
                  <>
                    <option value="EN CURSO">En curso</option>
                    <option value="SOLUCIONADA">Solucionada</option>
                    <option value="PENDIENTE RESOLUCION">Pendiente resolución</option>
                    <option value="ASIGNADA">Asignada</option>
                  </>
                ) : (
                  <>
                    <option value="PENDIENTE NOVA">Pendiente Novation</option>
                    <option value="SOLUCIONADA">Solucionada</option>
                    <option value="PENDIENTE RESOLUCION">Pendiente resolución</option>
                  </>
                )}
              </select>
            </div>

            <button className="btn btn-primary btn-full" type="submit" disabled={loading}
              style={{ padding: '14px', fontSize: 16 }}>
              {loading
                ? <span className="spinner" style={{ width: 18, height: 18, borderTopColor: '#fff' }} />
                : 'Guardar escalado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}