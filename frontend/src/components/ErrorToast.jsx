/**
 * Sistema global de notificaciones/errores.
 * Uso: import { toast } from './ErrorToast'
 *      toast.error('Algo salió mal')
 *      toast.success('Guardado correctamente')
 *      toast.info('Cargando...')
 */
import { useState, useEffect, useCallback, useRef } from 'react'

// ── Store global (sin Zustand, vanilla) ────────────────────────────────────────
let _listeners = []
let _id = 0

export const toast = {
  error:   (msg, duration = 4000) => _emit({ type: 'error',   msg, duration }),
  success: (msg, duration = 3000) => _emit({ type: 'success', msg, duration }),
  info:    (msg, duration = 3000) => _emit({ type: 'info',    msg, duration }),
  warn:    (msg, duration = 3500) => _emit({ type: 'warn',    msg, duration }),
}

function _emit(toast) {
  const id = ++_id
  _listeners.forEach(fn => fn({ ...toast, id }))
}

// ── Componente ─────────────────────────────────────────────────────────────────
export default function ErrorToast() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const handler = (t) => {
      setToasts(prev => [...prev, t])
      setTimeout(() => {
        setToasts(prev => prev.filter(x => x.id !== t.id))
      }, t.duration)
    }
    _listeners.push(handler)
    return () => { _listeners = _listeners.filter(fn => fn !== handler) }
  }, [])

  if (!toasts.length) return null

  const COLORS = {
    error:   { bg: 'rgba(239,68,68,.12)',  border: 'rgba(239,68,68,.3)',  color: '#f87171', icon: '✕' },
    success: { bg: 'rgba(34,197,94,.10)',  border: 'rgba(34,197,94,.3)',  color: '#4ade80', icon: '✓' },
    info:    { bg: 'rgba(59,130,246,.10)', border: 'rgba(59,130,246,.3)', color: '#60a5fa', icon: 'ℹ' },
    warn:    { bg: 'rgba(245,158,11,.10)', border: 'rgba(245,158,11,.3)', color: '#fbbf24', icon: '⚠' },
  }

  return (
    <div style={{
      position: 'fixed', bottom: 'calc(var(--nav-h) + 12px)', left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex', flexDirection: 'column', gap: 8,
      zIndex: 9999, maxWidth: 420, width: 'calc(100vw - 32px)',
      pointerEvents: 'none',
    }}>
      {toasts.map(t => {
        const c = COLORS[t.type] || COLORS.info
        return (
          <div key={t.id} style={{
            background: c.bg, border: `1px solid ${c.border}`,
            borderRadius: 'var(--radius)', padding: '12px 16px',
            display: 'flex', alignItems: 'flex-start', gap: 10,
            fontFamily: 'var(--font-mono)', fontSize: 13,
            color: 'var(--txt)', boxShadow: '0 4px 20px rgba(0,0,0,.3)',
            animation: 'toast-in .2s ease',
            pointerEvents: 'auto',
          }}>
            <span style={{ color: c.color, fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
              {c.icon}
            </span>
            <span style={{ flex: 1, lineHeight: 1.5 }}>{t.msg}</span>
          </div>
        )
      })}
    </div>
  )
}
