"""
Configuración de tests. BD SQLite temporal compartida por todas las conexiones.
"""
import pytest
import sqlite3
import os
from fastapi.testclient import TestClient
from unittest.mock import patch

SCHEMA = """
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL, username TEXT UNIQUE,
    email TEXT NOT NULL UNIQUE, rol TEXT NOT NULL DEFAULT 'TECNICO',
    password_hash TEXT NOT NULL, activo INTEGER NOT NULL DEFAULT 1,
    ultimo_login TEXT, created_at TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS proyectos (
    id TEXT PRIMARY KEY, nombre TEXT NOT NULL, descripcion TEXT,
    initials TEXT NOT NULL DEFAULT '??', tipo TEXT NOT NULL DEFAULT 'generico',
    db_url TEXT NOT NULL, db_token TEXT DEFAULT '',
    activo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS usuario_proyecto (
    usuario_id INTEGER NOT NULL, proyecto_id TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'TECNICO',
    PRIMARY KEY (usuario_id, proyecto_id)
);
CREATE TABLE IF NOT EXISTS incidencias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    estado_actual TEXT NOT NULL DEFAULT 'PENDIENTE NOVA',
    tipo_aviso TEXT NOT NULL DEFAULT 'Aviso',
    ot TEXT, equipo_afectado TEXT, zona TEXT, linea TEXT,
    estacion TEXT, nombre_tecnico TEXT, fecha_hora TEXT,
    tipo TEXT, prioridad TEXT DEFAULT 'Media',
    sla TEXT, fecha_limite_sla TEXT, hora_limite_sla TEXT,
    solicitante TEXT, descripcion_fallo TEXT, comentarios_generales TEXT,
    duplicada INTEGER DEFAULT 0, duplicada_de INTEGER,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS incidencia_eventos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    incidencia_id INTEGER NOT NULL, usuario_id INTEGER,
    usuario_nombre TEXT, tipo_evento TEXT NOT NULL,
    timestamp TEXT DEFAULT (datetime('now','localtime')),
    payload TEXT DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS escalados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    incidencia_id INTEGER NOT NULL,
    nombre_tecnico TEXT, fecha_asignacion TEXT,
    fecha_inicio TEXT, hora_inicio TEXT,
    fecha_fin TEXT, hora_fin TEXT,
    tiempo_desplazamiento TEXT, tiempo_actuacion TEXT,
    num_tecnicos INTEGER DEFAULT 1,
    descripcion_trabajos TEXT, pieza_cambiada INTEGER DEFAULT 0,
    sn_nueva TEXT, pn_nueva TEXT, sn_vieja TEXT, pn_vieja TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS historial_cambios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    incidencia_id INTEGER NOT NULL, usuario TEXT NOT NULL DEFAULT 'Sistema',
    campo TEXT NOT NULL, valor_antes TEXT, valor_despues TEXT,
    fecha TEXT DEFAULT (datetime('now','localtime'))
);
"""

@pytest.fixture(autouse=True)
def mock_db(tmp_path):
    """BD SQLite temporal compartida — mismo fichero para todas las conexiones."""
    db_path = str(tmp_path / "test.db")

    # Inicializar schema
    conn = sqlite3.connect(db_path)
    conn.executescript(SCHEMA)
    conn.commit()
    conn.close()

    def make_conn(*args, **kwargs):
        c = sqlite3.connect(db_path, check_same_thread=False)
        c.row_factory = sqlite3.Row
        c.execute("PRAGMA journal_mode=WAL")
        return c

    with patch("app.db.database.get_master_connection", side_effect=make_conn), \
         patch("app.db.database.get_project_connection", side_effect=lambda pid: make_conn()), \
         patch("app.db.database.get_connection", side_effect=make_conn):
        yield db_path


@pytest.fixture
def client(mock_db):
    from app.main import app
    return TestClient(app)


@pytest.fixture
def admin_token(client, mock_db):
    from app.core.security import hash_password
    conn = sqlite3.connect(mock_db, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute(
        "INSERT INTO usuarios (nombre, email, rol, password_hash) VALUES (?,?,?,?)",
        ("Admin Test", "admin@test.com", "ADMIN", hash_password("Test1234!"))
    )
    conn.execute(
        "INSERT INTO proyectos (id, nombre, initials, tipo, db_url) VALUES (?,?,?,?,?)",
        ("test-project", "Proyecto Test", "TP", "generico", "sqlite:///./test.db")
    )
    conn.commit(); conn.close()

    resp = client.post("/api/auth/login", json={"email": "admin@test.com", "password": "Test1234!"})
    assert resp.status_code == 200, f"Login falló: {resp.text}"
    token = resp.json()["access_token"]

    # Asignar al proyecto
    conn = sqlite3.connect(mock_db, check_same_thread=False)
    conn.execute(
        "INSERT INTO usuario_proyecto (usuario_id, proyecto_id, rol) VALUES (1,'test-project','ADMIN')"
    )
    conn.commit(); conn.close()

    # Seleccionar proyecto
    resp2 = client.post(
        "/api/auth/select-project",
        json={"proyecto_id": "test-project"},
        headers={"Authorization": f"Bearer {token}"}
    )
    if resp2.status_code == 200:
        return resp2.json()["access_token"]
    return token


@pytest.fixture
def tecnico_token(client, mock_db):
    from app.core.security import hash_password
    conn = sqlite3.connect(mock_db, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute(
        "INSERT INTO usuarios (nombre, username, email, rol, password_hash) VALUES (?,?,?,?,?)",
        ("Tecnico Test", "tecnico", "tecnico@test.com", "TECNICO", hash_password("Test1234!"))
    )
    # Asegurarse de que el proyecto existe
    conn.execute(
        "INSERT OR IGNORE INTO proyectos (id, nombre, initials, tipo, db_url) VALUES (?,?,?,?,?)",
        ("test-project", "Proyecto Test", "TP", "generico", "sqlite:///./test.db")
    )
    conn.commit()
    user_id = conn.execute("SELECT id FROM usuarios WHERE email='tecnico@test.com'").fetchone()[0]
    conn.execute(
        "INSERT INTO usuario_proyecto (usuario_id, proyecto_id, rol) VALUES (?,'test-project','TECNICO')",
        (user_id,)
    )
    conn.execute("PRAGMA wal_checkpoint(FULL)")
    conn.commit(); conn.close()

    resp = client.post("/api/auth/login", json={"email": "tecnico@test.com", "password": "Test1234!"})
    assert resp.status_code == 200, f"Login técnico falló: {resp.text}"
    token = resp.json()["access_token"]

    resp2 = client.post(
        "/api/auth/select-project",
        json={"proyecto_id": "test-project"},
        headers={"Authorization": f"Bearer {token}"}
    )
    if resp2.status_code == 200:
        return resp2.json()["access_token"]
    return token
