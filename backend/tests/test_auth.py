import sqlite3
"""Tests de autenticación."""
import pytest


def test_login_ok(client, admin_token):
    assert admin_token is not None
    assert len(admin_token) > 10


def test_login_credenciales_incorrectas(client):
    resp = client.post("/api/auth/login", json={
        "email": "noexiste@test.com", "password": "malapass"
    })
    assert resp.status_code == 401


def test_login_password_incorrecta(client, mock_db):
    from app.core.security import hash_password
    conn = sqlite3.connect(mock_db)
    conn.execute(
        "INSERT INTO usuarios (nombre, email, rol, password_hash) VALUES (?,?,?,?)",
        ("Usuario", "user@test.com", "TECNICO", hash_password("correcta"))
    )
    conn.commit(); conn.close()
    resp = client.post("/api/auth/login", json={"email": "user@test.com", "password": "incorrecta"})
    assert resp.status_code == 401


def test_me_con_token(client, admin_token):
    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "admin@test.com"
    assert data["rol"] == "ADMIN"


def test_me_sin_token(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401


def test_token_invalido(client):
    resp = client.get("/api/auth/me", headers={"Authorization": "Bearer tokeninvalido"})
    assert resp.status_code == 401


def test_login_con_email_completo(client, admin_token):
    """Verifica que el token de admin es válido y contiene los datos correctos."""
    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == "admin@test.com"
