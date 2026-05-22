# app/routes/admin.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional
from pydantic import BaseModel
import sqlite3
import os
import jwt

router = APIRouter(prefix="/api/admin", tags=["admin"])
security = HTTPBearer()

# ============================================================
# Pydantic Models para Admin
# ============================================================

class ProyectoCreate(BaseModel):
    id: str
    nombre: str
    descripcion: Optional[str] = None
    initials: str
    tipo: str = "generico"
    db_url: str
    db_token: Optional[str] = None

class ProyectoOut(BaseModel):
    id: str
    nombre: str
    descripcion: Optional[str] = None
    initials: str
    tipo: str
    activo: bool = True

class UsuarioOut(BaseModel):
    id: int
    nombre: str
    email: str
    rol: str
    activo: bool

class AsignacionUsuario(BaseModel):
    usuario_id: int
    rol: str

# ============================================================
# Funciones auxiliares
# ============================================================

def get_master_db():
    """Conexión a la DB Master (incidencias.db que tiene usuarios y proyectos)"""
    # Usamos incidencias.db como master (tiene usuarios y proyectos)
    db_path = os.getenv("DATABASE_URL", "incidencias.db")
    
    # Si es URL de Turso
    if db_path.startswith("libsql://"):
        from libsql_client import create_client
        return create_client(db_path)
    
    # Si es SQLite local
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Obtener el usuario actual desde el token JWT"""
    token = credentials.credentials
    
    try:
        # Decodificar token
        payload = jwt.decode(
            token, 
            os.getenv("JWT_SECRET", "tu-secret-aqui-muy-largo"), 
            algorithms=["HS256"]
        )
        
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token inválido")
        
        # Buscar usuario en DB Master
        conn = get_master_db()
        try:
            if hasattr(conn, 'execute'):
                # SQLite
                user = conn.execute(
                    "SELECT id, nombre, email, rol, activo FROM usuarios WHERE id = ?", 
                    (user_id,)
                ).fetchone()
            else:
                # Turso
                result = await conn.execute(
                    "SELECT id, nombre, email, rol, activo FROM usuarios WHERE id = ?", 
                    [user_id]
                )
                user = result.rows[0] if result.rows else None
            
            if not user or not user["activo"]:
                raise HTTPException(status_code=401, detail="Usuario no encontrado o inactivo")
            
            return dict(user)
        finally:
            if hasattr(conn, 'close'):
                conn.close()
            
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

async def get_admin_user(current_user = Depends(get_current_user)):
    """Verificar que el usuario es ADMIN"""
    if current_user.get("rol") != "ADMIN":
        raise HTTPException(status_code=403, detail="Se requieren permisos de administrador")
    return current_user

# ============================================================
# ENDPOINTS
# ============================================================

@router.get("/proyectos", response_model=List[ProyectoOut])
async def get_all_proyectos(admin: dict = Depends(get_admin_user)):
    """Obtener todos los proyectos (solo ADMIN)"""
    conn = get_master_db()
    try:
        if hasattr(conn, 'execute'):
            # SQLite
            proyectos = conn.execute("""
                SELECT id, nombre, descripcion, initials, tipo, activo
                FROM proyectos
                WHERE activo = 1
                ORDER BY nombre
            """).fetchall()
        else:
            # Turso
            result = await conn.execute("""
                SELECT id, nombre, descripcion, initials, tipo, activo
                FROM proyectos
                WHERE activo = 1
                ORDER BY nombre
            """)
            proyectos = result.rows
        
        return [dict(p) for p in proyectos]
    finally:
        if hasattr(conn, 'close'):
            conn.close()

@router.get("/usuarios", response_model=List[UsuarioOut])
async def get_all_usuarios(admin: dict = Depends(get_admin_user)):
    """Obtener todos los usuarios (solo ADMIN)"""
    conn = get_master_db()
    try:
        if hasattr(conn, 'execute'):
            # SQLite
            usuarios = conn.execute("""
                SELECT id, nombre, email, rol, activo
                FROM usuarios
                WHERE activo = 1
                ORDER BY nombre
            """).fetchall()
        else:
            # Turso
            result = await conn.execute("""
                SELECT id, nombre, email, rol, activo
                FROM usuarios
                WHERE activo = 1
                ORDER BY nombre
            """)
            usuarios = result.rows
        
        return [dict(u) for u in usuarios]
    finally:
        if hasattr(conn, 'close'):
            conn.close()

@router.post("/proyectos")
async def create_proyecto(data: ProyectoCreate, admin: dict = Depends(get_admin_user)):
    """Crear un nuevo proyecto"""
    conn = get_master_db()
    try:
        # Verificar si ya existe
        if hasattr(conn, 'execute'):
            # SQLite
            existing = conn.execute("SELECT id FROM proyectos WHERE id = ?", (data.id,)).fetchone()
        else:
            # Turso
            result = await conn.execute("SELECT id FROM proyectos WHERE id = ?", [data.id])
            existing = result.rows[0] if result.rows else None
        
        if existing:
            raise HTTPException(status_code=400, detail=f"El proyecto {data.id} ya existe")
        
        # Insertar proyecto
        if hasattr(conn, 'execute'):
            # SQLite
            conn.execute("""
                INSERT INTO proyectos (id, nombre, descripcion, initials, tipo, db_url, db_token, activo)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1)
            """, (data.id, data.nombre, data.descripcion, data.initials, data.tipo, data.db_url, data.db_token))
            conn.commit()
        else:
            # Turso
            await conn.execute("""
                INSERT INTO proyectos (id, nombre, descripcion, initials, tipo, db_url, db_token, activo)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1)
            """, [data.id, data.nombre, data.descripcion, data.initials, data.tipo, data.db_url, data.db_token])
        
        return {"success": True, "id": data.id, "message": f"Proyecto {data.nombre} creado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if hasattr(conn, 'close'):
            conn.close()

@router.delete("/proyectos/{proyecto_id}")
async def delete_proyecto(proyecto_id: str, admin: dict = Depends(get_admin_user)):
    """Desactivar un proyecto (borrado lógico)"""
    conn = get_master_db()
    try:
        if hasattr(conn, 'execute'):
            # SQLite
            conn.execute("UPDATE proyectos SET activo = 0 WHERE id = ?", (proyecto_id,))
            conn.commit()
        else:
            # Turso
            await conn.execute("UPDATE proyectos SET activo = 0 WHERE id = ?", [proyecto_id])
        
        return {"success": True, "message": "Proyecto desactivado"}
    finally:
        if hasattr(conn, 'close'):
            conn.close()

@router.get("/proyectos/{proyecto_id}/usuarios")
async def get_proyecto_usuarios(proyecto_id: str, admin: dict = Depends(get_admin_user)):
    """Obtener usuarios asignados a un proyecto"""
    conn = get_master_db()
    try:
        if hasattr(conn, 'execute'):
            # SQLite
            usuarios = conn.execute("""
                SELECT u.id, u.nombre, u.email, pu.rol
                FROM usuarios u
                JOIN proyecto_usuarios pu ON u.id = pu.usuario_id
                WHERE pu.proyecto_id = ? AND u.activo = 1
            """, (proyecto_id,)).fetchall()
        else:
            # Turso
            result = await conn.execute("""
                SELECT u.id, u.nombre, u.email, pu.rol
                FROM usuarios u
                JOIN proyecto_usuarios pu ON u.id = pu.usuario_id
                WHERE pu.proyecto_id = ? AND u.activo = 1
            """, [proyecto_id])
            usuarios = result.rows
        
        return [dict(u) for u in usuarios]
    finally:
        if hasattr(conn, 'close'):
            conn.close()

@router.post("/proyectos/{proyecto_id}/usuarios")
async def assign_usuario_to_proyecto(
    proyecto_id: str, 
    data: AsignacionUsuario, 
    admin: dict = Depends(get_admin_user)
):
    """Asignar un usuario a un proyecto"""
    conn = get_master_db()
    try:
        # Verificar que existe el proyecto
        if hasattr(conn, 'execute'):
            # SQLite
            proyecto = conn.execute("SELECT id FROM proyectos WHERE id = ?", (proyecto_id,)).fetchone()
        else:
            # Turso
            result = await conn.execute("SELECT id FROM proyectos WHERE id = ?", [proyecto_id])
            proyecto = result.rows[0] if result.rows else None
        
        if not proyecto:
            raise HTTPException(status_code=404, detail="Proyecto no encontrado")
        
        # Verificar que existe el usuario
        if hasattr(conn, 'execute'):
            # SQLite
            usuario = conn.execute("SELECT id FROM usuarios WHERE id = ?", (data.usuario_id,)).fetchone()
        else:
            # Turso
            result = await conn.execute("SELECT id FROM usuarios WHERE id = ?", [data.usuario_id])
            usuario = result.rows[0] if result.rows else None
        
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        # Asignar
        if hasattr(conn, 'execute'):
            # SQLite
            conn.execute("""
                INSERT OR REPLACE INTO proyecto_usuarios (proyecto_id, usuario_id, rol)
                VALUES (?, ?, ?)
            """, (proyecto_id, data.usuario_id, data.rol))
            conn.commit()
        else:
            # Turso
            await conn.execute("""
                INSERT OR REPLACE INTO proyecto_usuarios (proyecto_id, usuario_id, rol)
                VALUES (?, ?, ?)
            """, [proyecto_id, data.usuario_id, data.rol])
        
        return {"success": True, "message": "Usuario asignado"}
    finally:
        if hasattr(conn, 'close'):
            conn.close()

@router.delete("/proyectos/{proyecto_id}/usuarios/{usuario_id}")
async def remove_usuario_from_proyecto(
    proyecto_id: str, 
    usuario_id: int, 
    admin: dict = Depends(get_admin_user)
):
    """Quitar un usuario de un proyecto"""
    conn = get_master_db()
    try:
        if hasattr(conn, 'execute'):
            # SQLite
            conn.execute("""
                DELETE FROM proyecto_usuarios 
                WHERE proyecto_id = ? AND usuario_id = ?
            """, (proyecto_id, usuario_id))
            conn.commit()
        else:
            # Turso
            await conn.execute("""
                DELETE FROM proyecto_usuarios 
                WHERE proyecto_id = ? AND usuario_id = ?
            """, [proyecto_id, usuario_id])
        
        return {"success": True, "message": "Usuario removido"}
    finally:
        if hasattr(conn, 'close'):
            conn.close()