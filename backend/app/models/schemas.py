from pydantic import BaseModel, field_validator
from typing import Optional, Any
import json

# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class RefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

# ── Usuarios ──────────────────────────────────────────────────────────────────

class UsuarioCreate(BaseModel):
    nombre: str
    username: Optional[str] = None
    email: str
    rol: str = "TECNICO"
    password: str

    @field_validator("rol")
    @classmethod
    def rol_valido(cls, v):
        if v not in ("ADMIN", "TECNICO", "VIEWER"):
            raise ValueError("Rol debe ser ADMIN, TECNICO o VIEWER")
        return v

class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    rol: Optional[str] = None
    activo: Optional[bool] = None
    password: Optional[str] = None

class UsuarioOut(BaseModel):
    id: int
    nombre: str
    username: Optional[str] = None
    email: str
    rol: str
    activo: bool
    ultimo_login: Optional[str] = None
    created_at: Optional[str] = None

# ── Incidencias ───────────────────────────────────────────────────────────────

class IncidenciaCreate(BaseModel):
    estado_actual: str = "PENDIENTE NOVA"
    tipo_aviso: str = "Aviso"
    ot: Optional[str] = None
    equipo_afectado: Optional[str] = None
    zona: Optional[str] = None
    linea: Optional[str] = None
    estacion: Optional[str] = None
    nombre_tecnico: Optional[str] = None
    fecha_hora: Optional[str] = None
    tipo: Optional[str] = None
    prioridad: str = "Media"
    sla: Optional[str] = None
    fecha_limite_sla: Optional[str] = None
    hora_limite_sla: Optional[str] = None
    solicitante: Optional[str] = None
    descripcion_fallo: Optional[str] = None
    comentarios_generales: Optional[str] = None

class IncidenciaUpdate(BaseModel):
    estado_actual: Optional[str] = None
    tipo_aviso: Optional[str] = None
    ot: Optional[str] = None
    equipo_afectado: Optional[str] = None
    zona: Optional[str] = None
    linea: Optional[str] = None
    estacion: Optional[str] = None
    nombre_tecnico: Optional[str] = None
    fecha_hora: Optional[str] = None
    tipo: Optional[str] = None
    prioridad: Optional[str] = None
    sla: Optional[str] = None
    fecha_limite_sla: Optional[str] = None
    hora_limite_sla: Optional[str] = None
    solicitante: Optional[str] = None
    descripcion_fallo: Optional[str] = None
    comentarios_generales: Optional[str] = None
    updated_at: Optional[str] = None  # campo de control para optimistic locking, no se guarda en BD

# ── Escalados ─────────────────────────────────────────────────────────────────

class EscaladoCreate(BaseModel):
    incidencia_id: int
    nombre_tecnico: Optional[str] = None
    fecha_asignacion: Optional[str] = None
    fecha_inicio: Optional[str] = None
    hora_inicio: Optional[str] = None
    fecha_fin: Optional[str] = None
    hora_fin: Optional[str] = None
    tiempo_desplazamiento: Optional[str] = None
    tiempo_actuacion: Optional[str] = None
    num_tecnicos: int = 1
    descripcion_trabajos: Optional[str] = None
    pieza_cambiada: bool = False
    sn_nueva: Optional[str] = None
    pn_nueva: Optional[str] = None
    sn_vieja: Optional[str] = None
    pn_vieja: Optional[str] = None

class EscaladoUpdate(BaseModel):
    nombre_tecnico: Optional[str] = None
    fecha_asignacion: Optional[str] = None
    fecha_inicio: Optional[str] = None
    hora_inicio: Optional[str] = None
    fecha_fin: Optional[str] = None
    hora_fin: Optional[str] = None
    tiempo_desplazamiento: Optional[str] = None
    tiempo_actuacion: Optional[str] = None
    num_tecnicos: Optional[int] = None
    descripcion_trabajos: Optional[str] = None
    pieza_cambiada: Optional[bool] = None
    sn_nueva: Optional[str] = None
    pn_nueva: Optional[str] = None
    sn_vieja: Optional[str] = None
    pn_vieja: Optional[str] = None

# ── Eventos ───────────────────────────────────────────────────────────────────

class EventoOut(BaseModel):
    id: int
    incidencia_id: int
    usuario_id: Optional[int] = None
    usuario_nombre: Optional[str] = None
    tipo_evento: str
    timestamp: str
    payload: Any = {}

    @field_validator("payload", mode="before")
    @classmethod
    def parse_payload(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return {}
        return v or {}

# ── Cierre de incidencia ──────────────────────────────────────────────────────

class EquipoSustituido(BaseModel):
    descripcion: Optional[str] = None
    sn_nuevo: Optional[str] = None
    pn_nuevo: Optional[str] = None
    sn_viejo: Optional[str] = None
    pn_viejo: Optional[str] = None

class CierreIncidencia(BaseModel):
    """Payload requerido para marcar una incidencia como SOLUCIONADA."""
    tiempo_desplazamiento: str           # minutos como string, ej. "25"
    descripcion_trabajos: str
    num_tecnicos: int = 1
    pieza_cambiada: bool = False
    sn_nueva: Optional[str] = None
    pn_nueva: Optional[str] = None
    sn_vieja: Optional[str] = None
    pn_vieja: Optional[str] = None
    # hora_inicio y hora_fin se toman automáticamente de los eventos
    # pero el técnico puede ajustarlos manualmente
    hora_inicio_override: Optional[str] = None
    hora_fin_override: Optional[str] = None
    fecha_inicio_override: Optional[str] = None   # DD/MM/YYYY
    fecha_fin_override: Optional[str] = None      # DD/MM/YYYY
    material_descripcion: Optional[str] = None
    equipos: Optional[list] = None
    estado_resultante: Optional[str] = 'SOLUCIONADA'

    descripcion: Optional[str] = None
    sn_nuevo: Optional[str] = None
    pn_nuevo: Optional[str] = None
    sn_viejo: Optional[str] = None
    pn_viejo: Optional[str] = None

class VisitaParcialBody(BaseModel):
    """Payload para registrar una visita parcial."""
    fecha_inicio: Optional[str] = None
    hora_inicio: Optional[str] = None
    fecha_fin: Optional[str] = None
    hora_fin: Optional[str] = None
    tiempo_desplazamiento: Optional[str] = None
    num_tecnicos: int = 1
    descripcion_trabajos: str
    material_descripcion: Optional[str] = None
    equipos: Optional[list[EquipoSustituido]] = None
    estado_resultante: Optional[str] = None  # Si se indica, actualiza el estado