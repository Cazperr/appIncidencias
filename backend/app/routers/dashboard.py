from typing import Optional
from fastapi import APIRouter, Depends

from app.core.security import get_current_active_user
from app.db.database import get_connection

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])
CurrentUser = Depends(get_current_active_user)


@router.get("/stats")
async def get_stats(
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    _: dict = CurrentUser,
):
    conn = get_connection()

    filtro = ""
    params: list = []

    if fecha_desde:
        d = _ddmm_to_iso(fecha_desde)
        if d:
            filtro += (" AND substr(fecha_hora,7,4)||'-'||substr(fecha_hora,4,2)"
                       "||'-'||substr(fecha_hora,1,2) >= ?")
            params.append(d)
    if fecha_hasta:
        d = _ddmm_to_iso(fecha_hasta)
        if d:
            filtro += (" AND substr(fecha_hora,7,4)||'-'||substr(fecha_hora,4,2)"
                       "||'-'||substr(fecha_hora,1,2) <= ?")
            params.append(d)

    por_estado = {}
    for row in conn.execute(
        f"SELECT estado_actual, COUNT(*) n FROM incidencias WHERE 1=1{filtro} GROUP BY estado_actual",
        params,
    ):
        por_estado[row["estado_actual"]] = row["n"]

    por_linea = {}
    for row in conn.execute(
        f"SELECT linea, COUNT(*) n FROM incidencias"
        f" WHERE estado_actual NOT IN ('SOLUCIONADA','FINALIZADA'){filtro}"
        f" GROUP BY linea ORDER BY n DESC",
        params,
    ):
        if row["linea"]:
            por_linea[row["linea"]] = row["n"]

    top_equipos = []
    for row in conn.execute(
        f"SELECT equipo_afectado, COUNT(*) n FROM incidencias"
        f" WHERE equipo_afectado IS NOT NULL AND equipo_afectado != ''{filtro}"
        f" GROUP BY equipo_afectado ORDER BY n DESC LIMIT 10",
        params,
    ):
        top_equipos.append({"equipo": row["equipo_afectado"], "n": row["n"]})

    sla_vencido = conn.execute(
        f"SELECT COUNT(*) FROM incidencias"
        f" WHERE estado_actual NOT IN ('SOLUCIONADA','FINALIZADA')"
        f" AND fecha_limite_sla IS NOT NULL AND fecha_limite_sla != ''"
        f" AND (substr(fecha_limite_sla,7,4)||'-'||substr(fecha_limite_sla,4,2)"
        f"||'-'||substr(fecha_limite_sla,1,2)) < date('now'){filtro}",
        params,
    ).fetchone()[0]

    n_duplicadas = conn.execute(
        f"SELECT COUNT(*) FROM incidencias WHERE duplicada=1{filtro}", params
    ).fetchone()[0]

    por_mes = []
    for row in conn.execute(
        f"SELECT substr(fecha_hora,4,2)||'/'||substr(fecha_hora,7,4) mes, COUNT(*) n"
        f" FROM incidencias WHERE length(fecha_hora)>=10{filtro}"
        f" GROUP BY mes ORDER BY substr(fecha_hora,7,4)||substr(fecha_hora,4,2) DESC LIMIT 6",
        params,
    ):
        por_mes.append({"mes": row["mes"], "n": row["n"]})
    por_mes.reverse()

    t_medio = conn.execute(
        "SELECT AVG("
        "  julianday(substr(e.fecha_fin,7,4)||'-'||substr(e.fecha_fin,4,2)||'-'||substr(e.fecha_fin,1,2))"
        "  - julianday(substr(i.fecha_hora,7,4)||'-'||substr(i.fecha_hora,4,2)||'-'||substr(i.fecha_hora,1,2))"
        ") FROM escalados e JOIN incidencias i ON e.incidencia_id=i.id"
        " WHERE i.estado_actual IN ('SOLUCIONADA','FINALIZADA')"
        " AND e.fecha_fin != '' AND i.fecha_hora != ''"
        " AND length(e.fecha_fin)>=10 AND length(i.fecha_hora)>=10"
    ).fetchone()[0]

    # Técnicos activos (tuvieron eventos esta semana)
    tecnicos_activos = conn.execute(
        "SELECT usuario_nombre, COUNT(*) n FROM incidencia_eventos"
        " WHERE tipo_evento IN ('ASIGNADA','INICIO_TRABAJO','SOLUCIONADA')"
        " AND timestamp >= datetime('now','-7 days')"
        " GROUP BY usuario_nombre ORDER BY n DESC"
    ).fetchall()

    conn.close()

    return {
        "por_estado":       por_estado,
        "por_linea":        por_linea,
        "top_equipos":      top_equipos,
        "sla_vencido":      sla_vencido,
        "n_duplicadas":     n_duplicadas,
        "por_mes":          por_mes,
        "t_medio_dias":     round(t_medio, 1) if t_medio else None,
        "tecnicos_activos": [dict(r) for r in tecnicos_activos],
    }


def _ddmm_to_iso(s: str) -> str | None:
    try:
        d, m, y = s.strip().split("/")
        return f"{y}-{m.zfill(2)}-{d.zfill(2)}"
    except Exception:
        return None
