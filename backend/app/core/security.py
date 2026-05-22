from datetime import datetime, timedelta, timezone
from typing import Annotated
import hashlib
import bcrypt

from fastapi import Depends, HTTPException, status, Header
from jose import JWTError, jwt

from app.core.config import get_settings
from app.db.database import get_master_connection

settings = get_settings()


# ── Passwords ──────────────────────────────────────────────────────────────────

def _prep(password: str) -> bytes:
    return hashlib.sha256(password.encode()).hexdigest().encode()

def hash_password(password: str) -> str:
    return bcrypt.hashpw(_prep(password), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(_prep(plain), hashed.encode())


# ── JWT ────────────────────────────────────────────────────────────────────────

def _create_token(data: dict, expires_delta: timedelta) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + expires_delta
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_access_token(user_id: int, rol: str, proyecto_id: str = None) -> str:
    data = {"sub": str(user_id), "rol": rol, "type": "access"}
    if proyecto_id:
        data["proyecto_id"] = proyecto_id
    return _create_token(data, timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))


def create_refresh_token(user_id: int) -> str:
    return _create_token(
        {"sub": str(user_id), "type": "refresh"},
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ── User resolution ────────────────────────────────────────────────────────────

def _get_user_from_token(token: str) -> dict:
    payload = decode_token(token)

    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Tipo de token incorrecto")

    user_id = int(payload["sub"])

    conn = get_master_connection()
    user = conn.execute(
        "SELECT id, nombre, email, rol, activo FROM usuarios WHERE id=?",
        (user_id,)
    ).fetchone()
    conn.close()

    if not user or not user["activo"]:
        raise HTTPException(status_code=401, detail="Usuario no encontrado o desactivado")

    result = dict(user)
    # Incluir proyecto_id del token si existe
    if "proyecto_id" in payload:
        result["proyecto_id"] = payload["proyecto_id"]
        # Usar el rol del proyecto en vez del rol global
        conn2 = get_master_connection()
        asig = conn2.execute(
            "SELECT rol FROM usuario_proyecto WHERE usuario_id=? AND proyecto_id=?",
            (user_id, payload["proyecto_id"])
        ).fetchone()
        conn2.close()
        if asig:
            result["rol"] = asig["rol"]

    return result


# ── Dependencias FastAPI ───────────────────────────────────────────────────────

async def get_current_user(authorization: str = Header(None)) -> dict:
    if not authorization:
        raise HTTPException(status_code=401, detail="No autenticado")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Formato de token inválido")
    token = authorization.split(" ")[1]
    return _get_user_from_token(token)


async def get_current_active_user(
    user: Annotated[dict, Depends(get_current_user)]
) -> dict:
    return user


def require_rol(*roles: str):
    async def checker(user: Annotated[dict, Depends(get_current_active_user)]):
        if user["rol"] not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Se requiere rol: {', '.join(roles)}",
            )
        return user
    return checker


RequireAdmin = Depends(require_rol("ADMIN"))
RequireTecnico = Depends(require_rol("ADMIN", "TECNICO"))