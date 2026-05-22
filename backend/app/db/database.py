"""
Capa de base de datos multi-proyecto.

- BD MASTER  → usuarios, proyectos, usuario_proyecto
- BD PROYECTO → incidencias, escalados, historial, etc. (una por proyecto)

En desarrollo usa SQLite local. En producción usa Turso (libsql).
"""
import sqlite3
from app.core.config import get_settings

settings = get_settings()


# ── Wrapper Turso ─────────────────────────────────────────────────────────────

class TursoRow(dict):
    def __getitem__(self, key):
        if isinstance(key, int):
            return list(self.values())[key]
        return super().__getitem__(key)


class TursoCursor:
    def __init__(self, result_set):
        self._rs = result_set
        self.lastrowid = result_set.last_insert_rowid

    def _to_row(self, row):
        return TursoRow(row.asdict())

    def fetchone(self):
        rows = self._rs.rows
        return self._to_row(rows[0]) if rows else None

    def fetchall(self):
        return [self._to_row(r) for r in self._rs.rows]

    def __iter__(self):
        return iter(self.fetchall())


class TursoConnection:
    def __init__(self, client):
        self._client = client

    def execute(self, sql, params=()):
        args = list(params) if params else None
        result = self._client.execute(sql, args)
        return TursoCursor(result)

    def executescript(self, sql):
        statements = [s.strip() for s in sql.split(";") if s.strip()]
        if statements:
            self._client.batch(statements)

    def commit(self):
        pass

    def close(self):
        self._client.close()


# ── Conexión genérica ─────────────────────────────────────────────────────────

