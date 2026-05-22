import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { LINEA_COLORS, ESTADO_COLOR } from '../lib/constants'

const ESTADOS_CERRADOS = ['SOLUCIONADA', 'FINALIZADA']

export default function DashboardProyecto() {
  const { proyecto } = useAuth()
  const isMetro = proyecto?.id === 'metro-madrid'
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr]         = useState('')

  useEffect(() => {
    setLoading(true)
    api.get('/api/dashboard/stats')
      .then(setStats)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false))
  }, [proyecto?.id])

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (err) return <div className="page"><div className="alert alert-error">{err}</div></div>

  const totalAbiertos = isMetro
    ? ['PENDIENTE NOVA', 'PENDIENTE MMAD', 'REVISAR', 'ASIGNADA', 'EN CURSO']
        .reduce((s, e) => s + (stats.por_estado[e] || 0), 0)
    : Object.entries(stats.por_estado)
        .filter(([e]) => !ESTADOS_CERRADOS.includes(e))
        .reduce((s, [, n]) => s + n, 0)

  const totalCerrados = ESTADOS_CERRADOS.reduce((s, e) => s + (stats.por_estado[e] || 0), 0)
  const tieneLineas = Object.keys(stats.por_linea).length > 0

  return (
    <div className="page page-wide">
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">
            {proyecto?.nombre || 'Resumen operacional'}
          </div>
        </div>
      </div>

      <div className="dash-kpi-grid">
        <KpiCard label="Abiertas" value={totalAbiertos} color="#60a5fa" />
        <KpiCard label="Cerradas" value={totalCerrados} color="#4ade80" />
        {isMetro && <KpiCard label="SLA vencido" value={stats.sla_vencido} color="#f87171" />}
        <KpiCard label="Duplicadas" value={stats.n_duplicadas} color="#fbbf24" />
        {!isMetro && (
          <KpiCard
            label="Total"
            value={Object.values(stats.por_estado).reduce((a, b) => a + b, 0)}
            color="#a78bfa"
          />
        )}
      </div>

      {stats.t_medio_dias != null && (
        <div className="card" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 34, fontWeight: 600, color: 'var(--accent)', letterSpacing: '-.03em', lineHeight: 1 }}>
            {stats.t_medio_dias}d
          </div>
          <div>
            <div className="section-label" style={{ marginBottom: 2 }}>Tiempo medio resolución</div>
            <div style={{ fontSize: 12, color: 'var(--txt3)' }}>Basado en incidencias cerradas</div>
          </div>
        </div>
      )}

      <div className="section-label">Por estado</div>
      <div className="card" style={{ marginBottom: 14 }}>
        {Object.entries(stats.por_estado).map(([estado, n]) => (
          <EstadoBar key={estado} estado={estado} n={n}
            total={Object.values(stats.por_estado).reduce((a, b) => a + b, 0)} />
        ))}
      </div>

      {tieneLineas && (
        <>
          <div className="section-label">Por línea</div>
          <div className="card" style={{ marginBottom: 14 }}>
            {Object.entries(stats.por_linea).map(([linea, n], i, arr) => (
              <div key={linea} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span className="linea-dot" style={{
                  background: LINEA_COLORS[linea] || '#444',
                  color: ['L3', 'L12'].includes(linea) ? '#111' : '#fff',
                  fontSize: 10,
                }}>{linea}</span>
                <div style={{ flex: 1, height: 3, background: 'var(--bg4)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 2, background: LINEA_COLORS[linea] || 'var(--accent)', width: `${Math.min(100, n * 10)}%`, transition: 'width .4s ease' }} />
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--txt)', minWidth: 24, textAlign: 'right' }}>{n}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {stats.top_equipos.length > 0 && (
        <>
          <div className="section-label">Top equipos</div>
          <div className="card" style={{ marginBottom: 14 }}>
            {stats.top_equipos.slice(0, 6).map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < 5 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--txt3)', width: 16, flexShrink: 0 }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: 12, color: 'var(--txt)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.equipo}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>{item.n}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {stats.tecnicos_activos.length > 0 && (
        <>
          <div className="section-label">Técnicos activos · 7 días</div>
          <div className="card" style={{ marginBottom: 14 }}>
            {stats.tecnicos_activos.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < stats.tecnicos_activos.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--accent-glow)', border: '1px solid rgba(59,130,246,.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: '#60a5fa',
                }}>
                  {(t.usuario_nombre || '?').charAt(0).toUpperCase()}
                </div>
                <span style={{ flex: 1, fontSize: 13, color: 'var(--txt)' }}>{t.usuario_nombre}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--txt3)' }}>{t.n} acciones</span>
              </div>
            ))}
          </div>
        </>
      )}

      {stats.por_mes.length > 0 && (
        <>
          <div className="section-label">Evolución mensual</div>
          <div className="card" style={{ marginBottom: 14 }}>
            {stats.por_mes.map((m, i) => {
              const max = Math.max(...stats.por_mes.map(x => x.n))
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--txt3)', minWidth: 54 }}>{m.mes}</span>
                  <div style={{ flex: 1, height: 4, background: 'var(--bg4)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 2, background: 'var(--accent)', width: `${(m.n / max) * 100}%`, opacity: 0.5 + (m.n / max) * 0.5 }} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--txt)', minWidth: 28, textAlign: 'right' }}>{m.n}</span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function KpiCard({ label, value, color }) {
  return (
    <div className="dash-kpi">
      <div className="dash-kpi-value" style={{ color }}>{value ?? 0}</div>
      <div className="section-label" style={{ marginBottom: 0, marginTop: 6 }}>{label}</div>
    </div>
  )
}

function EstadoBar({ estado, n, total }) {
  const pct = total > 0 ? Math.round((n / total) * 100) : 0
  const color = ESTADO_COLOR[estado] || 'var(--txt3)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color, minWidth: 148, fontWeight: 500 }}>{estado}</span>
      <div style={{ flex: 1, height: 3, background: 'var(--bg4)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 2, background: color, width: `${pct}%`, transition: 'width .4s ease' }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--txt)', minWidth: 24, textAlign: 'right' }}>{n}</span>
    </div>
  )
}
