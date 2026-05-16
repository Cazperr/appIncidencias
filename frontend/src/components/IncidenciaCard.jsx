import { useNavigate } from 'react-router-dom'
import { estadoBadgeClass, prioBadgeClass, LINEA_COLORS, LINEA_TEXT_DARK, slaEnRiesgo, slaVencido } from '../lib/constants'

export default function IncidenciaCard({ inc }) {
  const nav = useNavigate()
  const lineas  = inc.linea ? inc.linea.split(',').filter(Boolean) : []
  const lc      = LINEA_COLORS[lineas[0]] || '#444'
  const vencido = slaVencido(inc.fecha_limite_sla, inc.hora_limite_sla)
  const riesgo  = !vencido && slaEnRiesgo(inc.fecha_limite_sla, inc.hora_limite_sla)

  return (
    <div className="card" onClick={() => nav(`/incidencia/${inc.id}`)}
      style={{
        cursor: 'pointer', marginBottom: 10,
        borderLeft: `3px solid ${vencido ? 'var(--c-revisar)' : riesgo ? 'var(--p-media)' : lc}`,
        transition: 'background .15s',
      }}
      onTouchStart={e => e.currentTarget.style.background = 'var(--bg3)'}
      onTouchEnd={e => e.currentTarget.style.background = ''}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {lineas.map(l => {
            const bg = LINEA_COLORS[l] || '#444'
            const fg = LINEA_TEXT_DARK.has(l) ? '#111' : '#fff'
            return <span key={l} className="linea-dot" style={{ background: bg, color: fg }}>{l}</span>
          })}
          <span className={estadoBadgeClass(inc.estado_actual)}>{inc.estado_actual}</span>
          {inc.duplicada ? <span className="badge" style={{ background: 'rgba(229,0,20,.1)', color: '#ff6b6b', border: '1px solid rgba(229,0,20,.2)' }}>DUP</span> : null}
          {vencido && <span className="badge badge-sla">⚠ SLA VENCIDO</span>}
          {riesgo  && <span className="badge badge-sla-riesgo">⏰ SLA &lt;8h</span>}
        </div>
        <span className={prioBadgeClass(inc.prioridad)}>{inc.prioridad}</span>
      </div>

      <div style={{ marginTop: 10, display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
        {inc.ot && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: 'var(--txt)' }}>OT {inc.ot}</span>}
        {inc.equipo_afectado && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt2)' }}>{inc.equipo_afectado}</span>}
      </div>

      {inc.estacion && (
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt2)', marginTop: 5 }}>
          📍 {inc.estacion}
        </div>
      )}

      {inc.descripcion_fallo && (
        <div style={{ marginTop: 7, fontSize: 13, fontWeight: 600, color: 'var(--txt2)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {inc.descripcion_fallo}
        </div>
      )}

      <div style={{ marginTop: 10, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {inc.nombre_tecnico && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt3)' }}>👤 {inc.nombre_tecnico}</span>}
        {inc.fecha_hora && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt3)', marginLeft: 'auto' }}>{inc.fecha_hora.substring(0,10)}</span>}
        {inc.fecha_limite_sla && (
          <span style={{ fontSize: 12, fontWeight: 600, color: vencido ? 'var(--c-revisar)' : riesgo ? 'var(--p-media)' : 'var(--txt3)' }}>
            SLA {inc.fecha_limite_sla} {inc.hora_limite_sla || ''}
          </span>
        )}
      </div>
    </div>
  )
}