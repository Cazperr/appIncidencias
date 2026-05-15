export const ESTADOS = [
  'PENDIENTE NOVA', 'PENDIENTE MMAD', 'REVISAR',
  'ASIGNADA', 'EN CURSO', 'PENDIENTE RESOLUCION',
  'SOLUCIONADA', 'FINALIZADA'
]
export const ESTADOS_ABIERTOS = ['PENDIENTE NOVA', 'PENDIENTE MMAD', 'REVISAR', 'ASIGNADA', 'EN CURSO', 'PENDIENTE RESOLUCION']
export const PRIORIDADES = ['Alta', 'Media', 'Baja']
export const TIPOS = ['Correctivo', 'Preventivo', 'Predictivo']
export const TIPO_AVISO = ['Aviso', 'Preventivo']
export const LINEAS = ['L1','L2','L3','L4','L5','L6','L7','L8','L9','L10','L11','L12','ML1','ML2','ML3']

export const LINEA_COLORS = {
  L1:'#1E90D5', L2:'#E50014', L3:'#FFE81E', L4:'#944A9B', L5:'#51C046',
  L6:'#9B9B9B', L7:'#F5820E', L8:'#EE8EC7', L9:'#A50F74', L10:'#1B5BAF',
  L11:'#009EA0', L12:'#A8CF55', ML1:'#006837', ML2:'#0072BC', ML3:'#662D91',
}
export const LINEA_TEXT_DARK = new Set(['L3','L12'])

export function estadoBadgeClass(estado) {
  const map = {
    'PENDIENTE NOVA':      'badge-nova',
    'PENDIENTE MMAD':      'badge-mmad',
    'REVISAR':             'badge-revisar',
    'ASIGNADA':            'badge-asig',
    'EN CURSO':            'badge-curso',
    'PENDIENTE RESOLUCION':'badge-mmad',
    'SOLUCIONADA':         'badge-sol',
    'FINALIZADA':          'badge-fin',
  }
  return 'badge ' + (map[estado] || 'badge-fin')
}

export function prioBadgeClass(p) {
  return 'badge ' + ({ Alta: 'badge-alta', Media: 'badge-media', Baja: 'badge-baja' }[p] || '')
}

export function fmtTs(ts) {
  if (!ts) return '—'
  return ts.replace('T', ' ').substring(0, 16)
}

export function slaEnRiesgo(fecha_limite_sla, hora_limite_sla) {
  if (!fecha_limite_sla) return false
  try {
    const [d, m, y] = fecha_limite_sla.split('/')
    const hora = hora_limite_sla || '23:59'
    const limite = new Date(`${y}-${m}-${d}T${hora}:00`)
    const ahora = new Date()
    const diff = (limite - ahora) / 3600000 // horas
    return diff >= 0 && diff <= 8
  } catch { return false }
}

export function slaVencido(fecha_limite_sla, hora_limite_sla) {
  if (!fecha_limite_sla) return false
  try {
    const [d, m, y] = fecha_limite_sla.split('/')
    const hora = hora_limite_sla || '23:59'
    const limite = new Date(`${y}-${m}-${d}T${hora}:00`)
    return new Date() > limite
  } catch { return false }
}