import { useAuth } from '../context/AuthContext'
import ModalCierreMetro    from '../forms/metro/ModalCierreMetro'
import ModalCierreGenerico from '../forms/generic/ModalCierreGenerico'

const MODALES = {
  'metro-madrid': ModalCierreMetro,
}

export default function ModalCierre(props) {
  const { proyecto } = useAuth()
  const Modal = (proyecto?.id && MODALES[proyecto.id]) || ModalCierreGenerico
  return <Modal {...props} />
}
