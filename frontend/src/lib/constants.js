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

export const ESTADOS_GENERICOS = ['PENDIENTE NOVATION', 'PENDIENTE REVISAR', 'SOLUCIONADA']

export const ESTADO_COLOR = {
  // Metro
  'PENDIENTE NOVA':       '#3b82f6',
  'PENDIENTE MMAD':       '#f59e0b',
  'REVISAR':              '#ef4444',
  'ASIGNADA':             '#8b5cf6',
  'EN CURSO':             '#06b6d4',
  'PENDIENTE RESOLUCION': '#f59e0b',
  'SOLUCIONADA':          '#22c55e',
  'FINALIZADA':           '#52606e',
  // Genéricos
  'PENDIENTE NOVATION':   '#3b82f6',
  'PENDIENTE REVISAR':    '#f59e0b',
}

export function estadoAccentColor(estado) {
  return ESTADO_COLOR[estado] || 'var(--border2)'
}

export function estadoBadgeClass(estado) {
  const map = {
    'PENDIENTE NOVA':       'badge-nova',
    'PENDIENTE MMAD':       'badge-mmad',
    'REVISAR':              'badge-revisar',
    'ASIGNADA':             'badge-asig',
    'EN CURSO':             'badge-curso',
    'PENDIENTE RESOLUCION': 'badge-mmad',
    'SOLUCIONADA':          'badge-sol',
    'FINALIZADA':           'badge-fin',
    'PENDIENTE NOVATION':   'badge-nova',
    'PENDIENTE REVISAR':    'badge-mmad',
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

// Añadir esto al final de frontend/src/lib/constants.js

export const ESTACIONES_METRO = [
  "Acacias","Aeropuerto T1-T2-T3","Aeropuerto T4","Alfonso XIII","Alonso Martínez",
  "Alto del Arenal","Aluche","Alvarado","Antón Martín","Aravaca",
  "Arganzuela-Planetario","Argüelles","Arroyofresno","Artilleros","Arturo Soria",
  "Ascao","Atocha","Atocha Renfe","Avenida de América","Avenida de la Paz",
  "Barrio de la Concepción","Barrio del Pilar","Barrio del Puerto","Batán",
  "Begoña","Bilbao","Boadilla del Monte","Boadilla Pueblo","Buenos Aires",
  "Callao","Campamento","Canal","Canillejas","Canillas","Cantoblanco Universidad",
  "Carabanchel","Carpetana","Casa de Campo","Ciudad de la Imagen","Ciudad Jardín",
  "Ciudad Lineal","Ciudad Universitaria","Colombia","Colonia Jardín","Conde de Casal",
  "Congosto","Conservatorio","Coslada Central","Cuatro Caminos","Cuatro Vientos","Cuzco",
  "Delicias","Diego de León","Duque de Pastrana",
  "El Bercial","El Casar","Empalme","Embajadores","Esperanza",
  "Estadio Metropolitano","Estadio Olímpico","Estrecho","Eugenia de Montijo",
  "Fuencarral","Fuenlabrada Central",
  "García Noblejas","Goya","Gran Vía","Gregorio Marañón","Guzmán el Bueno",
  "Henares","Herrera Oria","Hospital de Móstoles","Hospital del Henares",
  "Hospital Infanta Sofía","Hortaleza","Ibiza","Iglesia",
  "Jarama","Joaquín Vilumbrales",
  "La Fortuna","La Gavia","La Granja","La Latina","La Peseta","La Poveda",
  "Lacoma","Lago","Laguna","Las Musas","Las Rozas","Las Rosas","Las Tablas",
  "Lavapiés","Leganés Central","Legazpi","Lista","Loranca",
  "Manuel Becerra","Manoteras","Mar de Cristal","Marqués de Vadillo",
  "Méndez Álvaro","Menéndez Pelayo","Miguel Hernández","Mirasierra",
  "Moncloa","Montalbán","Montecarmelo","Móstoles Central",
  "Noviciado","Nueva Numancia","Nuevos Ministerios","Núñez de Balboa",
  "O'Donnell","Opañel","Ópera","Oporto",
  "Paco de Lucía","Pacífico","Palos de la Frontera","Parque de Santa María",
  "Parque Lisboa","Parque Oeste","Pavones","Perales del Río",
  "Pinar de Chamartín","Pinar del Rey","Pitis","Plaza de Castilla",
  "Plaza de España","Plaza Elíptica","Portazgo","Pozuelo","Pradillo",
  "Pradolongo","Príncipe de Vergara","Príncipe Pío","Prosperidad",
  "Pueblo Nuevo","Puente de Vallecas","Puerta de Arganda","Puerta de Toledo","Puerta del Sur",
  "Quintana","Quevedo",
  "Ramón y Cajal","Retiro","Reyes Católicos","Río","Ríos Rosas",
  "Rivas Urbanizaciones","Rivas Vaciamadrid","Ronda de la Comunicación","Rubén Darío",
  "Sainz de Baranda","San Bernardo","San Cristóbal Industrial","San Fernando",
  "San José de Valderas","Sanchinarro","Santo Domingo","Serrano","Sevilla",
  "Sierra de Guadalupe","Sol","Suanzes",
  "Tetuán","Tirso de Molina","Torre Arias","Tres Olivos","Tribunal",
  "Urgel","Valdeacederas","Valdecarros","Valdebernardo","Ventas",
  "Ventura Rodríguez","Vicálvaro","Villa de Vallecas","Villaverde Alto",
  "Vinateros","Virgen de Begoña","Vista Alegre",
]

export const ESTACION_LINEAS = {
  "Acacias": ["L5", "L6"],
  "Aeropuerto T1-T2-T3": ["L7", "L8"],
  "Aeropuerto T4": ["L7", "L8"],
  "Alcorcón Central": ["L12"],
  "Alfonso XIII": ["L4", "L9"],
  "Alonso Martínez": ["L4", "L5", "L10"],
  "Alto del Arenal": ["L1"],
  "Aluche": ["L5", "L10", "L11"],
  "Alvarado": ["L1"],
  "Antón Martín": ["L1"],
  "Aravaca": ["ML2"],
  "Arganda del Rey": ["L9"],
  "Arganzuela-Planetario": ["L9"],
  "Argüelles": ["L3", "L4", "L6"],
  "Arroyofresno": ["ML2", "ML3"],
  "Artilleros": ["L7"],
  "Arturo Soria": ["L4", "L7"],
  "Ascao": ["L7"],
  "Atocha": ["L1"],
  "Atocha Renfe": ["L1", "L9"],
  "Avenida de América": ["L4", "L6", "L7", "L9"],
  "Banco de España": ["L2"],
  "Barajas": ["L7"],
  "Barrio del Pilar": ["L5"],
  "Barrio del Puerto": ["L7"],
  "Batán": ["L5", "L10"],
  "Begoña": ["L1", "L10"],
  "Bilbao": ["L1", "L4"],
  "Boadilla Pueblo": ["ML3"],
  "Boadilla del Monte": ["ML3"],
  "Buenos Aires": ["L1"],
  "Callao": ["L3", "L5"],
  "Campamento": ["L5"],
  "Canal": ["L2", "L7"],
  "Canillas": ["L4"],
  "Canillejas": ["L7"],
  "Cantoblanco Universidad": ["ML1"],
  "Carabanchel": ["L5", "L6", "L12"],
  "Carpetana": ["L6"],
  "Casa de Campo": ["L5", "L10"],
  "Chamartín": ["L1", "L4", "L10"],
  "Ciudad Jardín": ["L8", "L9"],
  "Ciudad Lineal": ["L7"],
  "Ciudad Universitaria": ["L6", "ML1"],
  "Ciudad de la Imagen": ["L6"],
  "Colombia": ["L4", "L8", "L9"],
  "Colonia Jardín": ["ML2", "ML3"],
  "Colón": ["L4", "L9"],
  "Conde de Casal": ["L6"],
  "Congosto": ["L1", "L9"],
  "Conservatorio": ["L12"],
  "Coslada Central": ["L7"],
  "Cuatro Caminos": ["L1", "L2", "L6", "L7"],
  "Cuatro Vientos": ["L10", "L11"],
  "Cuzco": ["L5", "L10"],
  "Delicias": ["L3"],
  "Diego de León": ["L4", "L6", "L9"],
  "Duque de Pastrana": ["L5", "L10"],
  "El Bercial": ["ML3"],
  "El Casar": ["ML3"],
  "Embajadores": ["L3", "L5"],
  "Empalme": ["L5"],
  "Esperanza": ["L4"],
  "Estadio Metropolitano": ["L7"],
  "Estadio Olímpico": ["ML1"],
  "Estrecho": ["L1"],
  "Eugenia de Montijo": ["L5", "L6"],
  "Fuencarral": ["L1", "L10"],
  "Fuenlabrada Central": ["L12"],
  "García Noblejas": ["L7"],
  "Goya": ["L2", "L4"],
  "Gran Vía": ["L1", "L5"],
  "Gregorio Marañón": ["L5", "L7", "L10"],
  "Guzmán el Bueno": ["L6", "L7"],
  "Henares": ["L7"],
  "Herrera Oria": ["L5", "L10"],
  "Hortaleza": ["L4", "L8"],
  "Hospital de Móstoles": ["L12"],
  "Hospital del Henares": ["L7"],
  "Ibiza": ["L9"],
  "Iglesia": ["L1"],
  "Jarama": ["L7"],
  "Joaquín Vilumbrales": ["L10", "L12"],
  "La Fortuna": ["L11"],
  "La Gavia": ["L9"],
  "La Granja": ["L10"],
  "La Latina": ["L5"],
  "La Peseta": ["L12"],
  "La Poveda": ["L9"],
  "Lacoma": ["L10"],
  "Lago": ["L5", "L10"],
  "Laguna": ["L6"],
  "Las Musas": ["L7"],
  "Las Rosas": ["L2"],
  "Las Rozas": ["ML2"],
  "Las Tablas": ["L9", "L10", "ML1"],
  "Lavapiés": ["L3"],
  "Leganés Central": ["L12"],
  "Legazpi": ["L3", "L6"],
  "Lista": ["L4", "L9"],
  "Loranca": ["L12"],
  "Manoteras": ["L8", "L9"],
  "Manuel Becerra": ["L2", "L6"],
  "Mar de Cristal": ["L4", "L8", "ML1"],
  "Marqués de Vadillo": ["L5", "L6", "L12"],
  "Menéndez Pelayo": ["L1"],
  "Miguel Hernández": ["L1"],
  "Moncloa": ["L3", "L6"],
  "Montalbán": ["L9"],
  "Montecarmelo": ["L9", "L10"],
  "Méndez Álvaro": ["L6", "L9"],
  "Móstoles Central": ["L12"],
  "Noviciado": ["L2", "L10"],
  "Nueva Numancia": ["L1"],
  "Nuevos Ministerios": ["L5", "L6", "L8", "L9", "L10"],
  "Núñez de Balboa": ["L5", "L9"],
  "O'Donnell": ["L6", "L9"],
  "Opañel": ["L6"],
  "Oporto": ["L5", "L6", "L12"],
  "Pacífico": ["L1", "L6"],
  "Palos de la Frontera": ["L3"],
  "Parque Lisboa": ["L12"],
  "Parque Oeste": ["ML3"],
  "Parque de Santa María": ["L4"],
  "Pavones": ["L7"],
  "Perales del Río": ["L9"],
  "Pinar de Chamartín": ["L1", "L4", "L8", "L9", "L10"],
  "Pinar del Rey": ["L4"],
  "Pirámides": ["L5"],
  "Pitis": ["L5", "ML1"],
  "Plaza Elíptica": ["L6", "L12"],
  "Plaza de Castilla": ["L1", "L9", "L10"],
  "Portazgo": ["L1"],
  "Pozuelo": ["ML2"],
  "Pradillo": ["L12"],
  "Pradolongo": ["L3", "L6", "L12"],
  "Prosperidad": ["L4"],
  "Príncipe Pío": ["L6", "L10", "L11", "Ramal"],
  "Príncipe de Vergara": ["L2", "L9"],
  "Pueblo Nuevo": ["L7"],
  "Puente de Vallecas": ["L1"],
  "Puerta de Arganda": ["L9"],
  "Puerta de Toledo": ["L5", "L6"],
  "Puerta del Sur": ["L10", "L12"],
  "Quevedo": ["L2"],
  "Quintana": ["L7"],
  "Ramón y Cajal": ["ML1"],
  "Retiro": ["L2"],
  "Reyes Católicos": ["L7"],
  "Rivas Urbanizaciones": ["L9"],
  "Rivas Vaciamadrid": ["L9"],
  "Ronda de la Comunicación": ["L9", "L10"],
  "Rubén Darío": ["L5", "L10"],
  "Ríos Rosas": ["L1"],
  "Sainz de Baranda": ["L6", "L9"],
  "San Bernardo": ["L2", "L4"],
  "San Cristóbal Industrial": ["L3"],
  "San Fernando": ["L7"],
  "San José de Valderas": ["L12"],
  "Santo Domingo": ["L2", "L10"],
  "Serrano": ["L4", "L9"],
  "Sevilla": ["L2"],
  "Sierra de Guadalupe": ["L1"],
  "Sol": ["L1", "L2", "L3"],
  "Suanzes": ["L7"],
  "Tetuán": ["L1"],
  "Tirso de Molina": ["L1"],
  "Torre Arias": ["L7"],
  "Tres Olivos": ["L9", "L10"],
  "Tribunal": ["L1", "L10"],
  "Urgel": ["L5"],
  "Valdeacederas": ["L1"],
  "Valdebernardo": ["L7", "L9"],
  "Valdecarros": ["L9"],
  "Velázquez": ["L4", "L9"],
  "Ventas": ["L2", "L5"],
  "Ventura Rodríguez": ["L3"],
  "Vicálvaro": ["L7", "L9"],
  "Villa de Vallecas": ["L1"],
  "Villaverde Alto": ["L3"],
  "Vinateros": ["L7"],
  "Virgen de Begoña": ["L1"],
  "Vista Alegre": ["L6", "L12"],
  "Ópera": ["L2", "L5", "Ramal"],
}