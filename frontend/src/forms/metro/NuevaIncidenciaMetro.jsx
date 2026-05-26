import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { PRIORIDADES, TIPOS, TIPO_AVISO, LINEAS, LINEA_COLORS, LINEA_TEXT_DARK, ESTACION_LINEAS } from '../../lib/constants'
import { calcularSLA } from './utils/calcularSLA'
import BuscadorEstacion from './components/BuscadorEstacion'
import { useAuth } from '../../context/AuthContext'

const ESTADOS_METRO = ['PENDIENTE NOVA', 'PENDIENTE MMAD', 'REVISAR']

const HOY   = new Date().toLocaleDateString('es-ES', { day:'2-digit', month:'2-digit', year:'numeric' })
const AHORA = new Date().toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' })


export default function NuevaIncidenciaMetro() {
  const nav = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [err, setErr]         = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfErr, setPdfErr]         = useState('')
  const [pdfKey, setPdfKey]         = useState(0)

  const [form, setForm] = useState({
    estado_actual:        'PENDIENTE NOVA',
    tipo_aviso:           'Aviso',
    ot:                   '',
    equipo_afectado:      '',
    zona:                 '',
    linea:                '',
    estacion:             '',
    nombre_tecnico:       user?.nombre || '',
    fecha_hora:           `${HOY} ${AHORA}`,
    tipo:                 'Correctivo',
    prioridad:            'Media',
    sla:                  '12h',
    fecha_limite_sla:     '',
    hora_limite_sla:      '',
    solicitante:          'GEMA',
    descripcion_fallo:    '',
    comentarios_generales:'',
  })

  function set(k, v) {
    setForm(f => {
      const updated = { ...f, [k]: v }
      if (k === 'prioridad' || k === 'fecha_hora') {
        const prio = k === 'prioridad' ? v : updated.prioridad
        updated.sla = prio === 'Baja' ? '16h' : '12h'
        const { fecha, hora } = calcularSLA(k === 'fecha_hora' ? v : updated.fecha_hora, prio)
        updated.fecha_limite_sla = fecha
        updated.hora_limite_sla  = hora
      }
      return updated
    })
  }

  function handleLineaDetectada(linea, opciones) {
    if (linea === '__multiple__') set('linea', (opciones || []).join(','))
    else set('linea', linea)
  }

  async function handlePDF(e) {
    const file = e.target.files[0]
    if (!file) return
    setPdfLoading(true); setPdfErr('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const BASE  = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const token = localStorage.getItem('metro_token')
      const res   = await fetch(`${BASE}/api/pdf/parse`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Error al leer el PDF')
      }
      const data = await res.json()
      setForm(f => {
        const updated = { ...f }
        if (data.ot)                updated.ot                = data.ot
        if (data.tipo)              updated.tipo               = data.tipo
        if (data.prioridad)         updated.prioridad          = data.prioridad
        if (data.equipo_afectado)   updated.equipo_afectado    = data.equipo_afectado
        if (data.zona)              updated.zona               = data.zona
        if (data.descripcion_fallo) updated.descripcion_fallo  = data.descripcion_fallo
        if (data.fecha_hora)        updated.fecha_hora         = data.fecha_hora
        if (data.estacion) {
          updated.estacion = data.estacion
          const lineasEst = ESTACION_LINEAS[data.estacion] || []
          if (lineasEst.length > 0) updated.linea = lineasEst.join(',')
        }
        const prio = data.prioridad || updated.prioridad
        updated.sla = prio === 'Baja' ? '16h' : '12h'
        if (updated.fecha_hora) {
          const { fecha, hora } = calcularSLA(updated.fecha_hora, prio)
          updated.fecha_limite_sla = fecha
          updated.hora_limite_sla  = hora
        }
        return updated
      })
      if (data.estacion) setPdfKey(k => k + 1)
    } catch(e) { setPdfErr(e.message) }
    finally { setPdfLoading(false); e.target.value = '' }
  }

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
        <div><div className="page-title">Nueva incidencia</div></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 'var(--radius)',
            border: '1px solid var(--border2)', cursor: 'pointer',
            fontSize: 13, fontWeight: 700, color: 'var(--txt2)',
            background: 'var(--bg3)', fontFamily: 'var(--font-cond)',
            opacity: pdfLoading ? 0.6 : 1,
          }}>
            {pdfLoading ? <span className="spinner" style={{ width: 14, height: 14 }}/> : '📄'}
            {pdfLoading ? 'Leyendo...' : 'Importar PDF'}
            <input type="file" accept=".pdf,.PDF" style={{ display: 'none' }} onChange={handlePDF} disabled={pdfLoading}/>
          </label>
          <button className="btn btn-ghost btn-sm" onClick={() => nav(-1)}>Cancelar</button>
        </div>
      </div>

      {pdfErr && <div className="alert alert-error" style={{ marginBottom: 12 }}>{pdfErr}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-grid">

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
                {ESTADOS_METRO.map(e => <option key={e}>{e}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Prioridad</label>
              <select value={form.prioridad} onChange={e => set('prioridad', e.target.value)}>
                {PRIORIDADES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <SectionLabel>Ubicación</SectionLabel>
          <div className="form-grid form-grid-2">
            <div className="field">
              <label>Línea</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {LINEAS.map(l => {
                  const activas = form.linea ? form.linea.split(',') : []
                  const bg  = LINEA_COLORS[l] || '#444'
                  const fg  = LINEA_TEXT_DARK.has(l) ? '#111' : '#fff'
                  const sel = activas.includes(l)
                  return (
                    <span key={l} onClick={() => {
                      const nuevas = sel ? activas.filter(x => x !== l) : [...activas, l]
                      set('linea', nuevas.join(','))
                    }} style={{
                      background: sel ? bg : 'transparent',
                      color: sel ? fg : 'var(--txt3)',
                      border: `2px solid ${sel ? bg : 'var(--border)'}`,
                      borderRadius: 6, padding: '5px 10px',
                      fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      transition: 'all .15s',
                    }}>{l}</span>
                  )
                })}
              </div>
            </div>
            <div className="field">
              <label>Estación</label>
              <BuscadorEstacion key={pdfKey} value={form.estacion} onChange={v => set('estacion', v)} onLineaDetectada={handleLineaDetectada} />
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
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {['12h', '16h'].map(opt => (
                  <button key={opt} type="button" onClick={() => set('sla', opt)} style={{
                    flex: 1, padding: '10px', borderRadius: 8, fontWeight: 700,
                    fontSize: 15, cursor: 'pointer', border: '2px solid',
                    borderColor: form.sla === opt ? 'var(--accent)' : 'var(--border)',
                    background:  form.sla === opt ? 'var(--accent)' : 'transparent',
                    color:       form.sla === opt ? '#fff' : 'var(--txt2)',
                    transition: 'all .15s',
                  }}>{opt}</button>
                ))}
              </div>
              {form.fecha_limite_sla && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
                  ⏱ Límite: {form.fecha_limite_sla} {form.hora_limite_sla}
                </div>
              )}
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
