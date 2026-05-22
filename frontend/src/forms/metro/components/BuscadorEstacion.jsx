import { useState, useRef, useEffect } from 'react'
import { ESTACIONES_METRO, ESTACION_LINEAS, LINEA_COLORS, LINEA_TEXT_DARK } from '../../../lib/constants'

export default function BuscadorEstacion({ value, onChange, onLineaDetectada }) {
  const [query, setQuery] = useState(value || '')
  const [open, setOpen]   = useState(false)
  const ref = useRef(null)

  const normalizar = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  const sugerencias = query.length >= 1
    ? ESTACIONES_METRO.filter(e => normalizar(e).includes(normalizar(query))).slice(0, 8)
    : []

  function seleccionar(est) {
    setQuery(est)
    onChange(est)
    setOpen(false)
    const lineas = ESTACION_LINEAS[est] || []
    if (lineas.length === 1)       onLineaDetectada(lineas[0])
    else if (lineas.length > 1)    onLineaDetectada('__multiple__', lineas)
    else                           onLineaDetectada('')
  }

  function handleInput(e) {
    setQuery(e.target.value)
    onChange(e.target.value)
    setOpen(true)
    if (!e.target.value) onLineaDetectada('')
  }

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        type="text"
        placeholder="Escribe para buscar estación..."
        value={query}
        onChange={handleInput}
        onFocus={() => query.length >= 1 && setOpen(true)}
        autoComplete="off"
      />
      {open && sugerencias.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 8, marginTop: 4, overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,.3)',
        }}>
          {sugerencias.map(est => {
            const lineas = ESTACION_LINEAS[est] || []
            return (
              <div key={est}
                onMouseDown={() => seleccionar(est)}
                style={{
                  padding: '10px 14px', cursor: 'pointer', fontSize: 14,
                  borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'background .1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                <span>📍 {est}</span>
                <span style={{ display: 'flex', gap: 4 }}>
                  {lineas.map(l => {
                    const bg = LINEA_COLORS[l] || '#444'
                    const fg = LINEA_TEXT_DARK.has(l) ? '#111' : '#fff'
                    return (
                      <span key={l} style={{
                        background: bg, color: fg, borderRadius: 4,
                        padding: '1px 6px', fontSize: 10, fontWeight: 700,
                      }}>{l}</span>
                    )
                  })}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
