import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { LINEA_COLORS } from '../lib/constants'

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    api.get('/api/dashboard/stats')
      .then(setStats)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading-screen"><div className="spinner"/></div>
  if (err) return <div className="page"><div className="alert alert-error">{err}</div></div>

  const totalAbiertos = ['PENDIENTE NOVA','PENDIENTE MMAD','REVISAR','ASIGNADA','EN CURSO']
    .reduce((s, e) => s + (stats.por_estado[e] || 0), 0)
  const totalCerrados = (stats.por_estado['SOLUCIONADA'] || 0) + (stats.por_estado['FINALIZADA'] || 0)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Resumen operacional</div>
        </div>
      </div>

      {/* KPIs principales */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <KpiCard label="Abiertas" value={totalAbiertos} color="var(--c-nova)" />
        <KpiCard label="Cerradas" value={totalCerrados} color="var(--c-sol)" />
        <KpiCard label="SLA Vencido" value={stats.sla_vencido} color="var(--c-revisar)" />
        <KpiCard label="Duplicadas" value={stats.n_duplicadas} color="var(--p-media)" />
      </div>

      {/* T medio resolución */}
      {stats.t_medio_dias != null && (
        <div className="card" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
            {stats.t_medio_dias}d
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-cond)', fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--txt3)' }}>Tiempo medio resolución</div>
            <div style={{ fontSize: 12, color: 'var(--txt2)', marginTop: 2 }}>Basado en incidencias cerradas</div>
          </div>
        </div>
      )}

      {/* Por estado */}
      <SectionTitle>Por estado</SectionTitle>
      <div className="card" style={{ marginBottom: 14 }}>
        {Object.entries(stats.por_estado).map(([estado, n]) => (
          <EstadoBar key={estado} estado={estado} n={n}
            total={Object.values(stats.por_estado).reduce((a,b)=>a+b,0)} />
        ))}
      </div>

      {/* Por línea */}
      {Object.keys(stats.por_linea).length > 0 && <>
        <SectionTitle>Incidencias abiertas por línea</SectionTitle>
        <div className="card" style={{ marginBottom: 14 }}>
          {Object.entries(stats.por_linea).map(([linea, n]) => (
            <div key={linea} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{
                width: 32, height: 20, borderRadius: 4, background: LINEA_COLORS[linea] || '#444',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-cond)', fontSize: 11, fontWeight: 800,
                color: ['L3','L12'].includes(linea) ? '#111' : '#fff', flexShrink: 0,
              }}>{linea}</span>
              <div style={{ flex: 1, height: 6, background: 'var(--bg4)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3,
                  background: LINEA_COLORS[linea] || 'var(--accent)',
                  width: `${Math.min(100, n * 10)}%`,
                  transition: 'width .4s ease',
                }}/>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--txt)', minWidth: 24, textAlign: 'right' }}>{n}</span>
            </div>
          ))}
        </div>
      </>}

      {/* Top equipos */}
      {stats.top_equipos.length > 0 && <>
        <SectionTitle>Top equipos con más incidencias</SectionTitle>
        <div className="card" style={{ marginBottom: 14 }}>
          {stats.top_equipos.slice(0, 6).map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < 5 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--txt3)', width: 18 }}>{i+1}</span>
              <span style={{ flex: 1, fontSize: 12, color: 'var(--txt)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.equipo}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--txt)' }}>{item.n}</span>
            </div>
          ))}
        </div>
      </>}

      {/* Técnicos activos */}
      {stats.tecnicos_activos.length > 0 && <>
        <SectionTitle>Técnicos activos (últimos 7 días)</SectionTitle>
        <div className="card" style={{ marginBottom: 14 }}>
          {stats.tecnicos_activos.map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < stats.tecnicos_activos.length-1 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontSize: 18 }}>👤</span>
              <span style={{ flex: 1, fontSize: 13, color: 'var(--txt)' }}>{t.usuario_nombre}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--txt2)' }}>{t.n} acciones</span>
            </div>
          ))}
        </div>
      </>}

      {/* Evolución mensual */}
      {stats.por_mes.length > 0 && <>
        <SectionTitle>Evolución mensual</SectionTitle>
        <div className="card" style={{ marginBottom: 14 }}>
          {stats.por_mes.map((m, i) => {
            const max = Math.max(...stats.por_mes.map(x => x.n))
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--txt2)', minWidth: 56 }}>{m.mes}</span>
                <div style={{ flex: 1, height: 8, background: 'var(--bg4)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 4, background: 'var(--accent)',
                    width: `${(m.n / max) * 100}%`, opacity: 0.6 + (m.n / max) * 0.4,
                  }}/>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, minWidth: 28, textAlign: 'right' }}>{m.n}</span>
              </div>
            )
          })}
        </div>
      </>}
    </div>
  )
}

function KpiCard({ label, value, color }) {
  return (
    <div className="card" style={{ textAlign: 'center', borderColor: color + '44' }}>
      <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-mono)', color }}>{value ?? 0}</div>
      <div style={{ fontSize: 11, color: 'var(--txt3)', fontFamily: 'var(--font-cond)', letterSpacing: '.08em', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontFamily: 'var(--font-cond)', fontSize: 12, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--txt3)', marginBottom: 8 }}>
      {children}
    </div>
  )
}

const ESTADO_COLOR = {
  'PENDIENTE NOVA': 'var(--c-nova)', 'PENDIENTE MMAD': 'var(--c-mmad)',
  'REVISAR': 'var(--c-revisar)', 'ASIGNADA': 'var(--c-asignada)',
  'EN CURSO': 'var(--c-curso)', 'SOLUCIONADA': 'var(--c-sol)', 'FINALIZADA': 'var(--c-fin)',
}

function EstadoBar({ estado, n, total }) {
  const pct = total > 0 ? Math.round((n / total) * 100) : 0
  const color = ESTADO_COLOR[estado] || 'var(--txt3)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 12, color, fontFamily: 'var(--font-cond)', fontWeight: 700, minWidth: 130 }}>{estado}</span>
      <div style={{ flex: 1, height: 6, background: 'var(--bg4)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 3, background: color, width: `${pct}%` }}/>
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, minWidth: 24, textAlign: 'right' }}>{n}</span>
    </div>
  )
}
