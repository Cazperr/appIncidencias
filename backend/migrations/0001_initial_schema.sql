-- Migración 0001: Schema inicial
-- BD MASTER

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
