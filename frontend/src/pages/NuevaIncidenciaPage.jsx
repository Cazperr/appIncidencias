import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { ESTADOS, PRIORIDADES, TIPOS, TIPO_AVISO, LINEAS } from '../lib/constants'

const HOY = new Date().toLocaleDateString('es-ES', { day:'2-digit', month:'2-digit', year:'numeric' })
const AHORA = new Date().toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' })

export default function NuevaIncidenciaPage() {
  const nav = useNavigate()
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [form, setForm] = useState({
    estado_actual: 'PENDIENTE NOVA',
    tipo_aviso: 'Aviso',
    ot: '',
    equipo_afectado: '',
    zona: '',
    linea: '',
    estacion: '',
    nombre_tecnico: '',
    fecha_hora: `${HOY} ${AHORA}`,
    tipo: 'Correctivo',
    prioridad: 'Media',
    sla: '',
    fecha_limite_sla: '',
    hora_limite_sla: '',
    solicitante: '',
    descripcion_fallo: '',
    comentarios_generales: '',
  })

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.descripcion_fallo.trim()) { setErr('La descripción del fallo es obligatoria'); return }
    setLoading(true); setErr('')
    try {
      const clean = Object.fromEntries(Object.entries(form).filter(([,v]) => v !== ''))
      const res = await api.post('/api/incidencias', clean)
      nav(`/incidencia/${res.id}`, { replace: true })
    } catch(e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Nueva incidencia</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => nav(-1)}>Cancelar</button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-grid">

          {/* Identificación */}
          <SectionLabel>Identificación</SectionLabel>
          <div className="form-grid form-grid-2">
            <div className="field">
              <label>OT</label>
              <input placeholder="Número OT" value={form.ot} onChange={e => set('ot', e.target.value)} />
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
              <label>Estado inicial</label>
              <select value={form.estado_actual} onChange={e => set('estado_actual', e.target.value)}>
                {['PENDIENTE NOVA','PENDIENTE MMAD','REVISAR'].map(e => <option key={e}>{e}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Prioridad</label>
              <select value={form.prioridad} onChange={e => set('prioridad', e.target.value)}>
                {PRIORIDADES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Ubicación */}
          <SectionLabel>Ubicación</SectionLabel>
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
              <input placeholder="Nombre estación" value={form.estacion} onChange={e => set('estacion', e.target.value)} />
            </div>
          </div>

          <div className="form-grid form-grid-2">
            <div className="field">
              <label>Zona</label>
              <input placeholder="Zona" value={form.zona} onChange={e => set('zona', e.target.value)} />
            </div>
            <div className="field">
              <label>Equipo afectado</label>
              <input placeholder="Código equipo" value={form.equipo_afectado} onChange={e => set('equipo_afectado', e.target.value)} />
            </div>
          </div>

          {/* Datos de la incidencia */}
          <SectionLabel>Incidencia</SectionLabel>
          <div className="form-grid form-grid-2">
            <div className="field">
              <label>Tipo</label>
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                {TIPOS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label>SLA</label>
              <input placeholder="ej. 4h" value={form.sla} onChange={e => set('sla', e.target.value)} />
            </div>
          </div>

          <div className="form-grid form-grid-2">
            <div className="field">
              <label>Fecha/hora aviso</label>
              <input placeholder="dd/mm/aaaa hh:mm" value={form.fecha_hora} onChange={e => set('fecha_hora', e.target.value)} />
            </div>
            <div className="field">
              <label>Solicitante</label>
              <input placeholder="Nombre" value={form.solicitante} onChange={e => set('solicitante', e.target.value)} />
            </div>
          </div>

          <div className="form-grid form-grid-2">
            <div className="field">
              <label>Límite SLA (fecha)</label>
              <input placeholder="dd/mm/aaaa" value={form.fecha_limite_sla} onChange={e => set('fecha_limite_sla', e.target.value)} />
            </div>
            <div className="field">
              <label>Límite SLA (hora)</label>
              <input placeholder="hh:mm" value={form.hora_limite_sla} onChange={e => set('hora_limite_sla', e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label>Técnico asignado</label>
            <input placeholder="Nombre técnico" value={form.nombre_tecnico} onChange={e => set('nombre_tecnico', e.target.value)} />
          </div>

          <div className="field">
            <label>Descripción del fallo *</label>
            <textarea placeholder="Describe el fallo o aviso recibido…" value={form.descripcion_fallo}
              onChange={e => set('descripcion_fallo', e.target.value)} required style={{ minHeight: 100 }} />
          </div>

          <div className="field">
            <label>Comentarios generales</label>
            <textarea placeholder="Observaciones adicionales…" value={form.comentarios_generales}
              onChange={e => set('comentarios_generales', e.target.value)} />
          </div>

          {err && <div className="alert alert-error">{err}</div>}

          <button className="btn btn-primary btn-full" type="submit" disabled={loading}
            style={{ padding: '14px', fontSize: 16, marginTop: 4 }}>
            {loading
              ? <span className="spinner" style={{ width: 18, height: 18, borderTopColor: '#fff' }}/>
              : '+ Crear incidencia'}
          </button>
        </div>
      </form>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily: 'var(--font-cond)', fontSize: 11, fontWeight: 700,
      letterSpacing: '.1em', textTransform: 'uppercase',
      color: 'var(--accent)', borderBottom: '1px solid var(--border)',
      paddingBottom: 4,
    }}>{children}</div>
  )
}
