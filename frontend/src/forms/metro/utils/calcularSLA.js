export function calcularSLA(fechaHoraStr, prioridad) {
  if (!fechaHoraStr || !prioridad || prioridad === 'Alta') return { fecha: '', hora: '' }
  const horas = prioridad === 'Media' ? 12 : 16
  const INICIO = 7, FIN = 23

  const [fecha, hora] = fechaHoraStr.split(' ')
  if (!fecha || !hora) return { fecha: '', hora: '' }
  const [d, m, y] = fecha.split('/')
  const [hh, mm] = hora.split(':')
  if (!d || !m || !y || !hh || !mm) return { fecha: '', hora: '' }

  let dt = new Date(+y, +m - 1, +d, +hh, +mm)

  if (dt.getHours() < INICIO) {
    dt.setHours(INICIO, 0, 0, 0)
  } else if (dt.getHours() >= FIN || (dt.getHours() === FIN && dt.getMinutes() > 0)) {
    dt.setDate(dt.getDate() + 1)
    dt.setHours(INICIO, 0, 0, 0)
  }

  let restantes = horas * 60

  while (restantes > 0) {
    const minHastaFin = FIN * 60 - (dt.getHours() * 60 + dt.getMinutes())
    if (restantes <= minHastaFin) {
      dt = new Date(dt.getTime() + restantes * 60000)
      restantes = 0
    } else {
      restantes -= minHastaFin
      dt.setDate(dt.getDate() + 1)
      dt.setHours(INICIO, 0, 0, 0)
    }
  }

  const pad = n => String(n).padStart(2, '0')
  return {
    fecha: `${pad(dt.getDate())}/${pad(dt.getMonth()+1)}/${dt.getFullYear()}`,
    hora:  `${pad(dt.getHours())}:${pad(dt.getMinutes())}`,
  }
}
