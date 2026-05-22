import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { estadoBadgeClass, estadoAccentColor, prioBadgeClass, LINEA_COLORS, LINEA_TEXT_DARK, slaEnRiesgo, slaVencido } from '../lib/constants'

const IconUser = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, opacity: .6 }}>
    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
)
const IconPin = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, opacity: .6 }}>
    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
)
const IconTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
)

function CardField({ label, value, mono }) {
  if (!value) return null
  return (
    <div>
      <div className="card-field-label">{label}</div>
      <div className={`card-field-value${mono ? ' mono' : ''}`}>{value}</div>
    </div>
  )
}

function CardBadges({ children }) {
  return <div className="inc-card-badges">{children}</div>
}

function CardShell({ inc, accentColor, variant, onDelete, children }) {
  const nav = useNavigate()
  const { user } = useAuth()

  function handleDelete(e) {
    e.stopPropagation()
    if (!window.confirm(`¿Eliminar incidencia${inc.ot ? ' OT ' + inc.ot : ' #' + inc.id}?`)) return
    api.delete(`/api/incidencias/${inc.id}`)
      .then(() => onDelete && onDelete(inc.id))
      .catch(err => alert(err.message))
  }

  return (
    <div
      className={`inc-card inc-card--${variant}`}
      onClick={() => nav(`/incidencia/${inc.id}`)}
      onTouchStart={e => e.currentTarget.classList.add('inc-card--touch')}
      onTouchEnd={e   => e.currentTarget.classList.remove('inc-card--touch')}
    >
      <div className="inc-card-accent" style={{ background: accentColor }} />
      {children}
      {user?.rol === 'ADMIN' && (
        <button
          onClick={handleDelete}
          title="Eliminar"
          className="inc-card-delete-btn"
        >
          <IconTrash />
        </button>
      )}
    </div>
  )
}

function IncidenciaCardMetro({ inc, vencido, riesgo }) {
  const lineas = inc.linea ? inc.linea.split(',').filter(Boolean) : []

  return (
    <>
      <CardBadges>
        {lineas.map(l => {
          const bg = LINEA_COLORS[l] || '#444'
          const fg = LINEA_TEXT_DARK.has(l) ? '#111' : '#fff'
          return <span key={l} className="linea-dot" style={{ background: bg, color: fg }}>{l}</span>
        })}
        <span className={estadoBadgeClass(inc.estado_actual)}>{inc.estado_actual}</span>
        {inc.duplicada ? (
          <span className="badge" style={{ background: 'rgba(239,68,68,.08)', color: '#f87171', border: '1px solid rgba(239,68,68,.2)' }}>DUP</span>
        ) : null}
        {vencido && <span className="badge badge-sla">SLA</span>}
        {riesgo && <span className="badge badge-sla-riesgo">⏰ &lt;8h</span>}
        <span className={`${prioBadgeClass(inc.prioridad)} badge-prio`}>{inc.prioridad}</span>
      </CardBadges>

      <div className={`inc-card-body${inc.descripcion_fallo ? '' : ' inc-card-body--no-desc'}`}>
        <div className="inc-card-col inc-card-col-metro-info">
          <div className="inc-card-metro-head">
            {inc.ot && <span className="inc-card-ot">OT {inc.ot}</span>}
            {inc.equipo_afectado && <span className="inc-card-equipo">{inc.equipo_afectado}</span>}
          </div>
          {inc.estacion && (
            <div className="inc-card-estacion"><IconPin />{inc.estacion}</div>
          )}
        </div>

        {inc.descripcion_fallo && (
          <div className="inc-card-col inc-card-col-desc">
            <div className="card-block-label">Fallo</div>
            <div className="card-fallo-text">{inc.descripcion_fallo}</div>
          </div>
        )}

        <div className="inc-card-col inc-card-col-foot inc-card-col-foot-metro">
          {inc.nombre_tecnico && (
            <span className="inc-card-meta-line">
              <span className="card-field-label">Técnico</span>
              <strong>{inc.nombre_tecnico}</strong>
            </span>
          )}
          {inc.fecha_hora && (
            <span className="inc-card-meta-line">
              <span className="card-field-label">Aviso</span>
              <strong>{inc.fecha_hora.substring(0, 10)}</strong>
            </span>
          )}
          {inc.fecha_limite_sla && (
            <span className="inc-card-meta-line"
              style={{ color: vencido ? '#ef4444' : riesgo ? '#f59e0b' : undefined, fontWeight: vencido || riesgo ? 600 : undefined }}>
              <span className="card-field-label">SLA</span>
              <strong>{inc.fecha_limite_sla}{inc.hora_limite_sla ? ` · ${inc.hora_limite_sla}` : ''}</strong>
            </span>
          )}
        </div>
      </div>
    </>
  )
}

