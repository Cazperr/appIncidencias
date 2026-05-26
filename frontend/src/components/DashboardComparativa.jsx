import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { ESTADO_COLOR } from '../lib/constants'

const PROY_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#22c55e', '#ef4444', '#ec4899', '#14b8a6']

export default function DashboardComparativa({ embedded = false, activeProjectId, onSelectProject }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr]         = useState('')

  useEffect(() => {
    api.get('/api/dashboard/comparativa')
      .then(setData)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className={embedded ? 'dash-compare-loading' : 'loading-screen'}>
        <div className="spinner"/>
      </div>
    )
  }

  if (err) {
    return <div className="alert alert-error">{err}</div>
  }

  if (!data?.proyectos?.length) {
    return (
      <p style={{ color: 'var(--txt3)', textAlign: 'center', padding: embedded ? 24 : 40 }}>
        No hay proyectos con datos
      </p>
    )
  }

  const { proyectos, meses, por_mes_proyecto, totales } = data
  const maxPorProyecto = Math.max(...proyectos.map(p => p.total), 1)
  const maxMesGlobal = Math.max(
    ...meses.map(m => proyectos.reduce((s, p) => s + (por_mes_proyecto[p.id]?.[m] || 0), 0)),
    1
  )

  return (
    <div className={embedded ? 'dash-compare-embedded' : 'page page-wide'}>
      <div className={embedded ? 'dash-compare-header' : 'page-header'}>
        <div>
          <div className={embedded ? 'dash-compare-title' : 'page-title'}>Vista global</div>
          <div className={embedded ? 'dash-compare-sub' : 'page-subtitle'}>Comparación entre proyectos</div>
        </div>
      </div>

      <div className="dash-kpi-grid">
        <KpiCard label="Proyectos" value={totales.proyectos} color="#60a5fa" />
        <KpiCard label="Total incidencias" value={totales.incidencias} color="#a78bfa" />
        <KpiCard label="Abiertas" value={totales.abiertas} color="#fbbf24" />
        <KpiCard label="Cerradas" value={totales.cerradas} color="#4ade80" />
      </div>

      <div className="section-label">Incidencias por proyecto</div>
      <div className="card dash-compare-card">
        {proyectos.map((p, i) => {
          const isActive = activeProjectId === p.id
          return (
            <div
              key={p.id}
              className={`dash-proyecto-row${isActive ? ' dash-proyecto-row--active' : ''}${onSelectProject ? ' dash-proyecto-row--clickable' : ''}`}
              onClick={onSelectProject ? () => onSelectProject(p) : undefined}
              role={onSelectProject ? 'button' : undefined}
              tabIndex={onSelectProject ? 0 : undefined}
              onKeyDown={onSelectProject ? (e) => e.key === 'Enter' && onSelectProject(p) : undefined}
            >
              <div className="dash-proyecto-id">
                <span className="dash-proyecto-badge" style={{ background: PROY_COLORS[i % PROY_COLORS.length] }}>
                  {p.initials}
                </span>
                <div>
                  <div className="dash-proyecto-nombre">{p.nombre}</div>
                  <div className="dash-proyecto-sub">
                    {p.abiertas} abiertas · {p.cerradas} cerradas
                  </div>
                </div>
              </div>
              <div className="dash-bar-track">
                <div
                  className="dash-bar-fill"
                  style={{
                    width: `${(p.total / maxPorProyecto) * 100}%`,
                    background: PROY_COLORS[i % PROY_COLORS.length],
                  }}
                />
              </div>
              <span className="dash-bar-num">{p.total}</span>
            </div>
          )
        })}
      </div>

      {meses.length > 0 && (
        <>
          <div className="section-label">Evolución mensual por proyecto</div>
          <div className="card dash-compare-card dash-mes-table-wrap">
            <table className="dash-mes-table">
              <thead>
                <tr>
                  <th>Mes</th>
                  {proyectos.map((p, i) => (
                    <th key={p.id}>
                      <span className="dash-mes-th" style={{ color: PROY_COLORS[i % PROY_COLORS.length] }}>
                        {p.initials}
                      </span>
                    </th>
                  ))}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {meses.map(mes => {
                  const vals = proyectos.map(p => por_mes_proyecto[p.id]?.[mes] || 0)
                  const totalMes = vals.reduce((a, b) => a + b, 0)
                  return (
                    <tr key={mes}>
                      <td className="dash-mes-label">{mes}</td>
                      {vals.map((n, i) => (
                        <td key={proyectos[i].id} className="dash-mes-cell">{n || '—'}</td>
                      ))}
                      <td className="dash-mes-total">
                        <div className="dash-mes-total-inner">
                          <div
                            className="dash-bar-fill dash-bar-fill--inline"
                            style={{
                              width: `${(totalMes / maxMesGlobal) * 100}%`,
                              background: 'var(--accent)',
                            }}
                          />
                          <span>{totalMes}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="section-label">Tendencia mensual (global)</div>
          <div className="card dash-compare-card">
            {meses.map(mes => {
              const totalMes = proyectos.reduce((s, p) => s + (por_mes_proyecto[p.id]?.[mes] || 0), 0)
              return (
                <div key={mes} className="dash-mes-global-row">
                  <span className="dash-mes-label">{mes}</span>
                  <div className="dash-bar-track">
                    <div
                      className="dash-bar-fill"
                      style={{ width: `${(totalMes / maxMesGlobal) * 100}%`, background: 'var(--accent)' }}
                    />
                  </div>
                  <span className="dash-bar-num">{totalMes}</span>
                </div>
              )
            })}
          </div>
        </>
      )}

      <div className="section-label">Estados por proyecto</div>
      <div className="dash-proyectos-grid">
        {proyectos.map((p, i) => (
          <div
            key={p.id}
            className={`card dash-proyecto-card${activeProjectId === p.id ? ' dash-proyecto-card--active' : ''}${onSelectProject ? ' dash-proyecto-card--clickable' : ''}`}
            onClick={onSelectProject ? () => onSelectProject(p) : undefined}
            role={onSelectProject ? 'button' : undefined}
            tabIndex={onSelectProject ? 0 : undefined}
          >
            <div className="dash-proyecto-card-head">
              <span className="dash-proyecto-badge" style={{ background: PROY_COLORS[i % PROY_COLORS.length] }}>
                {p.initials}
              </span>
              <span className="dash-proyecto-nombre">{p.nombre}</span>
            </div>
            {Object.entries(p.por_estado).length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--txt3)' }}>Sin datos</p>
            ) : (
              Object.entries(p.por_estado).map(([estado, n]) => (
                <EstadoBar key={estado} estado={estado} n={n} total={p.total} />
              ))
            )}
          </div>
        ))}
      </div>

      <div className="section-label">Prioridades por proyecto</div>
      <div className="dash-proyectos-grid">
        {proyectos.map((p, i) => {
          const prios = p.por_prioridad || {}
          const totalPrios = Object.values(prios).reduce((a, b) => a + b, 0) || 1
          const PRIO_COLOR = { Alta: '#ef4444', Media: '#f59e0b', Baja: '#22c55e' }
          return (
            <div key={p.id} className="card dash-proyecto-card">
              <div className="dash-proyecto-card-head">
                <span className="dash-proyecto-badge" style={{ background: PROY_COLORS[i % PROY_COLORS.length] }}>
                  {p.initials}
                </span>
                <span className="dash-proyecto-nombre">{p.nombre}</span>
              </div>
              {Object.keys(prios).length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--txt3)' }}>Sin datos</p>
              ) : (
                Object.entries(prios).map(([prio, n]) => (
                  <div key={prio} className="dash-estado-row">
                    <span className="dash-estado-label" style={{ color: PRIO_COLOR[prio] || 'var(--txt2)' }}>{prio}</span>
                    <div className="dash-bar-track dash-bar-track--sm">
                      <div className="dash-bar-fill" style={{ width: `${Math.round((n / totalPrios) * 100)}%`, background: PRIO_COLOR[prio] || 'var(--accent)' }} />
                    </div>
                    <span className="dash-bar-num">{n}</span>
                  </div>
                ))
              )}
            </div>
          )
        })}
      </div>
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
    <div className="dash-estado-row">
      <span className="dash-estado-label" style={{ color }}>{estado}</span>
      <div className="dash-bar-track dash-bar-track--sm">
        <div className="dash-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="dash-bar-num">{n}</span>
    </div>
  )
}
