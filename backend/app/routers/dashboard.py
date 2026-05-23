from typing import Optional

from fastapi import APIRouter, Depends

from app.core.security import get_current_active_user
from app.db.database import get_project_connection, get_master_connection
from fastapi import HTTPException

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

ESTADOS_CERRADOS = ("SOLUCIONADA", "FINALIZADA")


def _ddmm_to_iso(s: str) -> Optional[str]:
    try:
        d, m, y = s.strip().split("/")
        return f"{y}-{m.zfill(2)}-{d.zfill(2)}"
    except Exception:
        return None


async def _stats_impl(user: dict, fecha_desde=None, fecha_hasta=None):
    proyecto_id = user.get("proyecto_id")
    if not proyecto_id:
        raise HTTPException(status_code=400, detail="No hay proyecto seleccionado.")
    conn = get_project_connection(proyecto_id)

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

        por_estado = {}
        for row in conn.execute(
            f"SELECT estado_actual, COUNT(*) n FROM incidencias WHERE 1=1 {filtro} GROUP BY estado_actual",
            params
        ):
            por_estado[row["estado_actual"]] = row["n"]

        por_linea = {}
        for row in conn.execute(
            "SELECT linea, COUNT(*) n FROM incidencias "
            f"WHERE estado_actual NOT IN ('SOLUCIONADA','FINALIZADA') {filtro} "
            "GROUP BY linea ORDER BY n DESC",
            params
        ):
            if row["linea"]:
                for linea in row["linea"].split(","):
                    linea = linea.strip()
                    if linea:
                        por_linea[linea] = por_linea.get(linea, 0) + row["n"]

        por_linea = dict(sorted(por_linea.items(), key=lambda x: x[1], reverse=True))

        top_equipos = []
        for row in conn.execute(
            "SELECT equipo_afectado, COUNT(*) n FROM incidencias "
            f"WHERE equipo_afectado IS NOT NULL AND equipo_afectado != '' {filtro} "
            "GROUP BY equipo_afectado ORDER BY n DESC LIMIT 10",
            params
        ):
            top_equipos.append({"equipo": row["equipo_afectado"], "n": row["n"]})

        sla_vencido = conn.execute(
            "SELECT COUNT(*) FROM incidencias "
            "WHERE estado_actual NOT IN ('SOLUCIONADA','FINALIZADA') "
            "AND fecha_limite_sla IS NOT NULL AND fecha_limite_sla != '' "
            "AND (substr(fecha_limite_sla,7,4)||'-'||substr(fecha_limite_sla,4,2)"
            "||'-'||substr(fecha_limite_sla,1,2)) < date('now') "
            f"{filtro}",
            params
        ).fetchone()[0]

        n_duplicadas = conn.execute(
            f"SELECT COUNT(*) FROM incidencias WHERE duplicada=1 {filtro}",
            params
        ).fetchone()[0]

        por_mes = []
        for row in conn.execute(
            "SELECT substr(fecha_hora,4,2)||'/'||substr(fecha_hora,7,4) mes, COUNT(*) n "
            f"FROM incidencias WHERE length(fecha_hora)>=10 {filtro} "
            "GROUP BY mes ORDER BY substr(fecha_hora,7,4)||substr(fecha_hora,4,2) DESC LIMIT 6",
            params
        ):
            por_mes.append({"mes": row["mes"], "n": row["n"]})
        por_mes.reverse()

        t_medio = conn.execute(
            "SELECT AVG("
            "julianday(substr(e.fecha_fin,7,4)||'-'||substr(e.fecha_fin,4,2)||'-'||substr(e.fecha_fin,1,2)) "
            "- "
            "julianday(substr(i.fecha_hora,7,4)||'-'||substr(i.fecha_hora,4,2)||'-'||substr(i.fecha_hora,1,2))"
            ") "
            "FROM escalados e JOIN incidencias i ON e.incidencia_id=i.id "
            "WHERE i.estado_actual IN ('SOLUCIONADA','FINALIZADA') "
            "AND e.fecha_fin != '' AND i.fecha_hora != '' "
            "AND length(e.fecha_fin)>=10 AND length(i.fecha_hora)>=10"
        ).fetchone()[0]

        tecnicos_activos = conn.execute(
            "SELECT usuario_nombre, COUNT(*) n FROM incidencia_eventos "
            "WHERE tipo_evento IN ('ASIGNADA','INICIO_TRABAJO','SOLUCIONADA') "
            "AND timestamp >= datetime('now','-7 days') "
            "GROUP BY usuario_nombre ORDER BY n DESC"
        ).fetchall()

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
    current: dict = Depends(get_current_active_user),
):
    return await _stats_impl(current, fecha_desde, fecha_hasta)


