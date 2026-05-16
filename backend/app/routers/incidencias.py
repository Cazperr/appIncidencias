import datetime
import json
from typing import Annotated, Optional
from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.security import get_current_active_user, require_rol
from app.db.database import get_connection
from app.db.eventos import (
    aplicar_cambio_estado, get_eventos, calcular_tiempos,
    registrar_evento, INICIO_TRABAJO, FIN_TRABAJO,
)
from app.models.schemas import IncidenciaCreate, IncidenciaUpdate, CierreIncidencia

router = APIRouter(prefix="/api/incidencias", tags=["incidencias"])
CurrentUser = Depends(get_current_active_user)
TecnicoOrAdmin = Depends(require_rol("ADMIN", "TECNICO"))


# ── GET /api/incidencias ──────────────────────────────────────────────────────
@router.get("")
@router.get("/")
async def list_incidencias(
    estado: Optional[str] = None,
    linea: Optional[str] = None,
    busqueda: Optional[str] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    _: dict = CurrentUser,
):
    conn = get_connection()
    base = "FROM incidencias WHERE 1=1"
    p = []

    if estado:
        base += " AND estado_actual = ?"; p.append(estado)
    if linea:
        base += " AND linea = ?"; p.append(linea)
    if busqueda:
        base += (" AND (ot LIKE ? OR estacion LIKE ? OR equipo_afectado LIKE ?"
                 " OR nombre_tecnico LIKE ? OR descripcion_fallo LIKE ?)")
        b = f"%{busqueda}%"; p.extend([b, b, b, b, b])
    if fecha_desde:
        d = _ddmm_to_iso(fecha_desde)
        if d:
            base += (" AND substr(fecha_hora,7,4)||'-'||substr(fecha_hora,4,2)"
                     "||'-'||substr(fecha_hora,1,2) >= ?")
            p.append(d)
    if fecha_hasta:
        d = _ddmm_to_iso(fecha_hasta)
        if d:
            base += (" AND substr(fecha_hora,7,4)||'-'||substr(fecha_hora,4,2)"
                     "||'-'||substr(fecha_hora,1,2) <= ?")
            p.append(d)

    total = conn.execute(f"SELECT COUNT(*) {base}", p).fetchone()[0]
    rows  = conn.execute(f"SELECT * {base} ORDER BY id DESC LIMIT ? OFFSET ?", p + [limit, offset]).fetchall()
    conn.close()
    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "items": [dict(r) for r in rows],
    }