function IncidenciaCardGenerica({ inc, vencido, riesgo }) {
  const hasMeta = inc.equipo_afectado || inc.zona || inc.solicitante || inc.nombre_tecnico
  const hasAns = inc.sla === 'ANS'
  const hasFoot = inc.fecha_hora || inc.fecha_limite_sla

  return (
    <>
      <CardBadges>
        <span className={estadoBadgeClass(inc.estado_actual)}>{inc.estado_actual}</span>
        {inc.tipo_aviso && (
          <span className="badge" style={{ background: 'var(--bg4)', color: 'var(--txt2)', border: '1px solid var(--border2)' }}>
            {inc.tipo_aviso}
          </span>
        )}
        {hasAns && (
          <span className="badge" style={{ background: 'rgba(59,130,246,.10)', color: '#60a5fa', border: '1px solid rgba(59,130,246,.22)' }}>ANS</span>
        )}
        {inc.duplicada ? (
          <span className="badge" style={{ background: 'rgba(239,68,68,.08)', color: '#f87171', border: '1px solid rgba(239,68,68,.2)' }}>DUP</span>
        ) : null}
        {vencido && <span className="badge badge-sla">SLA</span>}
        {riesgo && <span className="badge badge-sla-riesgo">⏰ &lt;8h</span>}
        <span className={`${prioBadgeClass(inc.prioridad)} badge-prio`}>{inc.prioridad}</span>
      </CardBadges>

      <div className={`inc-card-body${hasFoot ? '' : ' inc-card-body--no-foot'}`}>
        <div className="inc-card-col inc-card-col-id">
          {inc.ot ? (
            <><div className="card-field-label">OT</div><div className="inc-card-ot">{inc.ot}</div></>
          ) : (
            <><div className="card-field-label">Incidencia</div><div className="inc-card-id-num">#{inc.id}</div></>
          )}
        </div>

        <div className="inc-card-col inc-card-col-main">
          {hasMeta && (
            <div className="card-field-grid">
              <CardField label="Equipo" value={inc.equipo_afectado} />
              <CardField label="Zona" value={inc.zona} />
              <CardField label="Solicitante" value={inc.solicitante} />
              <CardField label="Técnico" value={inc.nombre_tecnico} />
            </div>
          )}
          {inc.descripcion_fallo && (
            <div className="inc-card-fallo-block">
              <div className="card-block-label">Fallo</div>
              <div className="card-fallo-text">{inc.descripcion_fallo}</div>
            </div>
          )}
        </div>

        {hasFoot && (
          <div className="card-footer-meta inc-card-col inc-card-col-foot">
            {inc.fecha_hora && <span>Aviso: <strong>{inc.fecha_hora}</strong></span>}
            {inc.fecha_limite_sla && (
              <span style={{ color: vencido ? '#ef4444' : riesgo ? '#f59e0b' : undefined, fontWeight: vencido || riesgo ? 600 : undefined }}>
                Límite SLA: <strong>{inc.fecha_limite_sla}{inc.hora_limite_sla ? ` · ${inc.hora_limite_sla}` : ''}</strong>
              </span>
            )}
          </div>
        )}
      </div>
    </>
  )
}

export default function IncidenciaCard({ inc, onDelete }) {
  const { proyecto } = useAuth()
  const isMetro = proyecto?.tipo === 'metro'
  const vencido = slaVencido(inc.fecha_limite_sla, inc.hora_limite_sla)
  const riesgo  = !vencido && slaEnRiesgo(inc.fecha_limite_sla, inc.hora_limite_sla)
  const accentColor = vencido ? '#ef4444' : riesgo ? '#f59e0b' : estadoAccentColor(inc.estado_actual)

  return (
    <CardShell inc={inc} accentColor={accentColor} variant={isMetro ? 'metro' : 'generic'} onDelete={onDelete}>
      {isMetro
        ? <IncidenciaCardMetro inc={inc} vencido={vencido} riesgo={riesgo} />
        : <IncidenciaCardGenerica inc={inc} vencido={vencido} riesgo={riesgo} />}
    </CardShell>
  )
}
