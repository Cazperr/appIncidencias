#!/usr/bin/env python3
"""
Script de migración: importa los datos del incidencias.db original
a la nueva base de datos con las tablas de usuarios y eventos.

Uso:
  python migrate_db.py --origen /ruta/al/incidencias.db --destino ./incidencias.db

Si --destino no existe lo crea con el esquema nuevo.
Si ya existe solo añade los datos que falten (no duplica).
"""
import argparse
import sqlite3
import sys
from pathlib import Path


def migrate(origen: str, destino: str):
    print(f"📂 Origen:  {origen}")
    print(f"📂 Destino: {destino}")

    if not Path(origen).exists():
        print(f"❌ No se encuentra el archivo origen: {origen}")
        sys.exit(1)

    src = sqlite3.connect(origen)
    src.row_factory = sqlite3.Row

    dst = sqlite3.connect(destino)
    dst.row_factory = sqlite3.Row
    dst.execute("PRAGMA foreign_keys = ON")

    # Aplicar esquema nuevo
    _apply_schema(dst)

    # Migrar incidencias
    rows = src.execute("SELECT * FROM incidencias").fetchall()
    n_inc = 0
    for row in rows:
        r = dict(row)
        existing = dst.execute("SELECT id FROM incidencias WHERE id=?", (r["id"],)).fetchone()
        if not existing:
            cols = list(r.keys())
            ph = ",".join(["?"] * len(cols))
            dst.execute(
                f"INSERT INTO incidencias ({','.join(cols)}) VALUES ({ph})",
                [r[k] for k in cols],
            )
            n_inc += 1
    dst.commit()
    print(f"✅ Incidencias migradas: {n_inc} nuevas (de {len(rows)} totales)")

    # Migrar escalados
    rows = src.execute("SELECT * FROM escalados").fetchall()
    n_esc = 0
    for row in rows:
        r = dict(row)
        existing = dst.execute("SELECT id FROM escalados WHERE id=?", (r["id"],)).fetchone()
        if not existing:
            cols = list(r.keys())
            ph = ",".join(["?"] * len(cols))
            try:
                dst.execute(
                    f"INSERT INTO escalados ({','.join(cols)}) VALUES ({ph})",
                    [r[k] for k in cols],
                )
                n_esc += 1
            except Exception as e:
                print(f"  ⚠️  Escalado {r['id']}: {e}")
    dst.commit()
    print(f"✅ Escalados migrados:   {n_esc} nuevos")

    # Migrar historial_cambios
    rows = src.execute("SELECT * FROM historial_cambios").fetchall()
    n_hist = 0
    for row in rows:
        r = dict(row)
        existing = dst.execute(
            "SELECT id FROM historial_cambios WHERE id=?", (r["id"],)
        ).fetchone()
        if not existing:
            cols = list(r.keys())
            ph = ",".join(["?"] * len(cols))
            dst.execute(
                f"INSERT INTO historial_cambios ({','.join(cols)}) VALUES ({ph})",
                [r[k] for k in cols],
            )
            n_hist += 1
    dst.commit()
    print(f"✅ Historial migrado:    {n_hist} nuevas entradas")

    # Actualizar autoincrement sequences
    max_inc = dst.execute("SELECT MAX(id) FROM incidencias").fetchone()[0] or 0
    print(f"\n🔢 ID máximo incidencias: {max_inc}")

    src.close()
    dst.close()
    print("\n🎉 Migración completada. Ahora arranca el servidor y crea los usuarios.")


def _apply_schema(conn):
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS incidencias (
        id INTEGER PRIMARY KEY AUTOINCREMENT, estado_actual TEXT NOT NULL DEFAULT 'PENDIENTE NOVA',
        tipo_aviso TEXT NOT NULL DEFAULT 'Aviso', ot TEXT, equipo_afectado TEXT,
        zona TEXT, linea TEXT, estacion TEXT, nombre_tecnico TEXT, fecha_hora TEXT,
        tipo TEXT, prioridad TEXT DEFAULT 'Media', sla TEXT, fecha_limite_sla TEXT,
        hora_limite_sla TEXT, solicitante TEXT, descripcion_fallo TEXT,
        comentarios_generales TEXT, duplicada INTEGER DEFAULT 0,
        duplicada_de INTEGER REFERENCES incidencias(id) ON DELETE SET NULL,
        created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS escalados (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        incidencia_id INTEGER NOT NULL REFERENCES incidencias(id) ON DELETE CASCADE,
        nombre_tecnico TEXT, fecha_asignacion TEXT, fecha_inicio TEXT, hora_inicio TEXT,
        fecha_fin TEXT, hora_fin TEXT, tiempo_desplazamiento TEXT, tiempo_actuacion TEXT,
        num_tecnicos INTEGER DEFAULT 1, descripcion_trabajos TEXT,
        pieza_cambiada INTEGER DEFAULT 0,
        sn_nueva TEXT, pn_nueva TEXT, sn_vieja TEXT, pn_vieja TEXT,
        created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS historial_cambios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        incidencia_id INTEGER NOT NULL REFERENCES incidencias(id) ON DELETE CASCADE,
        usuario TEXT NOT NULL DEFAULT 'Sistema', campo TEXT NOT NULL,
        valor_antes TEXT, valor_despues TEXT,
        fecha TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE, rol TEXT NOT NULL DEFAULT 'TECNICO',
        password_hash TEXT NOT NULL, activo INTEGER NOT NULL DEFAULT 1,
        ultimo_login TEXT, created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS incidencia_eventos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        incidencia_id INTEGER NOT NULL REFERENCES incidencias(id) ON DELETE CASCADE,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
        usuario_nombre TEXT, tipo_evento TEXT NOT NULL,
        timestamp TEXT DEFAULT (datetime('now','localtime')),
        payload TEXT DEFAULT '{}'
    );
    CREATE INDEX IF NOT EXISTS idx_eventos_incidencia ON incidencia_eventos(incidencia_id);
    """)
    conn.commit()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migración de DB de incidencias")
    parser.add_argument("--origen",  required=True, help="Ruta al incidencias.db original")
    parser.add_argument("--destino", default="./incidencias.db", help="Ruta a la nueva DB")
    args = parser.parse_args()
    migrate(args.origen, args.destino)
