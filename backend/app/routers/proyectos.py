"""
Router de gestión de proyectos (solo ADMIN).
Permite crear proyectos nuevos, asignar usuarios, etc.
"""
from typing import Annotated
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.core.security import get_current_active_user, require_rol
from app.db.database import get_master_connection, init_project_db

router = APIRouter(prefix="/api/proyectos", tags=["proyectos"])

RequireAdmin = Depends(require_rol("ADMIN"))


class ProyectoCreate(BaseModel):
    id: str
    nombre: str
    descripcion: str = ""
    initials: str
    tipo: str = "generico"  # "metro" o "generico"
    db_url: str
    db_token: str = ""


class AsignarUsuario(BaseModel):
    usuario_id: int
    rol: str = "TECNICO"


# ── CRUD proyectos ─────────────────────────────────────────────────────────────

@router.get("")
@router.get("/")
async def listar_proyectos(_=RequireAdmin):
    conn = get_master_connection()
    rows = conn.execute(
        "SELECT id, nombre, descripcion, initials, activo, created_at FROM proyectos WHERE activo = 1"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.post("")
@router.post("/")
async def crear_proyecto(body: ProyectoCreate, _=RequireAdmin):
    """Crea un proyecto nuevo y provisiona su BD."""
    conn = get_master_connection()

    # Verificar que no existe ya
    existe = conn.execute(
        "SELECT id FROM proyectos WHERE id=?", (body.id,)
    ).fetchone()
    if existe:
        conn.close()
        raise HTTPException(status_code=409, detail="Ya existe un proyecto con ese ID")

    conn.execute(
        """INSERT INTO proyectos (id, nombre, descripcion, initials, tipo, db_url, db_token)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (body.id, body.nombre, body.descripcion, body.initials, body.tipo, body.db_url, body.db_token)
    )
    conn.commit()
    conn.close()

    # Provisionar la BD del proyecto con el schema
    try:
        init_project_db(body.id)
    except Exception as e:
        # Si falla el provisionamiento, revertir
        conn = get_master_connection()
        conn.execute("DELETE FROM proyectos WHERE id=?", (body.id,))
        conn.commit()
        conn.close()
        raise HTTPException(status_code=500, detail=f"Error provisionando BD: {str(e)}")

    return {"ok": True, "id": body.id}


@router.delete("/{proyecto_id}")
async def desactivar_proyecto(proyecto_id: str, _=RequireAdmin):
    conn = get_master_connection()
    conn.execute("UPDATE proyectos SET activo=0 WHERE id=?", (proyecto_id,))
    conn.commit()
    conn.close()
    return {"ok": True}


# ── Asignación de usuarios ─────────────────────────────────────────────────────

@router.post("/{proyecto_id}/usuarios")
async def asignar_usuario(proyecto_id: str, body: AsignarUsuario, _=RequireAdmin):
    conn = get_master_connection()
    try:
        conn.execute(
            """INSERT INTO usuario_proyecto (usuario_id, proyecto_id, rol)
               VALUES (?, ?, ?)
               ON CONFLICT(usuario_id, proyecto_id) DO UPDATE SET rol=excluded.rol""",
            (body.usuario_id, proyecto_id, body.rol)
        )
        conn.commit()
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=400, detail=str(e))
    conn.close()
    return {"ok": True}


@router.delete("/{proyecto_id}/usuarios/{usuario_id}")
async def desasignar_usuario(proyecto_id: str, usuario_id: int, _=RequireAdmin):
    conn = get_master_connection()
    conn.execute(
        "DELETE FROM usuario_proyecto WHERE usuario_id=? AND proyecto_id=?",
        (usuario_id, proyecto_id)
    )
    conn.commit()
    conn.close()
    return {"ok": True}


@router.get("/{proyecto_id}/usuarios")
async def usuarios_proyecto(proyecto_id: str, _=RequireAdmin):
    conn = get_master_connection()
    rows = conn.execute(
        """SELECT u.id, u.nombre, u.email, up.rol
           FROM usuarios u
           JOIN usuario_proyecto up ON up.usuario_id = u.id
           WHERE up.proyecto_id = ? AND u.activo = 1""",
        (proyecto_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ============================================================
# NUEVOS ENDPOINTS PARA ADMIN (agregar al final)
# ============================================================

@router.get("/admin/usuarios")
async def listar_todos_usuarios(current_user: Annotated[dict, Depends(get_current_active_user)]):
    """[ADMIN] Obtener todos los usuarios del sistema"""
    if current_user.get("rol") != "ADMIN":
        raise HTTPException(status_code=403, detail="Se requieren permisos de administrador")
    
    conn = get_master_connection()
    rows = conn.execute(
        "SELECT id, nombre, email, rol, activo FROM usuarios WHERE activo = 1 ORDER BY nombre"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.get("/admin/usuarios-disponibles/{proyecto_id}")
async def listar_usuarios_disponibles(proyecto_id: str, current_user: Annotated[dict, Depends(get_current_active_user)]):
    """[ADMIN] Obtener usuarios NO asignados a un proyecto"""
    if current_user.get("rol") != "ADMIN":
        raise HTTPException(status_code=403, detail="Se requieren permisos de administrador")
    
    conn = get_master_connection()
    rows = conn.execute(
        """SELECT u.id, u.nombre, u.email, u.rol
           FROM usuarios u
           WHERE u.activo = 1 
           AND u.id NOT IN (
               SELECT up.usuario_id FROM usuario_proyecto up WHERE up.proyecto_id = ?
           )
           ORDER BY u.nombre""",
        (proyecto_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]