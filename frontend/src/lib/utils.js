// Mapeo de estados a clases Tailwind
export const estadoClass = (estado) => {
  const map = {
    'PENDIENTE NOVA': 'estado-PENDIENTE-NOVA',
    'PENDIENTE MMAD': 'estado-PENDIENTE-MMAD',
    'REVISAR':        'estado-REVISAR',
    'ASIGNADA':       'estado-ASIGNADA',
    'EN CURSO':       'estado-EN-CURSO',
    'SOLUCIONADA':    'estado-SOLUCIONADA',
    'FINALIZADA':     'estado-FINALIZADA',
  }
  return map[estado] || 'bg-bg-3 border border-border text-text-dim'
}

export const prioClass = (prio) => {
  const map = {
    'Alta':  'text-red-400 bg-red-900/30 border border-red-800',
    'Media': 'text-amber-400 bg-amber-900/30 border border-amber-800',
    'Baja':  'text-green-400 bg-green-900/30 border border-green-800',
  }
  return map[prio] || 'text-text-dim bg-bg-3 border border-border'
}

export const lineaColor = (linea) => {
  const map = {
    L1:'#1E90D5',L2:'#E50014',L3:'#FFE81E',L4:'#944A9B',
    L5:'#51C046',L6:'#9B9B9B',L7:'#F5820E',L8:'#EE8EC7',
    L9:'#A50F74',L10:'#1B5BAF',L11:'#009EA0',L12:'#A8CF55',
    ML1:'#006837',ML2:'#0072BC',ML3:'#662D91',
  }
  return map[linea] || '#4a5568'
}

export const ESTADOS = ['PENDIENTE NOVA','PENDIENTE MMAD','REVISAR','ASIGNADA','EN CURSO','SOLUCIONADA','FINALIZADA']
export const LINEAS   = ['L1','L2','L3','L4','L5','L6','L7','L8','L9','L10','L11','L12','ML1','ML2','ML3']
export const PRIORIDADES = ['Alta','Media','Baja']
export const TIPOS    = ['Correctivo','Preventivo','Predictivo']
export const TIPO_AVISO = ['Aviso','Preventivo']

export const formatTs = (ts) => {
  if (!ts) return '—'
  return ts.replace('T', ' ').slice(0, 16)
}

export const formatDuracion = (min) => {
  if (!min && min !== 0) return '—'
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}
