import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { estadoBadgeClass, estadoAccentColor, prioBadgeClass, LINEA_COLORS, LINEA_TEXT_DARK, ESTADOS, ESTADOS_GENERICOS, fmtTs } from '../lib/constants'
import ModalCierre from '../components/ModalCierre'
import ModalCierreGenerico from '../forms/generic/ModalCierreGenerico'
import ModalCierreMetro from '../forms/metro/ModalCierreMetro'
import ModalPendiente from '../components/ModalPendiente'
import ModalEditarIncidencia from '../components/ModalEditarIncidencia'
import ModalVisitaGenerico from '../forms/generic/ModalVisitaGenerico'
import ModalCambiarEstado from '../components/ModalCambiarEstado'

function isEscaladoParcial(desc) {
  return desc?.startsWith('[ESCALADO PARCIAL]') || desc?.startsWith('[VISITA PARCIAL]')
}
function limpiarDescEscalado(desc) {
  if (!desc) return desc
  return desc.replace(/^\[(ESCALADO|VISITA) PARCIAL\]\s*/, '')
}

const IconEscalado = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v12"/>
    <path d="M7 8l5-5 5 5"/>
    <path d="M5 21h14"/>
  </svg>
)

function ActionButton({ variant, icon, children, onClick, disabled }) {
  return (
    <button
      type="button"
      className={`detail-action detail-action--${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon != null && (
        <span className="detail-action-icon" aria-hidden>
          {typeof icon === 'string' ? icon : icon}
        </span>
      )}
      <span>{children}</span>
    </button>
  )
}

const ESTADOS_FILTRO_GENERICO = ['PENDIENTE NOVA', 'PENDIENTE REVISAR', 'SOLUCIONADA']

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
  const { user, proyecto } = useAuth()

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
  const [showEscalado, setShowEscalado] = useState(false)
  const [showCambiarEstado, setShowCambiarEstado] = useState(false)
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

  const isMetro = proyecto?.tipo === 'metro'
  const canAsignar    = isMetro && ['PENDIENTE NOVA','PENDIENTE MMAD','REVISAR'].includes(estado)
  const canIniciar    = isMetro && estado === 'ASIGNADA'
  const canSolucionar = isMetro && estado === 'EN CURSO'
  const canPendiente  = isMetro && estado === 'EN CURSO'
  const canReanudar   = isMetro && estado === 'PENDIENTE RESOLUCION'
  const canEscalado   = !['SOLUCIONADA', 'FINALIZADA'].includes(estado)
  const headerAccent  = lineas.length ? lc : estadoAccentColor(estado)
  const isCerrada     = ['SOLUCIONADA', 'FINALIZADA'].includes(estado)
  const hasTiempos    = !!(tiempos.timestamp_asignada || tiempos.timestamp_inicio
    || tiempos.timestamp_fin || tiempos.duracion_trabajo_min != null)
  const ultimoEscalado = escalados.length > 0 ? escalados[escalados.length - 1] : null

  const accionesVisibles = [
    canAsignar, canIniciar, canSolucionar, canPendiente, canReanudar, canEscalado,
    ['ADMIN', 'TECNICO'].includes(user?.rol),
    user?.rol === 'ADMIN' && isMetro,
  ].filter(Boolean).length

  return (
    <div className="page detail-page">

      <div
        className="detail-header"
        style={{
          background: `linear-gradient(135deg, ${headerAccent}28 0%, var(--bg2) 55%)`,
          borderBottomColor: `${headerAccent}55`,
        }}
      >
        <div className="detail-header-top">
          <button type="button" className="detail-back" onClick={() => nav(-1)} aria-label="Volver">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          {lineas.map(l => {
            const bg = LINEA_COLORS[l] || 'var(--border2)'
            const fg = LINEA_TEXT_DARK.has(l) ? '#111' : '#fff'
            return <span key={l} className="linea-dot" style={{ background: bg, color: fg, width: 36, height: 22, fontSize: 13 }}>{l}</span>
          })}
          <span className="detail-title">{inc.ot ? `OT ${inc.ot}` : `#${inc.id}`}</span>
          <button
            type="button"
            className={`${estadoBadgeClass(estado)} detail-estado-badge`}
            onClick={() => setShowCambiarEstado(true)}
            title="Cambiar estado"
          >
            {estado}
          </button>
        </div>

        <div className={`detail-actions${accionesVisibles <= 2 ? ' detail-actions--inline' : ''}`}>
          {canAsignar && (
            <ActionButton variant="warn" icon="📋" disabled={actionLoading}
              onClick={() => accion(`/api/incidencias/${id}/asignar`)}>
              Asignarme
            </ActionButton>
          )}
          {canIniciar && (
            <ActionButton variant="primary" icon="🔧" disabled={actionLoading}
              onClick={() => accion(`/api/incidencias/${id}/iniciar`)}>
              Iniciar trabajo
            </ActionButton>
          )}
          {canSolucionar && (
            <ActionButton variant="success" icon="✓" disabled={actionLoading}
              onClick={() => setShowCierre(true)}>
              Solucionar
            </ActionButton>
          )}
          {canPendiente && (
            <ActionButton variant="danger" icon="⏳" disabled={actionLoading}
              onClick={() => setShowPendiente(true)}>
              Pendiente resolución
            </ActionButton>
          )}
          {canReanudar && (
            <ActionButton variant="primary" icon="▶" disabled={actionLoading}
              onClick={() => accion(`/api/incidencias/${id}/reanudar`)}>
              Reanudar
            </ActionButton>
          )}
          {canEscalado && (
            <ActionButton variant="escalado" icon={<IconEscalado />} disabled={actionLoading}
              onClick={() => setShowEscalado(true)}>
              Añadir escalado
            </ActionButton>
          )}
          {['ADMIN', 'TECNICO'].includes(user?.rol) && (
            <ActionButton variant="neutral" icon="✎" disabled={actionLoading}
              onClick={() => setShowEditar(true)}>
              Editar
            </ActionButton>
          )}
          {user?.rol === 'ADMIN' && isMetro && (
            <ActionButton variant="neutral" icon="👥" disabled={actionLoading}
              onClick={() => setShowReasignar(true)}>
              Asignar a
            </ActionButton>
          )}
        </div>
        {actionLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
            <div className="spinner"/>
          </div>
        )}
        {err && <div className="alert alert-error" style={{ marginTop: 10, padding: '8px 10px', fontSize: 12 }}>{err}</div>}
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

      {isCerrada && (
        <div className="detail-banner detail-banner--sol">
          <span className="detail-banner-icon">✓</span>
          <div>
            <div className="detail-banner-title">Incidencia solucionada</div>
            {ultimoEscalado ? (
              <div className="detail-banner-sub">
                Último escalado: {ultimoEscalado.fecha_fin || ultimoEscalado.fecha_inicio}
                {ultimoEscalado.hora_fin ? ` · ${ultimoEscalado.hora_fin}` : ''}
                {ultimoEscalado.nombre_tecnico ? ` — ${ultimoEscalado.nombre_tecnico}` : ''}
              </div>
            ) : inc.fecha_hora ? (
              <div className="detail-banner-sub">Aviso registrado: {inc.fecha_hora}</div>
            ) : null}
          </div>
        </div>
      )}

      {hasTiempos && (
        <div className="card detail-tiempos-card">
          {tiempos.timestamp_asignada && (
            <div>
              <div className="detail-tiempo-label">Asignada</div>
              <div className="detail-tiempo-val" style={{ color: 'var(--c-asignada)' }}>{fmtTs(tiempos.timestamp_asignada)}</div>
            </div>
          )}
          {tiempos.timestamp_inicio && (
            <div>
              <div className="detail-tiempo-label">Inicio</div>
              <div className="detail-tiempo-val" style={{ color: 'var(--c-curso)' }}>{fmtTs(tiempos.timestamp_inicio)}</div>
            </div>
          )}
          {tiempos.timestamp_fin && (
            <div>
              <div className="detail-tiempo-label">Fin</div>
              <div className="detail-tiempo-val" style={{ color: 'var(--c-sol)' }}>{fmtTs(tiempos.timestamp_fin)}</div>
            </div>
          )}
          {tiempos.duracion_trabajo_min != null && (
            <div className="detail-tiempo-duracion">
              <div className="detail-tiempo-label">Duración</div>
              <div className="detail-tiempo-val detail-tiempo-val--bold">{tiempos.duracion_trabajo_min} min</div>
            </div>
          )}
        </div>
      )}

      <div className="detail-tabs">
        {['info', 'eventos', 'escalados'].map(t => (
          <button
            key={t}
            type="button"
            className={`detail-tab${tab === t ? ' detail-tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'info' ? 'Info' : t === 'eventos' ? `Eventos (${eventos.length})` : `Escalados (${escalados.length})`}
          </button>
        ))}
      </div>

      {/* Tab INFO */}
      {tab === 'info' && (
        <>
          <div className="detail-info-grid">
            <InfoRow label="Equipo" value={inc.equipo_afectado} />
            <InfoRow label="Estación" value={inc.estacion} />
            <InfoRow label="Zona" value={inc.zona} />
            <InfoRow label="Tipo aviso" value={inc.tipo_aviso} />
            <InfoRow label="Tipo" value={inc.tipo} />
            <InfoRow label="Prioridad" value={inc.prioridad ? <span className={prioBadgeClass(inc.prioridad)}>{inc.prioridad}</span> : null} />
            <InfoRow label="SLA" value={inc.sla} />
            <InfoRow label="Límite SLA" value={inc.fecha_limite_sla ? `${inc.fecha_limite_sla} ${inc.hora_limite_sla || ''}` : null} />
            <InfoRow label="Solicitante" value={inc.solicitante} />
            <InfoRow label="Técnico" value={inc.nombre_tecnico} />
            <InfoRow label="Fecha aviso" value={inc.fecha_hora} />
          </div>
          {inc.descripcion_fallo && (
            <div className="card detail-info-full" style={{ marginTop: 12, borderColor: 'var(--border2)' }}>
              <p className="card-block-label">Descripción del fallo</p>
              <p style={{ fontSize: 13, lineHeight: 1.6 }}>{inc.descripcion_fallo}</p>
            </div>
          )}
          {inc.comentarios_generales && (
            <div className="card detail-info-full" style={{ marginTop: 10, borderColor: 'var(--border2)' }}>
              <p className="card-block-label">Comentarios</p>
              <p style={{ fontSize: 13, lineHeight: 1.6 }}>{inc.comentarios_generales}</p>
            </div>
          )}
          {inc.duplicada ? (
            <div className="alert alert-error" style={{ marginTop: 10 }}>Posible duplicada de #{inc.duplicada_de}</div>
          ) : null}
        </>
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

      {tab === 'escalados' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {escalados.length === 0 ? (
            <p style={{ color: 'var(--txt3)', fontSize: 13, textAlign: 'center', padding: '30px 0' }}>
              Sin escalados registrados
            </p>
          ) : escalados.map((e, idx) => (
            <div key={e.id} className="card detail-escalado-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span className="detail-escalado-num">Escalado {idx + 1}</span>
                {isEscaladoParcial(e.descripcion_trabajos) && (
                  <span className="badge" style={{ background: 'rgba(139,92,246,.15)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,.35)' }}>
                    PARCIAL
                  </span>
                )}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, marginLeft: 'auto', color: 'var(--txt2)' }}>
                  {e.nombre_tecnico}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <InfoRow label="Inicio" value={e.fecha_inicio ? `${e.fecha_inicio} ${e.hora_inicio || ''}` : null} />
                <InfoRow label="Fin" value={e.fecha_fin ? `${e.fecha_fin} ${e.hora_fin || ''}` : null} />
                <InfoRow label="Desplazamiento" value={e.tiempo_desplazamiento ? `${e.tiempo_desplazamiento} min` : null} />
                <InfoRow label="Actuación" value={e.tiempo_actuacion ? `${e.tiempo_actuacion} min` : null} />
                <InfoRow label="Técnicos" value={e.num_tecnicos} />
              </div>
              {e.descripcion_trabajos && (
                <div style={{ marginTop: 10, fontSize: 13, color: 'var(--txt2)', lineHeight: 1.5 }}>
                  {limpiarDescEscalado(e.descripcion_trabajos)}
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
        isMetro
          ? <ModalCierreMetro incId={id} onClose={() => setShowCierre(false)}
              onDone={() => { setShowCierre(false); load() }} />
          : <ModalCierreGenerico incId={id} onClose={() => setShowCierre(false)}
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
      {showCambiarEstado && inc && (
        <ModalCambiarEstado
          inc={inc}
          estados={isMetro ? ESTADOS : ESTADOS_FILTRO_GENERICO}
          onClose={() => setShowCambiarEstado(false)}
          onDone={() => { setShowCambiarEstado(false); load() }}
        />
      )}
      {showEscalado && (
        <ModalVisitaGenerico incId={id} isMetro={isMetro} onClose={() => setShowEscalado(false)}
          onDone={() => { setShowEscalado(false); load() }} />
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