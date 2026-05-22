import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { TIPO_AVISO, ESTADOS_GENERICOS } from '../../lib/constants'
const PRIORIDADES       = ['Baja', 'Media', 'Alta']
const ANS_OPTS          = ['No', 'Sí']

const HOY   = new Date().toLocaleDateString('es-ES', { day:'2-digit', month:'2-digit', year:'numeric' })
const AHORA = new Date().toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' })

export default function NuevaIncidenciaGenerica() {
  const nav = useNavigate()
  const [loading, setLoading] = useState(false)
  const [err, setErr]         = useState('')

  const [form, setForm] = useState({
    estado_actual:         'PENDIENTE NOVATION',
    tipo_aviso:            'Aviso',
    ot:                    '',
    equipo_afectado:       '',
    zona:                  '',
    nombre_tecnico:        '',
    fecha_hora:            `${HOY} ${AHORA}`,
    prioridad:             'Baja',
    ans:                   'No',
    solicitante:           '',
    descripcion_fallo:     '',
    comentarios_generales: '',
  })

  function set(k, v) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.descripcion_fallo.trim()) { setErr('La descripción del fallo es obligatoria'); return }
    setLoading(true); setErr('')
    try {
      const { ans, ...rest } = form
      const clean = Object.fromEntries(
        Object.entries({ ...rest, comentarios_generales: form.comentarios_generales || undefined })
          .filter(([, v]) => v !== '' && v !== undefined)
      )
      // Guardamos ANS en comentarios o como campo extra si el backend lo soporta
      if (ans === 'Sí') clean.sla = 'ANS'
      const res = await api.post('/api/incidencias', clean)
      nav(`/incidencia/${res.id}`, { replace: true })
    } catch(e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div><div className="page-title">Nueva incidencia</div></div>
        <button className="btn btn-ghost btn-sm" onClick={() => nav(-1)}>Cancelar</button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-grid">

          <SectionLabel>Identificación</SectionLabel>
          <div className="form-grid form-grid-2">
            <div className="field">
              <label>Estado inicial</label>
              <select value={form.estado_actual} onChange={e => set('estado_actual', e.target.value)}>
                {ESTADOS_GENERICOS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Prioridad</label>
              <select value={form.prioridad} onChange={e => set('prioridad', e.target.value)}>
                {PRIORIDADES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

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

          <SectionLabel>Ubicación</SectionLabel>
          <div className="form-grid form-grid-2">
            <div className="field">
              <label>Equipo afectado</label>
              <input placeholder="Código o nombre del equipo" value={form.equipo_afectado} onChange={e => set('equipo_afectado', e.target.value)} />
            </div>
            <div className="field">
              <label>Zona</label>
              <input placeholder="Zona" value={form.zona} onChange={e => set('zona', e.target.value)} />
            </div>
          </div>

          <SectionLabel>Incidencia</SectionLabel>
          <div className="form-grid form-grid-2">
            <div className="field">
              <label>Fecha/hora aviso</label>
              <input placeholder="dd/mm/aaaa hh:mm" value={form.fecha_hora} onChange={e => set('fecha_hora', e.target.value)} />
            </div>
            <div className="field">
              <label>ANS</label>
              <select value={form.ans} onChange={e => set('ans', e.target.value)}>
                {ANS_OPTS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div className="form-grid form-grid-2">
            <div className="field">
              <label>Solicitante</label>
              <input placeholder="Nombre" value={form.solicitante} onChange={e => set('solicitante', e.target.value)} />
            </div>
            <div className="field">
              <label>Técnico asignado</label>
              <input placeholder="Nombre técnico" value={form.nombre_tecnico} onChange={e => set('nombre_tecnico', e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label>Descripción del fallo *</label>
            <textarea
              placeholder="Describe el fallo o aviso recibido…"
              value={form.descripcion_fallo}
              onChange={e => set('descripcion_fallo', e.target.value)}
              required
              style={{ minHeight: 100 }}
            />
          </div>

          <div className="field">
            <label>Comentarios generales</label>
            <textarea
              placeholder="Observaciones adicionales…"
              value={form.comentarios_generales}
              onChange={e => set('comentarios_generales', e.target.value)}
            />
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
