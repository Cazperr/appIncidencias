import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { estadoBadgeClass, prioBadgeClass, LINEA_COLORS, LINEA_TEXT_DARK, fmtTs } from '../lib/constants'
import ModalCierre from '../components/ModalCierre'
import ModalPendiente from '../components/ModalPendiente'
import ModalEditarIncidencia from '../components/ModalEditarIncidencia'

const TIPO_EVENTO_LABEL = {
  CREADA: 'Creada',
  ASIGNADA: '📋 Asignada',
  INICIO_TRABAJO: '🔧 Inicio trabajo',
  FIN_TRABAJO: '🏁 Fin trabajo',
  SOLUCIONADA: '✅ Solucionada',
  REABIERTA: '🔄 Reabierta',
  PENDIENTE_RESOLUCION: '⏳ Pendiente resolución',
  REANUDADA: '▶️ Reanudada',
}

export default function IncidenciaDetailPage() {
  const { id }   = useParams()
  const nav      = useNavigate()
  const { user } = useAuth()

  const [inc, setInc]           = useState(null)
  const [eventos, setEventos]   = useState([])
  const [escalados, setEsc]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [err, setErr]           = useState('')
  const [actionLoading, setAL]  = useState(false)
  const [showCierre, setShowCierre]       = useState(false)
  const [showPendiente, setShowPendiente] = useState(false)
  const [showReasignar, setShowReasignar] = useState(false)
  const [showEditar, setShowEditar] = useState(false)
  const [tab, setTab]           = useState('info')

  async function load() {
    setLoading(true)
    try {
      const [i, ev, esc] = await Promise.all([
        api.get(`/api/incidencias/${id}`),
        api.get(`/api/incidencias/${id}/eventos`),
        api.get(`/api/incidencias/${id}/escalados`),
      ])
      setInc(i); setEventos(ev); setEsc(esc)
    } catch(e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  async function accion(endpoint) {
    setAL(true); setErr('')
    try {
      await api.post(endpoint, {})
      await load()
    } catch(e) { setErr(e.message) }
    finally { setAL(false) }
  }

  if (loading) return <div className="loading-screen"><div className="spinner"/></div>
  if (err && !inc) return <div className="page"><div className="alert alert-error">{err}</div></div>

  const estado  = inc.estado_actual
  const lineas  = inc.linea ? inc.linea.split(',').filter(Boolean) : []
  const lc      = LINEA_COLORS[lineas[0]] || '#444'
  const tiempos = inc._tiempos || {}

  const canAsignar    = ['PENDIENTE NOVA','PENDIENTE MMAD','REVISAR'].includes(estado)
  const canIniciar    = estado === 'ASIGNADA'
  const canSolucionar = estado === 'EN CURSO'
  const canPendiente  = estado === 'EN CURSO'
  const canReanudar   = estado === 'PENDIENTE RESOLUCION'

  return (
    <div className="page" style={{ paddingTop: 0 }}>

      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${lc}22 0%, var(--bg2) 60%)`,
        borderBottom: `1px solid ${lc}44`,
        padding: '16px 16px 14px',
        margin: '0 -16px', marginBottom: 16,
        position: 'sticky', top: 0, zIndex: 50,
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <button onClick={() => nav(-1)} style={{
            background: 'var(--bg3)', border: '1px solid var(--border)',
            borderRadius: 6, padding: '6px 10px', cursor: 'pointer', color: 'var(--txt2)',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          {lineas.map(l => {
            const bg = LINEA_COLORS[l] || 'var(--border2)'
            const fg = LINEA_TEXT_DARK.has(l) ? '#111' : '#fff'
            return <span key={l} className="linea-dot" style={{ background: bg, color: fg, width: 36, height: 22, fontSize: 13 }}>{l}</span>
          })}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700 }}>
            {inc.ot ? `OT ${inc.ot}` : `#${inc.id}`}
          </span>
          <span className={estadoBadgeClass(estado)} style={{ marginLeft: 'auto' }}>{estado}</span>
        </div>

        {/* Botones de acción */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {canAsignar && (
            <button className="btn btn-warn btn-sm" disabled={actionLoading}
              onClick={() => accion(`/api/incidencias/${id}/asignar`)}>
              📋 Asignarme
            </button>
          )}
          {canIniciar && (
            <button className="btn btn-primary btn-sm" disabled={actionLoading}
              onClick={() => accion(`/api/incidencias/${id}/iniciar`)}>
              🔧 Iniciar trabajo
            </button>
          )}
          {canSolucionar && (
            <button className="btn btn-success btn-sm" disabled={actionLoading}
              onClick={() => setShowCierre(true)}>
              ✅ Solucionar
            </button>
          )}
          {canPendiente && (
            <button className="btn btn-danger btn-sm" disabled={actionLoading}
              onClick={() => setShowPendiente(true)}>
              ⏳ Pendiente resolución
            </button>
          )}
          {canReanudar && (
            <button className="btn btn-primary btn-sm" disabled={actionLoading}
              onClick={() => accion(`/api/incidencias/${id}/reanudar`)}>
              ▶️ Reanudar
            </button>
          )}
          {/* Editar — siempre visible para ADMIN/TECNICO */}
          {['ADMIN','TECNICO'].includes(user?.rol) && (
            <button className="btn btn-ghost btn-sm" disabled={actionLoading}
              onClick={() => setShowEditar(true)}>
              ✏️ Editar
            </button>
          )}
          {/* Asignar a — siempre visible para ADMIN */}
          {user?.rol === 'ADMIN' && (
            <button className="btn btn-ghost btn-sm" disabled={actionLoading}
              onClick={() => setShowReasignar(true)}>
              👥 Asignar a
            </button>
          )}
          {actionLoading && <div className="spinner" style={{ margin: 'auto 0' }}/>}
        </div>
        {err && <div className="alert alert-error" style={{ marginTop: 8, padding: '8px 10px', fontSize: 12 }}>{err}</div>}
      </div>

      {/* Banner estado PENDIENTE RESOLUCION */}
      {estado === 'PENDIENTE RESOLUCION' && (() => {
        const evPend = [...eventos].reverse().find(e => e.tipo_evento === 'PENDIENTE_RESOLUCION')
        const payload = evPend?.payload || {}
        return (
          <div className="card" style={{ marginBottom: 14, borderColor: 'var(--p-media)', background: 'rgba(245,130,14,.08)' }}>
            <div style={{ fontFamily: 'var(--font-cond)', fontSize: 12, fontWeight: 700, color: 'var(--p-media)', marginBottom: 6 }}>
              ⏳ PENDIENTE RESOLUCIÓN
            </div>
            {payload.motivo && <div style={{ fontSize: 13, color: 'var(--txt)', marginBottom: 4 }}>Motivo: <strong>{payload.motivo}</strong></div>}
            {payload.descripcion && <div style={{ fontSize: 12, color: 'var(--txt2)' }}>{payload.descripcion}</div>}
          </div>
        )
      })()}

      {/* Tiempos */}
      {['ASIGNADA','EN CURSO','SOLUCIONADA','PENDIENTE RESOLUCION'].includes(estado) && (
        <div className="card" style={{ marginBottom: 14, background: 'var(--bg3)', borderColor: 'var(--accent)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {tiempos.timestamp_asignada && (
            <div>
              <div style={{ fontSize: 10, color: 'var(--txt3)', fontFamily: 'var(--font-cond)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Asignada</div>
              <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--c-asignada)' }}>{fmtTs(tiempos.timestamp_asignada)}</div>
            </div>
          )}
          {tiempos.timestamp_inicio && (
            <div>
              <div style={{ fontSize: 10, color: 'var(--txt3)', fontFamily: 'var(--font-cond)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Inicio</div>
              <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--c-curso)' }}>{fmtTs(tiempos.timestamp_inicio)}</div>
            </div>
          )}
          {tiempos.timestamp_fin && (
            <div>
              <div style={{ fontSize: 10, color: 'var(--txt3)', fontFamily: 'var(--font-cond)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Fin</div>
              <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--c-sol)' }}>{fmtTs(tiempos.timestamp_fin)}</div>
            </div>
          )}
          {tiempos.duracion_trabajo_min != null && (
            <div style={{ marginLeft: 'auto' }}>
              <div style={{ fontSize: 10, color: 'var(--txt3)', fontFamily: 'var(--font-cond)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Duración</div>
              <div style={{ fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{tiempos.duracion_trabajo_min} min</div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: 'var(--bg2)', borderRadius: 'var(--radius)', padding: 4, border: '1px solid var(--border)' }}>
        {['info','eventos','escalados'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '8px 0',
            background: tab === t ? 'var(--bg4)' : 'transparent',
            border: 'none', borderRadius: 4, cursor: 'pointer',
            fontFamily: 'var(--font-cond)', fontSize: 12, fontWeight: 800,
            letterSpacing: '.06em', textTransform: 'uppercase',
            color: tab === t ? 'var(--txt)' : 'var(--txt3)',
            transition: 'all .15s',
          }}>
            {t === 'info' ? 'Info' : t === 'eventos' ? `Eventos (${eventos.length})` : `Visitas (${escalados.length})`}
          </button>
        ))}
      </div>

      {/* Tab INFO */}
      {tab === 'info' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10,  fontWeight: 600, fontSize: 14 }}>
          <InfoRow label="Equipo" value={inc.equipo_afectado} />
          <InfoRow label="Estacion" value={inc.estacion} />
          <InfoRow label="Zona" value={inc.zona} />
          <InfoRow label="Tipo aviso" value={inc.tipo_aviso} />
          <InfoRow label="Tipo" value={inc.tipo} />
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}><InfoRow label="Prioridad" value={<span className={prioBadgeClass(inc.prioridad)}>{inc.prioridad}</span>} /></div>
            <div style={{ flex: 1 }}><InfoRow label="SLA" value={inc.sla} /></div>
          </div>
          <InfoRow label="Limite SLA" value={inc.fecha_limite_sla ? `${inc.fecha_limite_sla} ${inc.hora_limite_sla || ''}` : null} />
          <InfoRow label="Solicitante" value={inc.solicitante} />
          <InfoRow label="Tecnico" value={inc.nombre_tecnico} />
          <InfoRow label="Fecha" value={inc.fecha_hora} />
          {inc.descripcion_fallo && (
            <div className="card" style={{ borderColor: 'var(--border2)' }}>
              <p style={{ fontSize: 12, color: 'var(--txt3)', fontFamily: 'var(--font-cond)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6}}>Descripcion del fallo</p>
              <p style={{ fontSize: 13, lineHeight: 1.6 }}>{inc.descripcion_fallo}</p>
            </div>
          )}
          {inc.comentarios_generales && (
            <div className="card" style={{ borderColor: 'var(--border2)' }}>
              <p style={{ fontSize: 11, color: 'var(--txt3)', fontFamily: 'var(--font-cond)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>Comentarios</p>
              <p style={{ fontSize: 13, lineHeight: 1.6 }}>{inc.comentarios_generales}</p>
            </div>
          )}
          {inc.duplicada ? <div className="alert alert-error">Posible duplicada de #{inc.duplicada_de}</div> : null}
        </div>
      )}

      {/* Tab EVENTOS */}
      {tab === 'eventos' && (
        <div className="timeline">
          {eventos.length === 0 ? (
            <p style={{ color: 'var(--txt3)', fontSize: 13, textAlign: 'center', padding: '30px 0' }}>Sin eventos</p>
          ) : eventos.map((ev, i) => (
            <div key={ev.id} className="timeline-item">
              <div className="timeline-line">
                <div className="timeline-dot" style={{
                  background: ev.tipo_evento === 'SOLUCIONADA' ? 'var(--c-sol)'
                    : ev.tipo_evento === 'PENDIENTE_RESOLUCION' ? 'var(--p-media)'
                    : ev.tipo_evento === 'INICIO_TRABAJO' ? 'var(--accent)'
                    : ev.tipo_evento === 'ASIGNADA' ? 'var(--c-asignada)'
                    : 'var(--border2)'
                }}/>
                {i < eventos.length - 1 && <div className="timeline-track"/>}
              </div>
              <div className="timeline-content">
                <div className="timeline-tipo">{TIPO_EVENTO_LABEL[ev.tipo_evento] || ev.tipo_evento}</div>
                <div className="timeline-ts">{fmtTs(ev.timestamp)}</div>
                {ev.usuario_nombre && <div className="timeline-user">👤 {ev.usuario_nombre}</div>}
                {ev.payload?.motivo && (
                  <div style={{ marginTop: 4, fontSize: 12, color: 'var(--p-media)' }}>Motivo: {ev.payload.motivo}</div>
                )}
                {ev.payload?.descripcion_trabajos && (
                  <div style={{ marginTop: 6, fontSize: 12, color: 'var(--txt2)', background: 'var(--bg3)', borderRadius: 6, padding: '8px 10px' }}>
                    {ev.payload.descripcion_trabajos}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab VISITAS */}
      {tab === 'escalados' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {escalados.length === 0 ? (
            <p style={{ color: 'var(--txt3)', fontSize: 13, textAlign: 'center', padding: '30px 0' }}>Sin visitas registradas</p>
          ) : escalados.map((e, idx) => (
            <div key={e.id} className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontFamily: 'var(--font-cond)', fontSize: 11, color: 'var(--txt3)' }}>VISITA {idx + 1}</span>
                {e.descripcion_trabajos?.startsWith('[VISITA PARCIAL]') && (
                  <span className="badge" style={{ background: 'rgba(245,130,14,.15)', color: 'var(--p-media)', border: '1px solid rgba(245,130,14,.3)' }}>PARCIAL</span>
                )}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, marginLeft: 'auto' }}>👤 {e.nombre_tecnico}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <InfoRow label="Inicio" value={e.fecha_inicio ? `${e.fecha_inicio} ${e.hora_inicio || ''}` : null} />
                <InfoRow label="Fin" value={e.fecha_fin ? `${e.fecha_fin} ${e.hora_fin || ''}` : null} />
                <InfoRow label="Desplazamiento" value={e.tiempo_desplazamiento ? `${e.tiempo_desplazamiento} min` : null} />
                <InfoRow label="Actuacion" value={e.tiempo_actuacion ? `${e.tiempo_actuacion} min` : null} />
                <InfoRow label="Tecnicos" value={e.num_tecnicos} />
              </div>
              {e.descripcion_trabajos && (
                <div style={{ marginTop: 10, fontSize: 13, color: 'var(--txt2)', lineHeight: 1.5 }}>
                  {e.descripcion_trabajos.replace('[VISITA PARCIAL] ', '')}
                </div>
              )}
              {e.pieza_cambiada ? (
                <div style={{ marginTop: 10, background: 'var(--bg3)', borderRadius: 6, padding: 10, fontSize: 12 }}>
                  <div style={{ color: 'var(--c-sol)', fontWeight: 700, marginBottom: 6 }}>Pieza cambiada</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <InfoRow label="S/N nueva" value={e.sn_nueva} />
                    <InfoRow label="P/N nueva" value={e.pn_nueva} />
                    <InfoRow label="S/N vieja" value={e.sn_vieja} />
                    <InfoRow label="P/N vieja" value={e.pn_vieja} />
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {showCierre && (
        <ModalCierre incId={id} onClose={() => setShowCierre(false)}
          onDone={() => { setShowCierre(false); load() }} />
      )}
      {showEditar && inc && (
        <ModalEditarIncidencia inc={inc} onClose={() => setShowEditar(false)}
          onDone={() => { setShowEditar(false); load() }} />
      )}
      {showReasignar && (
        <ModalReasignar inc={inc} onClose={() => setShowReasignar(false)}
          onDone={() => { setShowReasignar(false); load() }} />
      )}
      {showPendiente && (
        <ModalPendiente incId={id} onClose={() => setShowPendiente(false)}
          onDone={() => { setShowPendiente(false); load() }} />
      )}
    </div>
  )
}

function InfoRow({ label, value }) {
  if (!value && value !== 0) return null
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--txt3)', fontFamily: 'var(--font-cond)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--txt)', fontFamily: 'var(--font-mono)' }}>{value}</div>
    </div>
  )
}

function ModalReasignar({ inc, onClose, onDone }) {
  const [tecnicos, setTecnicos] = useState([])
  const [seleccionado, setSeleccionado] = useState(inc.nombre_tecnico || '')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    api.get('/api/usuarios')
      .then(us => setTecnicos(us.filter(u => u.activo && ['ADMIN','TECNICO'].includes(u.rol))))
      .catch(() => {})
  }, [])

  // Si viene de estado pendiente, al asignar pasa a ASIGNADA; si ya estaba asignada, mantiene estado
  const estadosQueAsignan = ['PENDIENTE NOVA','PENDIENTE MMAD','REVISAR']
  const nuevoEstado = estadosQueAsignan.includes(inc.estado_actual) ? 'ASIGNADA' : inc.estado_actual

  async function handleSubmit(e) {
    e.preventDefault()
    if (!seleccionado) { setErr('Selecciona un tecnico'); return }
    setLoading(true); setErr('')
    try {
      await api.put(`/api/incidencias/${inc.id}`, { nombre_tecnico: seleccionado, estado_actual: nuevoEstado })
      onDone()
    } catch(e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">👥 Asignar a técnico</span>
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        {inc.nombre_tecnico && (
          <div style={{ padding: '0 0 12px', fontSize: 12, color: 'var(--txt3)' }}>
            Asignado actualmente: <strong style={{ color: 'var(--txt2)' }}>{inc.nombre_tecnico}</strong>
          </div>
        )}
        {estadosQueAsignan.includes(inc.estado_actual) && (
          <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--c-asignada)', background: 'rgba(99,179,237,.1)', border: '1px solid rgba(99,179,237,.2)', borderRadius: 6, padding: '8px 10px' }}>
            La incidencia pasará a estado <strong>ASIGNADA</strong> automáticamente.
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field">
              <label>Técnico *</label>
              <select value={seleccionado} onChange={e => setSeleccionado(e.target.value)} required>
                <option value="">-- Seleccionar --</option>
                {tecnicos.map(t => (
                  <option key={t.id} value={t.nombre}>
                    {t.nombre} — {t.rol}
                  </option>
                ))}
              </select>
            </div>
            {err && <div className="alert alert-error">{err}</div>}
            <button className="btn btn-primary btn-full" type="submit" disabled={loading} style={{ padding: 14 }}>
              {loading ? <span className="spinner" style={{ width: 18, height: 18, borderTopColor: '#fff' }}/> : 'Confirmar asignación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}