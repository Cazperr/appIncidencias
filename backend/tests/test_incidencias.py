"""Tests de incidencias — endpoints críticos."""
import pytest
import sqlite3


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_listar_incidencias_sin_auth(client):
    resp = client.get("/api/incidencias")
    assert resp.status_code == 401


def test_listar_incidencias_con_auth(client, admin_token):
    resp = client.get("/api/incidencias", headers=_auth(admin_token))
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data


def test_crear_incidencia(client, admin_token):
    resp = client.post("/api/incidencias", json={
        "descripcion_fallo": "Fallo de prueba",
        "tipo_aviso": "Aviso",
        "prioridad": "Media",
    }, headers=_auth(admin_token))
    assert resp.status_code in (200, 201), resp.text
    assert "id" in resp.json()


def test_cambiar_estado_incidencia(client, admin_token):
    # Crear incidencia
    resp = client.post("/api/incidencias", json={
        "descripcion_fallo": "Test estado",
        "tipo_aviso": "Aviso",
        "prioridad": "Alta",
    }, headers=_auth(admin_token))
    assert resp.status_code in (200, 201), resp.text
    inc_id = resp.json()["id"]

    # Cambiar estado via PUT
    resp = client.put(f"/api/incidencias/{inc_id}",
        json={"estado_actual": "SOLUCIONADA"},
        headers=_auth(admin_token)
    )
    assert resp.status_code == 200, resp.text

    # Verificar
    resp = client.get(f"/api/incidencias/{inc_id}", headers=_auth(admin_token))
    assert resp.json()["estado_actual"] == "SOLUCIONADA"


def test_anadir_visita_con_cambio_estado(client, admin_token):
    """Verifica que se puede añadir una visita y cambiar el estado."""
    resp = client.post("/api/incidencias", json={
        "descripcion_fallo": "Test visita",
        "tipo_aviso": "Aviso",
        "prioridad": "Media",
    }, headers=_auth(admin_token))
    assert resp.status_code in (200, 201), resp.text
    inc_id = resp.json()["id"]

    resp = client.post(f"/api/incidencias/{inc_id}/visita", json={
        "descripcion_trabajos": "Revisión realizada",
        "num_tecnicos": 1,
        "estado_resultante": "SOLUCIONADA",
    }, headers=_auth(admin_token))
    assert resp.status_code == 200, resp.text

    # Verificar que el estado cambió
    resp = client.get(f"/api/incidencias/{inc_id}", headers=_auth(admin_token))
    assert resp.json()["estado_actual"] == "SOLUCIONADA"


def test_incidencia_no_existe(client, admin_token):
    resp = client.get("/api/incidencias/99999", headers=_auth(admin_token))
    assert resp.status_code == 404