@router.get("/stats/")
async def get_stats_with_slash(
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    current: dict = Depends(get_current_active_user),
):
    return await _stats_impl(current, fecha_desde, fecha_hasta)


def _proyectos_usuario(user: dict):
    conn = get_master_connection()
    if user["rol"] == "ADMIN":
        rows = conn.execute(
            "SELECT id, nombre, initials FROM proyectos WHERE activo=1 ORDER BY nombre"
        ).fetchall()
    else:
        rows = conn.execute(
            """SELECT p.id, p.nombre, p.initials
               FROM proyectos p
               JOIN usuario_proyecto up ON up.proyecto_id = p.id
               WHERE up.usuario_id = ? AND p.activo = 1
               ORDER BY p.nombre""",
            (user["id"],),
        ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def _stats_proyecto(proyecto_id: str):
    conn = get_project_connection(proyecto_id)
    try:
        total = conn.execute("SELECT COUNT(*) FROM incidencias").fetchone()[0]
        cerrados_ph = ",".join("?" * len(ESTADOS_CERRADOS))
        abiertas = conn.execute(
            f"SELECT COUNT(*) FROM incidencias WHERE estado_actual NOT IN ({cerrados_ph})",
            ESTADOS_CERRADOS,
        ).fetchone()[0]
        cerradas = total - abiertas

        por_estado = {}
        for row in conn.execute(
            "SELECT estado_actual, COUNT(*) n FROM incidencias GROUP BY estado_actual"
        ):
            por_estado[row["estado_actual"]] = row["n"]

        por_mes = []
        for row in conn.execute(
            "SELECT substr(fecha_hora,4,2)||'/'||substr(fecha_hora,7,4) mes, COUNT(*) n "
            "FROM incidencias WHERE length(fecha_hora)>=10 "
            "GROUP BY mes ORDER BY substr(fecha_hora,7,4)||substr(fecha_hora,4,2) DESC LIMIT 12"
        ):
            por_mes.append({"mes": row["mes"], "n": row["n"]})
        por_mes.reverse()

        por_prioridad = {}
        for row in conn.execute(
            "SELECT prioridad, COUNT(*) n FROM incidencias GROUP BY prioridad"
        ):
            por_prioridad[row["prioridad"] or "Sin definir"] = row["n"]

        return {
            "total": total,
            "abiertas": abiertas,
            "cerradas": cerradas,
            "por_estado": por_estado,
            "por_mes": por_mes,
            "por_prioridad": por_prioridad,
        }
    finally:
        conn.close()


@router.get("/comparativa")
@router.get("/comparativa/")
async def comparativa(current: dict = Depends(get_current_active_user)):
    """Estadísticas agregadas de todos los proyectos accesibles por el usuario."""
    proyectos_meta = _proyectos_usuario(current)
    proyectos = []
    meses_set = set()
    por_mes_proyecto = {}

    for meta in proyectos_meta:
        try:
            stats = _stats_proyecto(meta["id"])
        except Exception:
            stats = {
                "total": 0, "abiertas": 0, "cerradas": 0,
                "por_estado": {}, "por_mes": [], "por_prioridad": {},
            }
        mes_map = {}
        for m in stats["por_mes"]:
            meses_set.add(m["mes"])
            mes_map[m["mes"]] = m["n"]
        por_mes_proyecto[meta["id"]] = mes_map
        proyectos.append({**meta, **stats})

    def mes_key(m):
        try:
            mm, yy = m.split("/")
            return f"{yy}{mm}"
        except Exception:
            return m

    meses = sorted(meses_set, key=mes_key)

    return {
        "proyectos": proyectos,
        "meses": meses,
        "por_mes_proyecto": por_mes_proyecto,
        "totales": {
            "proyectos": len(proyectos),
            "incidencias": sum(p["total"] for p in proyectos),
            "abiertas": sum(p["abiertas"] for p in proyectos),
            "cerradas": sum(p["cerradas"] for p in proyectos),
        },
    }
