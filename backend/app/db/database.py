"""
Capa de base de datos.
- Desarrollo local  → SQLite estándar (sqlite:///./incidencias.db)
- Producción Turso  → libsql_client (libsql://xxx.turso.io) + TURSO_AUTH_TOKEN
"""
import sqlite3
from app.core.config import get_settings

settings = get_settings()


# ── Wrapper para libsql_client ────────────────────────────────────────────────

class TursoRow(dict):
    """Imita sqlite3.Row: acceso por nombre y por índice."""
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
        pass  # libsql_client auto-commit en cada execute()

    def close(self):
        self._client.close()


# ── Conexión ──────────────────────────────────────────────────────────────────

def get_connection():
    url = settings.DATABASE_URL

    if url.startswith("libsql://") or url.startswith("https://"):
        import libsql_client
        client = libsql_client.create_client_sync(
            url=url,
            auth_token=settings.TURSO_AUTH_TOKEN,
        )
        conn = TursoConnection(client)
    else:
        path = url.replace("sqlite:///", "")
        conn = sqlite3.connect(path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")

    conn.execute("PRAGMA foreign_keys = ON")
    return conn


# ── Schema completo ───────────────────────────────────────────────────────────

_SCHEMA = """
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

CREATE TABLE IF NOT EXISTS usuarios (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre        TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    rol           TEXT NOT NULL DEFAULT 'TECNICO',
    password_hash TEXT NOT NULL,
    activo        INTEGER NOT NULL DEFAULT 1,
    ultimo_login  TEXT,
    created_at    TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS incidencia_eventos (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    incidencia_id INTEGER NOT NULL REFERENCES incidencias(id) ON DELETE CASCADE,
    usuario_id    INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    usuario_nombre TEXT,
    tipo_evento   TEXT NOT NULL,
    timestamp     TEXT DEFAULT (datetime('now','localtime')),
    payload       TEXT DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_eventos_incidencia ON incidencia_eventos(incidencia_id);
CREATE INDEX IF NOT EXISTS idx_eventos_tipo ON incidencia_eventos(tipo_evento)
"""


def init_db():
    """Crea todas las tablas si no existen. Seguro de ejecutar varias veces."""
    conn = get_connection()
    conn.executescript(_SCHEMA)
    _migrate(conn)
    conn.commit()
    conn.close()


def _migrate(conn):
    """Añade columnas nuevas a tablas existentes sin romper datos."""
    existing_inc = {row[1] for row in conn.execute("PRAGMA table_info(incidencias)")}
    for col, defn in [
        ("duplicada",    "INTEGER DEFAULT 0"),
        ("duplicada_de", "INTEGER REFERENCES incidencias(id) ON DELETE SET NULL"),
        ("updated_at",   "TEXT"),
    ]:
        if col not in existing_inc:
            conn.execute(f"ALTER TABLE incidencias ADD COLUMN {col} {defn}")
            if col == "updated_at":
                conn.execute(
                    "UPDATE incidencias SET updated_at = COALESCE(created_at, datetime('now','localtime')) WHERE updated_at IS NULL"
                )