import json
from datetime import datetime
from app.db.database import get_connection

# Tipos de evento
CREADA                = "CREADA"
ASIGNADA              = "ASIGNADA"
INICIO_TRABAJO        = "INICIO_TRABAJO"
FIN_TRABAJO           = "FIN_TRABAJO"
SOLUCIONADA           = "SOLUCIONADA"
REABIERTA             = "REABIERTA"
PENDIENTE_RESOLUCION  = "PENDIENTE_RESOLUCION"
REANUDADA             = "REANUDADA"

_ESTADO_A_EVENTO = {
    "ASIGNADA":              ASIGNADA,
    "EN CURSO":              INICIO_TRABAJO,
    "SOLUCIONADA":           SOLUCIONADA,
    "REABIERTA":             REABIERTA,
    "PENDIENTE RESOLUCION":  PENDIENTE_RESOLUCION,
}

ESTADOS_VALIDOS = [
    "PENDIENTE NOVA", "PENDIENTE MMAD", "REVISAR",
    "ASIGNADA", "EN CURSO", "PENDIENTE RESOLUCION",
    "SOLUCIONADA", "FINALIZADA",
]


def registrar_evento(incidencia_id, tipo_evento, usuario_id=None,
                     usuario_nombre="Sistema", payload=None) -> int:
    conn = get_connection()
    cur = conn.execute(
        """INSERT INTO incidencia_eventos
           (incidencia_id, usuario_id, usuario_nombre, tipo_evento, payload)
           VALUES (?, ?, ?, ?, ?)""",
        (incidencia_id, usuario_id, usuario_nombre, tipo_evento,
         json.dumps(payload or {}, ensure_ascii=False)),
    )
    conn.commit()
    eid = cur.lastrowid
    conn.close()
    return eid


def get_eventos(incidencia_id) -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM incidencia_eventos WHERE incidencia_id=? ORDER BY id ASC",
        (incidencia_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_ultimo_evento(incidencia_id, tipo) -> dict | None:
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM incidencia_eventos WHERE incidencia_id=? AND tipo_evento=? ORDER BY id DESC LIMIT 1",
        (incidencia_id, tipo),
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def calcular_tiempos(incidencia_id) -> dict:
    eventos = get_eventos(incidencia_id)
    result = {
        "timestamp_asignada": None,
        "timestamp_inicio":   None,
        "timestamp_fin":      None,
        "duracion_trabajo_min": None,
    }
    for ev in eventos:
        t = ev["tipo_evento"]
        if t == ASIGNADA and not result["timestamp_asignada"]:
            result["timestamp_asignada"] = ev["timestamp"]
        elif t == INICIO_TRABAJO and not result["timestamp_inicio"]:
            result["timestamp_inicio"] = ev["timestamp"]
        elif t in (FIN_TRABAJO, SOLUCIONADA, PENDIENTE_RESOLUCION) and not result["timestamp_fin"]:
            result["timestamp_fin"] = ev["timestamp"]

    if result["timestamp_inicio"] and result["timestamp_fin"]:
        fmt = "%Y-%m-%d %H:%M:%S"
        try:
            ini = datetime.strptime(result["timestamp_inicio"], fmt)
            fin = datetime.strptime(result["timestamp_fin"], fmt)
            result["duracion_trabajo_min"] = int((fin - ini).total_seconds() / 60)
        except Exception:
            pass
    return result


def aplicar_cambio_estado(incidencia_id, nuevo_estado, usuario, payload=None):
    conn = get_connection()
    if nuevo_estado == "ASIGNADA":
        conn.execute(
            "UPDATE incidencias SET nombre_tecnico=?, estado_actual=? WHERE id=?",
            (usuario["nombre"], nuevo_estado, incidencia_id),
        )
    else:
        conn.execute(
            "UPDATE incidencias SET estado_actual=? WHERE id=?",
            (nuevo_estado, incidencia_id),
        )
    conn.commit()
    conn.close()

    tipo_evento = _ESTADO_A_EVENTO.get(nuevo_estado)
    if tipo_evento:
        registrar_evento(
            incidencia_id=incidencia_id,
            tipo_evento=tipo_evento,
            usuario_id=usuario.get("id"),
            usuario_nombre=usuario.get("nombre", "Sistema"),
            payload=payload or {},
        )

    _log_historial(incidencia_id, usuario.get("nombre", "Sistema"), nuevo_estado)
    return tipo_evento


def _log_historial(incidencia_id, usuario, nuevo_estado):
    conn = get_connection()
    antes = conn.execute(
        "SELECT estado_actual FROM incidencias WHERE id=?", (incidencia_id,)
    ).fetchone()
    estado_antes = dict(antes)["estado_actual"] if antes else ""
    conn.execute(
        """INSERT INTO historial_cambios
           (incidencia_id, usuario, campo, valor_antes, valor_despues)
           VALUES (?, ?, 'Estado', ?, ?)""",
        (incidencia_id, usuario, estado_antes, nuevo_estado),
    )
    conn.commit()
    conn.close()