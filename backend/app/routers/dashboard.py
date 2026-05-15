from typing import Optional

from fastapi import APIRouter, Depends

from app.core.security import get_current_active_user
from app.db.database import get_connection

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _ddmm_to_iso(s: str) -> Optional[str]:
    try:
        d, m, y = s.strip().split("/")
        return f"{y}-{m.zfill(2)}-{d.zfill(2)}"
    except Exception:
        return None


async def _stats_impl(
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
):
    conn = get_connection()

    try:
        filtro = ""
        params = []

        if fecha_desde:
            d = _ddmm_to_iso(fecha_desde)
            if d:
                filtro += (
                    " AND substr(fecha_hora,7,4)||'-'||substr(fecha_hora,4,2)"
                    "||'-'||substr(fecha_hora,1,2) >= ?"
                )
                params.append(d)

        if fecha_hasta:
            d = _ddmm_to_iso(fecha_hasta)
            if d:
                filtro += (
                    " AND substr(fecha_hora,7,4)||'-'||substr(fecha_hora,4,2)"
                    "||'-'||substr(fecha_hora,1,2) <= ?"
                )
                params.append(d)

        # Por estado
        por_estado = {}

        query = (
            "SELECT estado_actual, COUNT(*) n "
            f"FROM incidencias WHERE 1=1 {filtro} "
            "GROUP BY estado_actual"
        )

        for row in conn.execute(query, params):
            por_estado[row["estado_actual"]] = row["n"]

        # Por línea
        por_linea = {}

        query = (
            "SELECT linea, COUNT(*) n "
            "FROM incidencias "
            "WHERE estado_actual NOT IN ('SOLUCIONADA','FINALIZADA') "
            f"{filtro} "
            "GROUP BY linea "
            "ORDER BY n DESC"
        )

        for row in conn.execute(query, params):
            if row["linea"]:
                por_linea[row["linea"]] = row["n"]

        # Top equipos
        top_equipos = []

        query = (
            "SELECT equipo_afectado, COUNT(*) n "
            "FROM incidencias "
            "WHERE equipo_afectado IS NOT NULL "
            "AND equipo_afectado != '' "
            f"{filtro} "
            "GROUP BY equipo_afectado "
            "ORDER BY n DESC "
            "LIMIT 10"
        )

        for row in conn.execute(query, params):
            top_equipos.append(
                {
                    "equipo": row["equipo_afectado"],
                    "n": row["n"],
                }
            )

        # SLA vencido
        query = (
            "SELECT COUNT(*) "
            "FROM incidencias "
            "WHERE estado_actual NOT IN ('SOLUCIONADA','FINALIZADA') "
            "AND fecha_limite_sla IS NOT NULL "
            "AND fecha_limite_sla != '' "
            "AND (substr(fecha_limite_sla,7,4)||'-'||substr(fecha_limite_sla,4,2)"
            "||'-'||substr(fecha_limite_sla,1,2)) < date('now') "
            f"{filtro}"
        )

        sla_vencido = conn.execute(query, params).fetchone()[0]

        # Duplicadas
        query = (
            "SELECT COUNT(*) "
            f"FROM incidencias WHERE duplicada=1 {filtro}"
        )

        n_duplicadas = conn.execute(query, params).fetchone()[0]

        # Por mes
        por_mes = []

        query = (
            "SELECT "
            "substr(fecha_hora,4,2)||'/'||substr(fecha_hora,7,4) mes, "
            "COUNT(*) n "
            "FROM incidencias "
            "WHERE length(fecha_hora)>=10 "
            f"{filtro} "
            "GROUP BY mes "
            "ORDER BY substr(fecha_hora,7,4)||substr(fecha_hora,4,2) DESC "
            "LIMIT 6"
        )

        for row in conn.execute(query, params):
            por_mes.append(
                {
                    "mes": row["mes"],
                    "n": row["n"],
                }
            )

        por_mes.reverse()

        # Tiempo medio resolución
        t_medio_query = (
            "SELECT AVG("
            "julianday(substr(e.fecha_fin,7,4)||'-'||substr(e.fecha_fin,4,2)||'-'||substr(e.fecha_fin,1,2)) "
            "- "
            "julianday(substr(i.fecha_hora,7,4)||'-'||substr(i.fecha_hora,4,2)||'-'||substr(i.fecha_hora,1,2))"
            ") "
            "FROM escalados e "
            "JOIN incidencias i ON e.incidencia_id=i.id "
            "WHERE i.estado_actual IN ('SOLUCIONADA','FINALIZADA') "
            "AND e.fecha_fin != '' "
            "AND i.fecha_hora != '' "
            "AND length(e.fecha_fin)>=10 "
            "AND length(i.fecha_hora)>=10"
        )

        t_medio = conn.execute(t_medio_query).fetchone()[0]

        # Técnicos activos
        tecnicos_query = (
            "SELECT usuario_nombre, COUNT(*) n "
            "FROM incidencia_eventos "
            "WHERE tipo_evento IN ('ASIGNADA','INICIO_TRABAJO','SOLUCIONADA') "
            "AND timestamp >= datetime('now','-7 days') "
            "GROUP BY usuario_nombre "
            "ORDER BY n DESC"
        )

        tecnicos_activos = conn.execute(tecnicos_query).fetchall()

        return {
            "por_estado": por_estado,
            "por_linea": por_linea,
            "top_equipos": top_equipos,
            "sla_vencido": sla_vencido,
            "n_duplicadas": n_duplicadas,
            "por_mes": por_mes,
            "t_medio_dias": round(t_medio, 1) if t_medio else None,
            "tecnicos_activos": [dict(r) for r in tecnicos_activos],
        }

    finally:
        conn.close()


@router.get("/stats")
async def get_stats(
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    _: dict = Depends(get_current_active_user),
):
    return await _stats_impl(fecha_desde, fecha_hasta)


@router.get("/stats/")
async def get_stats_with_slash(
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    _: dict = Depends(get_current_active_user),
):
    return await _stats_impl(fecha_desde, fecha_hasta)