# ── GET /api/incidencias/{id} ─────────────────────────────────────────────────
@router.get("/{inc_id}")
async def get_incidencia(inc_id: int, _: dict = CurrentUser):
    conn = get_connection()
    row = conn.execute("SELECT * FROM incidencias WHERE id=?", (inc_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Incidencia no encontrada")
    inc = dict(row)
    # Adjuntar tiempos calculados desde eventos
    inc["_tiempos"] = calcular_tiempos(inc_id)
    return inc


# ── POST /api/incidencias ─────────────────────────────────────────────────────
@router.post("", status_code=201)
@router.post("/", status_code=201)
async def create_incidencia(
    body: IncidenciaCreate,
    current: Annotated[dict, Depends(get_current_active_user)],
):
    data = body.model_dump(exclude_none=True)
    conn = get_connection()
    cols = list(data.keys())
    ph   = ",".join(["?"] * len(cols))
    vals = [data[k] for k in cols]
    cur  = conn.execute(
        f"INSERT INTO incidencias ({','.join(cols)}) VALUES ({ph})", vals
    )
    conn.commit()
    new_id = cur.lastrowid

    # Historial
    conn.execute(
        "INSERT INTO historial_cambios (incidencia_id, usuario, campo, valor_antes, valor_despues)"
        " VALUES (?,?,'CREACIÓN',NULL,?)",
        (new_id, current["nombre"], f"OT={data.get('ot','')} Estado={data.get('estado_actual','')}"),
    )
    conn.commit()
    conn.close()

    registrar_evento(new_id, "CREADA", current["id"], current["nombre"])
    _recalculate_duplicates()
    return {"id": new_id}


# ── PUT /api/incidencias/{id} ─────────────────────────────────────────────────
@router.put("/{inc_id}")
async def update_incidencia(
    inc_id: int,
    body: IncidenciaUpdate,
    current: Annotated[dict, Depends(get_current_active_user)],
):
    conn = get_connection()
    antes = conn.execute("SELECT * FROM incidencias WHERE id=?", (inc_id,)).fetchone()
    if not antes:
        conn.close()
        raise HTTPException(status_code=404, detail="Incidencia no encontrada")
    antes = dict(antes)

    data = body.model_dump(exclude_none=True)

    # ── Optimistic locking ────────────────────────────────────────────────────
    client_updated_at = data.pop("updated_at", None)
    if client_updated_at and client_updated_at != antes.get("updated_at"):
        conn.close()
        raise HTTPException(
            status_code=409,
            detail="Conflicto: otro usuario modificó esta incidencia mientras la editabas. Recarga e intentalo de nuevo."
        )
    # ─────────────────────────────────────────────────────────────────────────

    if not data:
        conn.close()
        return {"detail": "Sin cambios"}

    # Si cambia el estado → Event Sourcing
    nuevo_estado = data.get("estado_actual")
    if nuevo_estado and nuevo_estado != antes["estado_actual"]:
        aplicar_cambio_estado(inc_id, nuevo_estado, current)
        data.pop("estado_actual", None)

    if data:
        cols = list(data.keys())
        set_clause = ",".join(f"{c}=?" for c in cols)
        vals = [data[k] for k in cols] + [inc_id]
        conn.execute(f"UPDATE incidencias SET {set_clause}, updated_at=datetime('now','localtime') WHERE id=?", vals)

        # Historial de campos
        campos_legibles = {
            "estado_actual": "Estado", "ot": "OT", "equipo_afectado": "Equipo",
            "estacion": "Estación", "linea": "Línea", "prioridad": "Prioridad",
            "nombre_tecnico": "Técnico", "descripcion_fallo": "Descripción",
        }
        for campo in cols:
            if campo in campos_legibles:
                v_antes = str(antes.get(campo) or "")
                v_despues = str(data[campo] or "")
                if v_antes != v_despues:
                    conn.execute(
                        "INSERT INTO historial_cambios"
                        " (incidencia_id, usuario, campo, valor_antes, valor_despues)"
                        " VALUES (?,?,?,?,?)",
                        (inc_id, current["nombre"], campos_legibles[campo], v_antes, v_despues),
                    )
        conn.commit()

    conn.close()
    if "equipo_afectado" in data:
        _recalculate_duplicates()
    return {"detail": "OK"}


# ── POST /api/incidencias/{id}/asignar ───────────────────────────────────────
@router.post("/{inc_id}/asignar")
async def asignar_incidencia(
    inc_id: int,
    current: Annotated[dict, Depends(require_rol("ADMIN", "TECNICO"))] = None,
):
    """
    El técnico logueado se asigna la incidencia.
    Cambia estado a ASIGNADA y registra el evento con timestamp automático.
    """
    _check_exists(inc_id)
    aplicar_cambio_estado(inc_id, "ASIGNADA", current)
    return {"detail": "Incidencia asignada", "tecnico": current["nombre"]}


# ── POST /api/incidencias/{id}/iniciar ───────────────────────────────────────
@router.post("/{inc_id}/iniciar")
async def iniciar_trabajo(
    inc_id: int,
    current: Annotated[dict, Depends(require_rol("ADMIN", "TECNICO"))] = None,
):
    """Técnico pulsa 'Iniciar trabajo' → evento INICIO_TRABAJO con timestamp."""
    _check_exists(inc_id)
    aplicar_cambio_estado(inc_id, "EN CURSO", current)
    tiempos = calcular_tiempos(inc_id)
    return {"detail": "Trabajo iniciado", "timestamp_inicio": tiempos["timestamp_inicio"]}


# ── POST /api/incidencias/{id}/solucionar ────────────────────────────────────
@router.post("/{inc_id}/solucionar")
async def solucionar_incidencia(
    inc_id: int,
    body: CierreIncidencia,
    current: Annotated[dict, Depends(require_rol("ADMIN", "TECNICO"))] = None,
):
    """
    Cierre completo de incidencia:
    1. Registra evento SOLUCIONADA con timestamp
    2. Crea/actualiza registro en escalados con todos los datos de cierre
    3. Cambia estado a SOLUCIONADA
    """
    _check_exists(inc_id)

    # Evento de cierre
    aplicar_cambio_estado(inc_id, "SOLUCIONADA", current, payload=body.model_dump())

    # Tiempos automáticos desde eventos
    tiempos = calcular_tiempos(inc_id)
    hoy     = datetime.date.today().strftime("%d/%m/%Y")
    ahora   = datetime.datetime.now().strftime("%H:%M")

    hora_ini = body.hora_inicio_override or (
        tiempos["timestamp_inicio"][:16].split(" ")[-1] if tiempos["timestamp_inicio"] else ahora
    )
    hora_fin = body.hora_fin_override or ahora

    conn = get_connection()
    # Buscar si ya existe un escalado para esta incidencia del técnico actual
    existing = conn.execute(
        "SELECT id FROM escalados WHERE incidencia_id=? AND nombre_tecnico=? ORDER BY id DESC LIMIT 1",
        (inc_id, current["nombre"]),
    ).fetchone()

    escalado_data = {
        "nombre_tecnico":       current["nombre"],
        "fecha_fin":            hoy,
        "hora_fin":             hora_fin,
        "hora_inicio":          hora_ini,
        "tiempo_desplazamiento": body.tiempo_desplazamiento,
        "tiempo_actuacion":     str(tiempos.get("duracion_trabajo_min") or ""),
        "num_tecnicos":         body.num_tecnicos,
        "descripcion_trabajos": body.descripcion_trabajos,
        "pieza_cambiada":       int(body.pieza_cambiada),
        "sn_nueva":             body.sn_nueva,
        "pn_nueva":             body.pn_nueva,
        "sn_vieja":             body.sn_vieja,
        "pn_vieja":             body.pn_vieja,
    }

    if existing:
        cols = list(escalado_data.keys())
        set_clause = ",".join(f"{c}=?" for c in cols)
        conn.execute(
            f"UPDATE escalados SET {set_clause} WHERE id=?",
            [*escalado_data.values(), existing["id"]],
        )
    else:
        escalado_data["incidencia_id"]    = inc_id
        escalado_data["fecha_asignacion"] = hoy
        escalado_data["fecha_inicio"]     = hoy
        cols = list(escalado_data.keys())
        ph   = ",".join(["?"] * len(cols))
        conn.execute(
            f"INSERT INTO escalados ({','.join(cols)}) VALUES ({ph})",
            [escalado_data[k] for k in cols],
        )

    conn.commit()
    conn.close()
    return {"detail": "Incidencia solucionada", "tiempos": tiempos}


# ── GET /api/incidencias/{id}/eventos ────────────────────────────────────────
@router.get("/{inc_id}/eventos")
async def get_incidencia_eventos(inc_id: int, _: dict = CurrentUser):
    _check_exists(inc_id)
    eventos = get_eventos(inc_id)
    for ev in eventos:
        if isinstance(ev.get("payload"), str):
            try:
                ev["payload"] = json.loads(ev["payload"])
            except Exception:
                ev["payload"] = {}
    return eventos


# ── GET /api/incidencias/{id}/historial ──────────────────────────────────────
@router.get("/{inc_id}/historial")
async def get_historial(inc_id: int, _: dict = CurrentUser):
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM historial_cambios WHERE incidencia_id=? ORDER BY id DESC LIMIT 100",
        (inc_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ── GET /api/incidencias/{id}/escalados ──────────────────────────────────────
@router.get("/{inc_id}/escalados")
async def get_escalados(inc_id: int, _: dict = CurrentUser):
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM escalados WHERE incidencia_id=? ORDER BY id ASC", (inc_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ── DELETE /api/incidencias/{id} ─────────────────────────────────────────────
@router.delete("/{inc_id}", status_code=204)
async def delete_incidencia(
    inc_id: int,
    _: Annotated[dict, Depends(require_rol("ADMIN"))] = None,
):
    conn = get_connection()
    conn.execute("DELETE FROM incidencias WHERE id=?", (inc_id,))
    conn.commit()
    conn.close()
    _recalculate_duplicates()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _check_exists(inc_id: int):
    conn = get_connection()
    row = conn.execute("SELECT id FROM incidencias WHERE id=?", (inc_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Incidencia no encontrada")


def _ddmm_to_iso(s: str) -> str | None:
    try:
        d, m, y = s.strip().split("/")
        return f"{y}-{m.zfill(2)}-{d.zfill(2)}"
    except Exception:
        return None


def _recalculate_duplicates():
    conn = get_connection()
    conn.execute("UPDATE incidencias SET duplicada=0, duplicada_de=NULL")
    rows = conn.execute(
        "SELECT id, equipo_afectado FROM incidencias"
        " WHERE equipo_afectado IS NOT NULL AND trim(equipo_afectado) != ''"
        " ORDER BY id ASC"
    ).fetchall()
    by_equipo: dict[str, list[int]] = {}
    for row in rows:
        eq = row["equipo_afectado"].strip()
        by_equipo.setdefault(eq, []).append(row["id"])
    for eq, ids in by_equipo.items():
        if len(ids) > 1:
            for dup_id in ids[1:]:
                conn.execute(
                    "UPDATE incidencias SET duplicada=1, duplicada_de=? WHERE id=?",
                    (ids[0], dup_id),
                )
    conn.commit()
    conn.close()


# ── POST /api/incidencias/{id}/pendiente ─────────────────────────────────────
class _PendienteBody(BaseModel):
    motivo: str
    descripcion_trabajos: str
    tiempo_desplazamiento: str
    num_tecnicos: int = 1

@router.post("/{inc_id}/pendiente")
async def pendiente_resolucion(
    inc_id: int,
    body: _PendienteBody,
    current: Annotated[dict, Depends(require_rol("ADMIN", "TECNICO"))] = None,
):
    _check_exists(inc_id)
    tiempos = calcular_tiempos(inc_id)
    hoy   = datetime.date.today().strftime("%d/%m/%Y")
    ahora = datetime.datetime.now().strftime("%H:%M")
    hora_ini = tiempos["timestamp_inicio"][:16].split(" ")[-1] if tiempos["timestamp_inicio"] else ahora

    conn = get_connection()
    conn.execute(
        """INSERT INTO escalados
           (incidencia_id, nombre_tecnico, fecha_asignacion, fecha_inicio, hora_inicio,
            fecha_fin, hora_fin, tiempo_desplazamiento, tiempo_actuacion,
            num_tecnicos, descripcion_trabajos, pieza_cambiada)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,0)""",
        (inc_id, current["nombre"], hoy, hoy, hora_ini, hoy, ahora,
         body.tiempo_desplazamiento,
         str(tiempos.get("duracion_trabajo_min") or ""),
         body.num_tecnicos,
         f"[VISITA PARCIAL] {body.descripcion_trabajos}"),
    )
    conn.commit()
    conn.close()

    aplicar_cambio_estado(inc_id, "PENDIENTE RESOLUCION", current,
                          payload={"motivo": body.motivo, "descripcion": body.descripcion_trabajos})
    return {"detail": "Incidencia en pendiente de resolucion"}


# ── POST /api/incidencias/{id}/reanudar ──────────────────────────────────────
@router.post("/{inc_id}/reanudar")
async def reanudar_incidencia(
    inc_id: int,
    current: Annotated[dict, Depends(require_rol("ADMIN", "TECNICO"))] = None,
):
    _check_exists(inc_id)
    aplicar_cambio_estado(inc_id, "ASIGNADA", current,
                          payload={"nota": "Reanudada tras pendiente resolucion"})
    return {"detail": "Incidencia reanudada", "tecnico": current["nombre"]}