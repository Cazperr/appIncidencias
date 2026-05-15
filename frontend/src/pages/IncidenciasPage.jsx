import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../lib/api'
import { ESTADOS, LINEAS, slaEnRiesgo, slaVencido } from '../lib/constants'
import IncidenciaCard from '../components/IncidenciaCard'

const LIMIT = 25

export default function IncidenciasPage() {
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

  // Refs para evitar stale closures en el observer
  const offsetRef     = useRef(0)
  const totalRef      = useRef(0)
  const loadingRef    = useRef(false)
  const sentinelRef   = useRef(null)
  const observerRef   = useRef(null)

  // Params de filtro actuales
  const estadoRef   = useRef('')
  const lineaRef    = useRef('')
  const busquedaRef = useRef('')

  const buildParams = (off) => {
    const params = new URLSearchParams()
    if (estadoRef.current)         params.set('estado', estadoRef.current)
    if (lineaRef.current)          params.set('linea', lineaRef.current)
    if (busquedaRef.current.trim()) params.set('busqueda', busquedaRef.current.trim())
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

  // Reconecta el observer cada vez que el sentinel está disponible
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
  }) // sin deps — se re-evalúa en cada render, garantiza reconexión

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
    const t = setTimeout(loadFresh, busqueda ? 350 : 0)
    return () => clearTimeout(t)
  }, [estado, linea, busqueda, loadFresh])

  const filtered = soloSLA
    ? items.filter(i => slaEnRiesgo(i.fecha_limite_sla, i.hora_limite_sla) || slaVencido(i.fecha_limite_sla, i.hora_limite_sla))
    : items

  const nSLA     = items.filter(i => slaEnRiesgo(i.fecha_limite_sla, i.hora_limite_sla) || slaVencido(i.fecha_limite_sla, i.hora_limite_sla)).length
  const nFiltros = [estado, linea].filter(Boolean).length
  const hayMas   = offsetRef.current < total

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Incidencias</div>
          <div className="page-subtitle">
            {loading ? '...' : `${filtered.length} / ${soloSLA ? nSLA : total} registros`}
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowFiltros(s => !s)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          Filtros {nFiltros > 0 && <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>{nFiltros}</span>}
        </button>
      </div>

      {/* Buscador */}
      <div className="field" style={{ marginBottom: 10 }}>
        <input type="search" placeholder="Buscar OT, equipo, estacion..."
          value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ fontSize: 15 }} />
      </div>

      {/* Toggle SLA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
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

          {/* Sentinel — siempre en el DOM mientras haya más, el observer lo vigila */}
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
  )
}