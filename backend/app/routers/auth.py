from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.security import (
    verify_password, create_access_token,
    get_current_active_user, hash_password,
)
from app.db.database import get_master_connection, get_project_connection
from app.models.schemas import LoginRequest

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ── Login ──────────────────────────────────────────────────────────────────────

async def _login_impl(body: LoginRequest):
    conn = get_master_connection()
    user = conn.execute(
        "SELECT * FROM usuarios WHERE (email=? OR username=? OR nombre=?) AND activo=1",
        (body.email, body.email, body.email)
    ).fetchone()
    conn.close()

    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")

    user = dict(user)
    conn = get_master_connection()
    conn.execute(
        "UPDATE usuarios SET ultimo_login=? WHERE id=?",
        (datetime.now().strftime("%Y-%m-%d %H:%M:%S"), user["id"]),
    )
    conn.commit()
    conn.close()

    # Token inicial SIN proyecto — el usuario elige proyecto después
    access_token = create_access_token(user["id"], user["rol"])

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id":     user["id"],
            "nombre": user["nombre"],
            "email":  user["email"],
            "rol":    user["rol"],
        }
    }

@router.post("/login")
async def login(body: LoginRequest):
    return await _login_impl(body)

@router.post("/login/")
async def login_with_slash(body: LoginRequest):
    return await _login_impl(body)


# ── Selección de proyecto ──────────────────────────────────────────────────────

class SelectProjectRequest(BaseModel):
    proyecto_id: str

@router.post("/select-project")
async def select_project(
    body: SelectProjectRequest,
    user: Annotated[dict, Depends(get_current_active_user)]
):
    """Refresca el JWT incluyendo el proyecto_id elegido."""
    conn = get_master_connection()

    # Verificar que el usuario tiene acceso al proyecto
    asignacion = conn.execute(
        """SELECT up.rol, p.nombre, p.initials, p.tipo
           FROM usuario_proyecto up
           JOIN proyectos p ON p.id = up.proyecto_id
           WHERE up.usuario_id = ? AND up.proyecto_id = ? AND p.activo = 1""",
        (user["id"], body.proyecto_id)
    ).fetchone()
    conn.close()

    if not asignacion:
        raise HTTPException(status_code=403, detail="Sin acceso a este proyecto")

    new_token = create_access_token(user["id"], user["rol"], body.proyecto_id)

    return {
        "access_token": new_token,
        "token_type": "bearer",
        "proyecto": {
            "id":       body.proyecto_id,
            "nombre":   asignacion["nombre"],
            "initials": asignacion["initials"],
            "rol":      asignacion["rol"],
            "tipo":     asignacion["tipo"],
        }
    }


# ── Proyectos del usuario ──────────────────────────────────────────────────────

@router.get("/mis-proyectos")
async def mis_proyectos(user: Annotated[dict, Depends(get_current_active_user)]):
    conn = get_master_connection()

    if user["rol"] == "ADMIN":
        rows = conn.execute(
            "SELECT id, nombre, descripcion, initials, tipo FROM proyectos WHERE activo=1"
        ).fetchall()
        proyectos = [{"id": r["id"], "nombre": r["nombre"],
                      "descripcion": r["descripcion"],
                      "initials": r["initials"],
                      "tipo": r["tipo"],
                      "rol": "ADMIN"} for r in rows]
    else:
        rows = conn.execute(
            """SELECT p.id, p.nombre, p.descripcion, p.initials, p.tipo, up.rol
               FROM proyectos p
               JOIN usuario_proyecto up ON up.proyecto_id = p.id
               WHERE up.usuario_id = ? AND p.activo = 1""",
            (user["id"],)
        ).fetchall()
        proyectos = [dict(r) for r in rows]

    conn.close()

    # Añadir stats de cada proyecto
    for p in proyectos:
        try:
            pconn = get_project_connection(p["id"])
            total      = pconn.execute("SELECT COUNT(*) FROM incidencias").fetchone()[0]
            pendientes = pconn.execute(
                "SELECT COUNT(*) FROM incidencias WHERE estado_actual NOT IN ('SOLUCIONADA')"
            ).fetchone()[0]
            resueltas  = pconn.execute(
                "SELECT COUNT(*) FROM incidencias WHERE estado_actual = 'SOLUCIONADA'"
            ).fetchone()[0]
            criticas   = pconn.execute(
                "SELECT COUNT(*) FROM incidencias WHERE prioridad = 'Alta' AND estado_actual != 'SOLUCIONADA'"
            ).fetchone()[0]
            pconn.close()
            p["stats"] = {
                "total": total,
                "pendientes": pendientes,
                "resueltas": resueltas,
                "criticas": criticas,
            }
        except Exception:
            p["stats"] = {"total": 0, "pendientes": 0, "resueltas": 0, "criticas": 0}

    return proyectos


# ── Logout / Me ────────────────────────────────────────────────────────────────

@router.post("/logout")
@router.post("/logout/")
async def logout():
    return {"detail": "Sesion cerrada"}

@router.get("/me")
@router.get("/me/")
async def me(user: Annotated[dict, Depends(get_current_active_user)]):
    return user