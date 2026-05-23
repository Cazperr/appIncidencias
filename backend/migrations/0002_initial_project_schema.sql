-- Migración 0002: Schema inicial de BD de proyecto

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
CREATE INDEX IF NOT EXISTS idx_incidencias_estado ON incidencias(estado_actual);
CREATE INDEX IF NOT EXISTS idx_incidencias_tecnico ON incidencias(nombre_tecnico);
