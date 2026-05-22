import { useAuth } from '../context/AuthContext'
import NuevaIncidenciaMetro    from '../forms/metro/NuevaIncidenciaMetro'
import NuevaIncidenciaGenerica from '../forms/generic/NuevaIncidenciaGenerica'

// Registro de formularios por proyecto_id
const FORMULARIOS = {
  'metro-madrid': NuevaIncidenciaMetro,
}

export default function NuevaIncidenciaPage() {
  const { proyecto } = useAuth()
  const Formulario = (proyecto?.id && FORMULARIOS[proyecto.id]) || NuevaIncidenciaGenerica
  return <Formulario />
}
