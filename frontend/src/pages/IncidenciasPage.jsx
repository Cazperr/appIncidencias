import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../lib/api'
import { ESTADOS, LINEAS, slaEnRiesgo, slaVencido, LINEA_COLORS } from '../lib/constants'
import IncidenciaCard from '../components/IncidenciaCard'
import { useAuth } from '../context/AuthContext'

const LIMIT = 25

// ── Vista de impresión ────────────────────────────────────────────────────────
function PrintView({ items, filtros, onClose }) {
  const fechaHoy = new Date().toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })

  useEffect(() => {
    // Imprimir automáticamente al montar
    const t = setTimeout(() => window.print(), 300)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="print-overlay">
      {/* Botón cerrar — solo visible en pantalla, no en impresión */}
      <div className="print-toolbar no-print">
        <span style={{ fontWeight: 600, fontSize: 14 }}>
          Vista previa — {items.length} incidencias
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
            🖨️ Imprimir
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕ Cerrar
          </button>
        </div>
      </div>

      {/* Contenido imprimible */}
      <div className="print-doc">
        <div className="print-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
                Metro de Madrid — Incidencias INFN
              </div>
              <div style={{ fontSize: 12, color: '#666' }}>
                Generado: {fechaHoy}
                {filtros.estado && ` · Estado: ${filtros.estado}`}
                {filtros.linea && ` · Línea: ${filtros.linea}`}
                {filtros.busqueda && ` · Búsqueda: "${filtros.busqueda}"`}
              </div>
            </div>
            <div style={{ fontSize: 12, color: '#666', textAlign: 'right' }}>
              Total: {items.length} incidencias
            </div>
          </div>
        </div>

        <table className="print-table">
          <thead>
            <tr>
              <th>OT</th>
              <th>Equipo</th>
              <th>Estación</th>
              <th>Línea</th>
              <th>Estado</th>
              <th>Técnico</th>
              <th>SLA</th>
              <th>Descripción</th>
            </tr>
          </thead>
          <tbody>
            {items.map(inc => {
              const vencido = slaVencido(inc.fecha_limite_sla, inc.hora_limite_sla)
              const riesgo  = !vencido && slaEnRiesgo(inc.fecha_limite_sla, inc.hora_limite_sla)
              const lc      = LINEA_COLORS[inc.linea] || '#444'
              return (
                <tr key={inc.id} style={{ background: vencido ? '#fff0f0' : riesgo ? '#fffbf0' : 'white' }}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {inc.ot || '—'}
                  </td>
                  <td style={{ fontWeight: 600, fontSize: 12 }}>{inc.equipo_afectado || '—'}</td>
                  <td style={{ fontSize: 12 }}>{inc.estacion || '—'}</td>
                  <td>
                    {inc.linea && (
                      <span style={{
                        background: lc, color: '#fff', borderRadius: 4,
                        padding: '2px 6px', fontSize: 11, fontWeight: 700,
                        whiteSpace: 'nowrap'
                      }}>
                        {inc.linea}
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {vencido && '⚠ '}{inc.estado_actual}
                  </td>
                  <td style={{ fontSize: 12 }}>{inc.nombre_tecnico || '—'}</td>
                  <td style={{
                    fontSize: 11, whiteSpace: 'nowrap',
                    color: vencido ? '#c0392b' : riesgo ? '#e67e22' : '#333',
                    fontWeight: (vencido || riesgo) ? 700 : 400
                  }}>
                    {inc.fecha_limite_sla
                      ? `${inc.fecha_limite_sla}${inc.hora_limite_sla ? ' ' + inc.hora_limite_sla : ''}`
                      : '—'}
                  </td>
                  <td style={{ fontSize: 11, color: '#555', maxWidth: 200 }}>
                    {inc.descripcion_fallo
                      ? inc.descripcion_fallo.substring(0, 120) + (inc.descripcion_fallo.length > 120 ? '…' : '')
                      : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="print-footer">
          Metro de Madrid · Gestión de Incidencias INFN · {fechaHoy}
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function IncidenciasPage() {
  const { user } = useAuth()
  const [soloMias, setSoloMias]       = useState(false)
  const [items, setItems]           = useState([])
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [err, setErr]               = useState('')
  const [busqueda, setBusqueda]     = useState('')
  const [estado, setEstado]         = useState('')
  const [linea, setLinea]           = useState('')
  const [soloSLA, setSoloSLA]       = useState(false)
  const [showFiltros, setShowFiltros] = useState(false)
  const [showPrint, setShowPrint]   = useState(false)
  const [printItems, setPrintItems] = useState([])

  const offsetRef     = useRef(0)
  const totalRef      = useRef(0)
  const loadingRef    = useRef(false)
  const sentinelRef   = useRef(null)
  const observerRef   = useRef(null)
  const estadoRef     = useRef('')
  const lineaRef      = useRef('')
  const busquedaRef   = useRef('')
  const soloMiasRef   = useRef(false)

  const buildParams = (off) => {
    const params = new URLSearchParams()
    if (estadoRef.current)          params.set('estado', estadoRef.current)
    if (lineaRef.current)           params.set('linea', lineaRef.current)
    if (busquedaRef.current.trim()) params.set('busqueda', busquedaRef.current.trim())
    if (soloMiasRef.current && user?.nombre) params.set('tecnico', user.nombre)
    params.set('limit', LIMIT)
    params.set('offset', off)
    return params
  }

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return
    if (offsetRef.current >= totalRef.current) return
    loadingRef.current = true
    setLoadingMore(true)
    try {
      const data = await api.get(`/api/incidencias?${buildParams(offsetRef.current)}`)
      if (data.items.length > 0) {
        setItems(prev => [...prev, ...data.items])
        offsetRef.current += data.items.length
      }
    } catch(e) { setErr(e.message) }
    finally { loadingRef.current = false; setLoadingMore(false) }
  }, [])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    if (observerRef.current) observerRef.current.disconnect()
    observerRef.current = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore() },
      { rootMargin: '300px' }
    )
    observerRef.current.observe(el)
    return () => observerRef.current?.disconnect()
  })

  const loadFresh = useCallback(async () => {
    loadingRef.current = true
    setLoading(true); setErr(''); setItems([])
    offsetRef.current = 0
    try {
      const data = await api.get(`/api/incidencias?${buildParams(0)}`)
      setItems(data.items)
      setTotal(data.total)
      totalRef.current  = data.total
      offsetRef.current = data.items.length
    } catch(e) { setErr(e.message) }
    finally { loadingRef.current = false; setLoading(false) }
  }, [])

  useEffect(() => {
    estadoRef.current   = estado
    lineaRef.current    = linea
    busquedaRef.current = busqueda
    soloMiasRef.current = soloMias
    const t = setTimeout(loadFresh, busqueda ? 350 : 0)
    return () => clearTimeout(t)
  }, [estado, linea, busqueda, soloMias, loadFresh])

  // Imprimir: carga TODAS las incidencias con los filtros actuales (sin paginación)
  const handlePrint = async () => {
    const params = new URLSearchParams()
    if (estadoRef.current)          params.set('estado', estadoRef.current)
    if (lineaRef.current)           params.set('linea', lineaRef.current)
    if (busquedaRef.current.trim()) params.set('busqueda', busquedaRef.current.trim())
    params.set('limit', 100)
    params.set('offset', 0)
    try {
      const data = await api.get(`/api/incidencias?${params}`)
      setPrintItems(data.items)
      setShowPrint(true)
    } catch(e) { setErr(e.message) }
  }

  const filtered = soloSLA
    ? items.filter(i => slaEnRiesgo(i.fecha_limite_sla, i.hora_limite_sla) || slaVencido(i.fecha_limite_sla, i.hora_limite_sla))
    : items

  const nSLA     = items.filter(i => slaEnRiesgo(i.fecha_limite_sla, i.hora_limite_sla) || slaVencido(i.fecha_limite_sla, i.hora_limite_sla)).length
  const nFiltros = [estado, linea].filter(Boolean).length
  const hayMas   = offsetRef.current < total
  const hayFiltro = estado || linea || busqueda.trim()

  return (
    <>
      {showPrint && (
        <PrintView
          items={printItems}
          filtros={{ estado, linea, busqueda }}
          onClose={() => setShowPrint(false)}
        />
      )}

      <div className="page">
        <div className="page-header">
          <div>
            <div className="page-title">Incidencias</div>
            <div className="page-subtitle">
              {loading ? '...' : `${filtered.length} / ${soloSLA ? nSLA : total} registros`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Botón imprimir — visible cuando hay filtro activo o hay items */}
            {!loading && filtered.length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={handlePrint} title="Imprimir lista">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 6 2 18 2 18 9"/>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                  <rect x="6" y="14" width="12" height="8"/>
                </svg>
                Imprimir
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => setShowFiltros(s => !s)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
              </svg>
              Filtros {nFiltros > 0 && <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>{nFiltros}</span>}
            </button>
          </div>
        </div>

        {/* Buscador */}
        <div className="field" style={{ marginBottom: 10 }}>
          <input type="search" placeholder="Buscar OT, equipo, estacion..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ fontSize: 15 }} />
        </div>

        {/* Toggles en una sola línea */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 12, flexWrap: 'wrap' }}>
          <div className="toggle-wrap" style={{ cursor: 'pointer' }} onClick={() => setSoloMias(s => !s)}>
            <span className="toggle">
              <input type="checkbox" checked={soloMias} readOnly />
              <span className="toggle-slider"/>
            </span>
            <span style={{ fontFamily: 'var(--font-cond)', fontSize: 13, fontWeight: 700, color: soloMias ? 'var(--accent2)' : 'var(--txt3)' }}>
              👤 Mis incidencias
            </span>
          </div>
          <div className="toggle-wrap" style={{ cursor: 'pointer' }} onClick={() => setSoloSLA(s => !s)}>
            <span className="toggle">
              <input type="checkbox" checked={soloSLA} readOnly />
              <span className="toggle-slider"/>
            </span>
            <span style={{ fontFamily: 'var(--font-cond)', fontSize: 13, fontWeight: 700, color: soloSLA ? 'var(--p-media)' : 'var(--txt3)' }}>
              SLA en riesgo / vencido
            </span>
          </div>
          {nSLA > 0 && <span className="badge badge-sla">{nSLA}</span>}
        </div>

        {/* Filtros expandibles */}
        {showFiltros && (
          <div className="card" style={{ marginBottom: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field">
              <label>Estado</label>
              <select value={estado} onChange={e => setEstado(e.target.value)}>
                <option value="">Todos</option>
                {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Linea</label>
              <select value={linea} onChange={e => setLinea(e.target.value)}>
                <option value="">Todas</option>
                {LINEAS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            {nFiltros > 0 && (
              <button className="btn btn-ghost btn-sm" style={{ gridColumn: '1/-1' }}
                onClick={() => { setEstado(''); setLinea('') }}>
                Limpiar filtros
              </button>
            )}
          </div>
        )}

        {err && <div className="alert alert-error" style={{ marginBottom: 12 }}>{err}</div>}

        {loading ? (
          <div className="loading-screen"><div className="spinner"/></div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--txt3)', fontSize: 13 }}>
            Sin resultados
          </div>
        ) : (
          <>
            {filtered.map(inc => <IncidenciaCard key={inc.id} inc={inc} />)}

            {!soloSLA && hayMas && (
              <div ref={sentinelRef} style={{ height: 40 }} />
            )}

            {loadingMore && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                <div className="spinner"/>
              </div>
            )}

            {!soloSLA && !hayMas && items.length > 0 && (
              <div style={{ textAlign: 'center', padding: '20px 0 40px', color: 'var(--txt3)', fontSize: 12 }}>
                {total} incidencias cargadas
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}