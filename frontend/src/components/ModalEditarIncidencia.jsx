import { useState } from 'react'
import { api } from '../lib/api'
import { ESTADOS, PRIORIDADES, TIPOS, TIPO_AVISO, LINEAS } from '../lib/constants'

export default function ModalEditarIncidencia({ inc, onClose, onDone }) {
  // Guardamos el updated_at del momento en que se abrió el modal
  // para detectar si alguien más lo modificó antes de que guardemos
  const updatedAtRef = inc.updated_at || null

  const [form, setForm] = useState({
    ot:                    inc.ot || '',
    tipo_aviso:            inc.tipo_aviso || 'Aviso',
    estado_actual:         inc.estado_actual || 'PENDIENTE NOVA',
    prioridad:             inc.prioridad || 'Media',
    linea:                 inc.linea || '',
    estacion:              inc.estacion || '',
    zona:                  inc.zona || '',
    equipo_afectado:       inc.equipo_afectado || '',
    tipo:                  inc.tipo || 'Correctivo',
    sla:                   inc.sla || '',
    fecha_hora:            inc.fecha_hora || '',
    fecha_limite_sla:      inc.fecha_limite_sla || '',
    hora_limite_sla:       inc.hora_limite_sla || '',
    solicitante:           inc.solicitante || '',
    nombre_tecnico:        inc.nombre_tecnico || '',
    descripcion_fallo:     inc.descripcion_fallo || '',
    comentarios_generales: inc.comentarios_generales || '',
  })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setErr('')
    try {
      const clean = Object.fromEntries(Object.entries(form).filter(([,v]) => v !== ''))
      // Mandamos updated_at para que el backend detecte conflictos
      if (updatedAtRef) clean.updated_at = updatedAtRef
      await api.put(`/api/incidencias/${inc.id}`, clean)
      onDone()
    } catch(e) {
      if (e.message && e.message.includes('Conflicto')) {
        setErr('⚠️ Otro usuario modificó esta incidencia mientras la editabas. Cierra este formulario, recarga y vuelve a intentarlo.')
      } else {
        setErr(e.message)
      }
    }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">✏️ Editar incidencia</span>
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">

            <Section>Identificación</Section>
            <div className="form-grid form-grid-2">
              <div className="field">
                <label>OT</label>
                <input value={form.ot} onChange={e => set('ot', e.target.value)} placeholder="Número OT"/>
              </div>
              <div className="field">
                <label>Tipo aviso</label>
                <select value={form.tipo_aviso} onChange={e => set('tipo_aviso', e.target.value)}>
                  {TIPO_AVISO.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="form-grid form-grid-2">
              <div className="field">
                <label>Estado</label>
                <select value={form.estado_actual} onChange={e => set('estado_actual', e.target.value)}>
                  {ESTADOS.map(e => <option key={e}>{e}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Prioridad</label>
                <select value={form.prioridad} onChange={e => set('prioridad', e.target.value)}>
                  {PRIORIDADES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <Section>Ubicación</Section>
            <div className="form-grid form-grid-2">
              <div className="field">
                <label>Línea</label>
                <select value={form.linea} onChange={e => set('linea', e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  {LINEAS.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Estación</label>
                <input value={form.estacion} onChange={e => set('estacion', e.target.value)} placeholder="Estación"/>
              </div>
            </div>
            <div className="form-grid form-grid-2">
              <div className="field">
                <label>Zona</label>
                <input value={form.zona} onChange={e => set('zona', e.target.value)} placeholder="Zona"/>
              </div>
              <div className="field">
                <label>Equipo afectado</label>
                <input value={form.equipo_afectado} onChange={e => set('equipo_afectado', e.target.value)} placeholder="Código equipo"/>
              </div>
            </div>

            <Section>Incidencia</Section>
            <div className="form-grid form-grid-2">
              <div className="field">
                <label>Tipo</label>
                <select value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                  {TIPOS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="field">
                <label>SLA</label>
                <input value={form.sla} onChange={e => set('sla', e.target.value)} placeholder="ej. 4h"/>
              </div>
            </div>
            <div className="form-grid form-grid-2">
              <div className="field">
                <label>Fecha/hora aviso</label>
                <input value={form.fecha_hora} onChange={e => set('fecha_hora', e.target.value)} placeholder="dd/mm/aaaa hh:mm"/>
              </div>
              <div className="field">
                <label>Solicitante</label>
                <input value={form.solicitante} onChange={e => set('solicitante', e.target.value)} placeholder="Nombre"/>
              </div>
            </div>
            <div className="form-grid form-grid-2">
              <div className="field">
                <label>Límite SLA (fecha)</label>
                <input value={form.fecha_limite_sla} onChange={e => set('fecha_limite_sla', e.target.value)} placeholder="dd/mm/aaaa"/>
              </div>
              <div className="field">
                <label>Límite SLA (hora)</label>
                <input value={form.hora_limite_sla} onChange={e => set('hora_limite_sla', e.target.value)} placeholder="hh:mm"/>
              </div>
            </div>
            <div className="field">
              <label>Técnico asignado</label>
              <input value={form.nombre_tecnico} onChange={e => set('nombre_tecnico', e.target.value)} placeholder="Nombre técnico"/>
            </div>
            <div className="field">
              <label>Descripción del fallo</label>
              <textarea value={form.descripcion_fallo} onChange={e => set('descripcion_fallo', e.target.value)}
                style={{ minHeight: 90 }}/>
            </div>
            <div className="field">
              <label>Comentarios generales</label>
              <textarea value={form.comentarios_generales} onChange={e => set('comentarios_generales', e.target.value)}/>
            </div>

            {err && <div className="alert alert-error">{err}</div>}

            <button className="btn btn-primary btn-full" type="submit" disabled={loading} style={{ padding: 14 }}>
              {loading
                ? <span className="spinner" style={{ width: 18, height: 18, borderTopColor: '#fff' }}/>
                : '💾 Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Section({ children }) {
  return (
    <div style={{
      fontFamily: 'var(--font-cond)', fontSize: 11, fontWeight: 700,
      letterSpacing: '.1em', textTransform: 'uppercase',
      color: 'var(--accent)', borderBottom: '1px solid var(--border)', paddingBottom: 4,
    }}>{children}</div>
  )
}
