from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import (
    verify_password, create_access_token, create_refresh_token,
    decode_token, get_current_active_user, hash_password,
)
from app.db.database import get_connection
from app.models.schemas import LoginRequest, TokenResponse, UsuarioOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


async def _login_impl(body: LoginRequest):
    conn = get_connection()
    user = conn.execute(
        "SELECT * FROM usuarios WHERE email=? AND activo=1", (body.email,)
    ).fetchone()
    conn.close()

    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email o contrasena incorrectos")

    user = dict(user)
    conn = get_connection()
    conn.execute(
        "UPDATE usuarios SET ultimo_login=? WHERE id=?",
        (datetime.now().strftime("%Y-%m-%d %H:%M:%S"), user["id"]),
    )
    conn.commit()
    conn.close()

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


@router.post("/logout")
async def logout():
    return {"detail": "Sesion cerrada"}

@router.post("/logout/")
async def logout_with_slash():
    return {"detail": "Sesion cerrada"}


@router.get("/me")
async def me(user: Annotated[dict, Depends(get_current_active_user)]):
    return user

@router.get("/me/")
async def me_with_slash(user: Annotated[dict, Depends(get_current_active_user)]):
    return user