def _make_connection(url: str, auth_token: str = "") -> object:
    if url.startswith("libsql://") or url.startswith("https://"):
        import libsql_client
        client = libsql_client.create_client_sync(url=url, auth_token=auth_token)
        return TursoConnection(client)
    else:
        path = url.replace("sqlite:///", "")
        conn = sqlite3.connect(path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        return conn


# ── BD Master ─────────────────────────────────────────────────────────────────

def get_master_connection():
    """Conexión a la BD master (usuarios + proyectos)."""
    conn = _make_connection(settings.DATABASE_URL, settings.TURSO_AUTH_TOKEN)
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


# Alias para compatibilidad con el código existente
def get_connection():
    return get_master_connection()


# ── BD de proyecto ────────────────────────────────────────────────────────────

def get_project_connection(proyecto_id: str):
    """
    Conexión a la BD de un proyecto concreto.
    Busca la URL y token en la tabla proyectos de la BD master.
    """
    conn = get_master_connection()
    proyecto = conn.execute(
        "SELECT db_url, db_token FROM proyectos WHERE id = ?",
        (proyecto_id,)
    ).fetchone()
    conn.close()

    if not proyecto:
        raise ValueError(f"Proyecto '{proyecto_id}' no encontrado en master")

    return _make_connection(proyecto["db_url"], proyecto["db_token"] or "")


# ── Schema master ─────────────────────────────────────────────────────────────

_MASTER_SCHEMA = """
CREATE TABLE IF NOT EXISTS proyectos (
    id          TEXT PRIMARY KEY,
    nombre      TEXT NOT NULL,
    descripcion TEXT,
    initials    TEXT NOT NULL DEFAULT '??',
    tipo        TEXT NOT NULL DEFAULT 'generico',
    db_url      TEXT NOT NULL,
    db_token    TEXT DEFAULT '',
    activo      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS usuario_proyecto (
    usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    proyecto_id TEXT NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    rol         TEXT NOT NULL DEFAULT 'TECNICO',
    PRIMARY KEY (usuario_id, proyecto_id)
);

CREATE TABLE IF NOT EXISTS usuarios (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre        TEXT NOT NULL,
    username      TEXT UNIQUE,
    email         TEXT NOT NULL UNIQUE,
    rol           TEXT NOT NULL DEFAULT 'TECNICO',
    password_hash TEXT NOT NULL,
    activo        INTEGER NOT NULL DEFAULT 1,
    ultimo_login  TEXT,
    created_at    TEXT DEFAULT (datetime('now','localtime'))
);
"""

# ── Schema de proyecto ────────────────────────────────────────────────────────

_PROJECT_SCHEMA = """
CREATE TABLE IF NOT EXISTS incidencias (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    estado_actual    TEXT NOT NULL DEFAULT 'PENDIENTE NOVA',
    tipo_aviso       TEXT NOT NULL DEFAULT 'Aviso',
    ot               TEXT,
    equipo_afectado  TEXT,
    zona             TEXT,
    linea            TEXT,
    estacion         TEXT,
    nombre_tecnico   TEXT,
    fecha_hora       TEXT,
    tipo             TEXT,
    prioridad        TEXT DEFAULT 'Media',
    sla              TEXT,
    fecha_limite_sla TEXT,
    hora_limite_sla  TEXT,
    solicitante      TEXT,
    descripcion_fallo       TEXT,
    comentarios_generales   TEXT,
    duplicada        INTEGER DEFAULT 0,
    duplicada_de     INTEGER REFERENCES incidencias(id) ON DELETE SET NULL,
    created_at       TEXT DEFAULT (datetime('now','localtime')),
    updated_at       TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS escalados (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    incidencia_id    INTEGER NOT NULL REFERENCES incidencias(id) ON DELETE CASCADE,
    nombre_tecnico   TEXT,
    fecha_asignacion TEXT,
    fecha_inicio     TEXT,
    hora_inicio      TEXT,
    fecha_fin        TEXT,
    hora_fin         TEXT,
    tiempo_desplazamiento TEXT,
    tiempo_actuacion TEXT,
    num_tecnicos     INTEGER DEFAULT 1,
    descripcion_trabajos TEXT,
    pieza_cambiada   INTEGER DEFAULT 0,
    sn_nueva TEXT, pn_nueva TEXT,
    sn_vieja TEXT, pn_vieja TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS historial_cambios (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    incidencia_id INTEGER NOT NULL REFERENCES incidencias(id) ON DELETE CASCADE,
    usuario       TEXT NOT NULL DEFAULT 'Sistema',
    campo         TEXT NOT NULL,
    valor_antes   TEXT,
    valor_despues TEXT,
    fecha         TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS incidencia_eventos (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    incidencia_id INTEGER NOT NULL REFERENCES incidencias(id) ON DELETE CASCADE,
    usuario_id    INTEGER,
    usuario_nombre TEXT,
    tipo_evento   TEXT NOT NULL,
    timestamp     TEXT DEFAULT (datetime('now','localtime')),
    payload       TEXT DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_eventos_incidencia ON incidencia_eventos(incidencia_id);
CREATE INDEX IF NOT EXISTS idx_eventos_tipo ON incidencia_eventos(tipo_evento);
"""


def init_db():
    """Inicializa la BD master con su schema."""
    conn = get_master_connection()
    conn.executescript(_MASTER_SCHEMA)
    _migrate_master(conn)
    conn.commit()
    conn.close()


def init_project_db(proyecto_id: str):
    """Inicializa la BD de un proyecto nuevo con su schema."""
    conn = get_project_connection(proyecto_id)
    conn.executescript(_PROJECT_SCHEMA)
    conn.commit()
    conn.close()


def _migrate_master(conn):
    """Migraciones incrementales sobre la BD master."""
    existing_usr = {row[1] for row in conn.execute("PRAGMA table_info(usuarios)")}
    if "username" not in existing_usr:
        conn.execute("ALTER TABLE usuarios ADD COLUMN username TEXT")

    # Crear tablas nuevas si venimos de una versión anterior sin multi-proyecto
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS proyectos (
            id TEXT PRIMARY KEY, nombre TEXT NOT NULL,
            descripcion TEXT, initials TEXT NOT NULL DEFAULT '??',
            tipo TEXT NOT NULL DEFAULT 'generico',
            db_url TEXT NOT NULL, db_token TEXT DEFAULT '',
            activo INTEGER NOT NULL DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        );
        CREATE TABLE IF NOT EXISTS usuario_proyecto (
            usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            proyecto_id TEXT NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
            rol TEXT NOT NULL DEFAULT 'TECNICO',
            PRIMARY KEY (usuario_id, proyecto_id)
        );
    """)

    # Migración: añadir tipo si no existe en proyectos ya creados
    existing_proy = {row[1] for row in conn.execute("PRAGMA table_info(proyectos)")}
    if "tipo" not in existing_proy:
        conn.execute("ALTER TABLE proyectos ADD COLUMN tipo TEXT NOT NULL DEFAULT 'generico'")