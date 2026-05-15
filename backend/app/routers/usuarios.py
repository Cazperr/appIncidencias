from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException

from app.core.security import get_current_active_user, require_rol, hash_password
from app.db.database import get_connection
from app.models.schemas import UsuarioCreate, UsuarioUpdate, UsuarioOut

router = APIRouter(prefix="/api/usuarios", tags=["usuarios"])

AdminOnly = Depends(require_rol("ADMIN"))


# -------------------------
# HELPERS
# -------------------------
def row_to_dict(row, columns):
    return {col: row[i] for i, col in enumerate(columns)}


COLUMNS = [
    "id",
    "nombre",
    "email",
    "rol",
    "activo",
    "ultimo_login",
    "created_at",
]


# -------------------------
# LISTAR USUARIOS
# -------------------------
async def _list_impl(_=AdminOnly):
    conn = get_connection()

    rows = conn.execute("""
        SELECT id, nombre, email, rol, activo, ultimo_login, created_at
        FROM usuarios
        ORDER BY nombre
    """).fetchall()

    conn.close()

    return [row_to_dict(r, COLUMNS) for r in rows]


@router.get("/", response_model=list[UsuarioOut])
async def list_usuarios(_=AdminOnly):
    return await _list_impl(_)


@router.get("", response_model=list[UsuarioOut])
async def list_usuarios_no_slash(_=AdminOnly):
    return await _list_impl(_)


# -------------------------
# CREAR USUARIO
# -------------------------
async def _create_impl(body: UsuarioCreate, _=AdminOnly):
    conn = get_connection()

    existing = conn.execute(
        "SELECT id FROM usuarios WHERE email=?",
        (body.email,)
    ).fetchone()

    if existing:
        conn.close()
        raise HTTPException(status_code=400, detail="El email ya está registrado")

    cur = conn.execute("""
        INSERT INTO usuarios (nombre, email, rol, password_hash)
        VALUES (?,?,?,?)
    """, (
        body.nombre,
        body.email,
        body.rol,
        hash_password(body.password)
    ))

    conn.commit()
    user_id = cur.lastrowid

    row = conn.execute("""
        SELECT id, nombre, email, rol, activo, ultimo_login, created_at
        FROM usuarios
        WHERE id=?
    """, (user_id,)).fetchone()

    conn.close()

    return row_to_dict(row, COLUMNS)


@router.post("/", response_model=UsuarioOut, status_code=201)
async def create_usuario(body: UsuarioCreate, _=AdminOnly):
    return await _create_impl(body, _)


@router.post("", response_model=UsuarioOut, status_code=201)
async def create_usuario_no_slash(body: UsuarioCreate, _=AdminOnly):
    return await _create_impl(body, _)


# -------------------------
# ACTUALIZAR USUARIO
# -------------------------
async def _update_impl(user_id: int, body: UsuarioUpdate, _=AdminOnly):
    conn = get_connection()

    user = conn.execute(
        "SELECT id FROM usuarios WHERE id=?",
        (user_id,)
    ).fetchone()

    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    updates = body.model_dump(exclude_none=True)

    if "password" in updates:
        updates["password_hash"] = hash_password(updates.pop("password"))

    if updates:
        cols = ", ".join(f"{k}=?" for k in updates.keys())
        values = list(updates.values())

        conn.execute(
            f"UPDATE usuarios SET {cols} WHERE id=?",
            [*values, user_id]
        )
        conn.commit()

    row = conn.execute("""
        SELECT id, nombre, email, rol, activo, ultimo_login, created_at
        FROM usuarios
        WHERE id=?
    """, (user_id,)).fetchone()

    conn.close()

    return row_to_dict(row, COLUMNS)


@router.put("/{user_id}", response_model=UsuarioOut)
async def update_usuario(user_id: int, body: UsuarioUpdate, _=AdminOnly):
    return await _update_impl(user_id, body, _)


@router.put("/{user_id}/", response_model=UsuarioOut)
async def update_usuario_with_slash(user_id: int, body: UsuarioUpdate, _=AdminOnly):
    return await _update_impl(user_id, body, _)


# -------------------------
# ELIMINAR USUARIO
# -------------------------
async def _delete_impl(
    user_id: int,
    current: Annotated[dict, Depends(get_current_active_user)],
    _=AdminOnly
):
    if current["id"] == user_id:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")

    conn = get_connection()

    conn.execute(
        "DELETE FROM usuarios WHERE id=?",
        (user_id,)
    )

    conn.commit()
    conn.close()


@router.delete("/{user_id}", status_code=204)
async def delete_usuario(
    user_id: int,
    current: Annotated[dict, Depends(get_current_active_user)],
    _=AdminOnly
):
    return await _delete_impl(user_id, current, _)


@router.delete("/{user_id}/", status_code=204)
async def delete_usuario_with_slash(
    user_id: int,
    current: Annotated[dict, Depends(get_current_active_user)],
    _=AdminOnly
):
    return await _delete_impl(user_id, current, _)