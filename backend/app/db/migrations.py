"""
Sistema de migraciones estructuradas.
Cada BD (master y proyectos) tiene una tabla schema_migrations
que registra qué migraciones se han aplicado.

Uso:
    from app.db.migrations import run_migrations_master, run_migrations_project
"""
import os
import sqlite3
from pathlib import Path

MIGRATIONS_DIR = Path(__file__).parent.parent.parent / "migrations"


def _get_applied(conn) -> set:
    """Obtiene las migraciones ya aplicadas en esta BD."""
    try:
        rows = conn.execute("SELECT version FROM schema_migrations ORDER BY version").fetchall()
        return {r[0] for r in rows}
    except Exception:
        return set()


def _ensure_migrations_table(conn):
    """Crea la tabla de control de migraciones si no existe."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version    TEXT PRIMARY KEY,
            applied_at TEXT DEFAULT (datetime('now','localtime'))
        )
    """)


def _get_migration_files(prefix: str) -> list[Path]:
    """Obtiene los archivos SQL de migraciones para un tipo de BD."""
    if not MIGRATIONS_DIR.exists():
        return []
    files = sorted(MIGRATIONS_DIR.glob(f"{prefix}_*.sql"))
    # También coger migraciones compartidas (sin prefijo específico)
    return files


def _run_sql_file(conn, path: Path):
    """Ejecuta un archivo SQL completo."""
    sql = path.read_text(encoding='utf-8')
    statements = [s.strip() for s in sql.split(';') if s.strip() and not s.strip().startswith('--')]
    for stmt in statements:
        try:
            conn.execute(stmt)
        except Exception as e:
            # Ignorar errores de "already exists" en CREATE IF NOT EXISTS
            if "already exists" not in str(e).lower():
                raise


def run_migrations(conn, migration_files: list[Path], label: str = "BD"):
    """
    Aplica las migraciones pendientes a una conexión de BD.
    
    Args:
        conn: Conexión a la BD (SQLite o Turso wrapper)
        migration_files: Lista de archivos SQL a aplicar en orden
        label: Nombre descriptivo para los logs
    """
    _ensure_migrations_table(conn)
    applied = _get_applied(conn)
    
    pending = [f for f in migration_files if f.stem not in applied]
    
    if not pending:
        print(f"✅ {label}: sin migraciones pendientes")
        return
    
    for migration_file in pending:
        version = migration_file.stem
        try:
            print(f"🔄 {label}: aplicando {version}...")
            _run_sql_file(conn, migration_file)
            conn.execute(
                "INSERT INTO schema_migrations (version) VALUES (?)",
                (version,)
            )
            conn.commit()
            print(f"✅ {label}: {version} aplicada")
        except Exception as e:
            print(f"❌ {label}: error en {version}: {e}")
            raise


def run_migrations_master(conn):
    """Aplica migraciones a la BD master."""
    files = sorted(MIGRATIONS_DIR.glob("*.sql")) if MIGRATIONS_DIR.exists() else []
    master_files = [f for f in files if not f.stem.startswith("0002")]
    run_migrations(conn, master_files, label="master")


def run_migrations_project(conn, proyecto_id: str):
    """Aplica migraciones a la BD de un proyecto."""
    files = sorted(MIGRATIONS_DIR.glob("*.sql")) if MIGRATIONS_DIR.exists() else []
    project_files = [f for f in files if f.stem.startswith("0002") or f.stem.startswith("0003")]
    run_migrations(conn, project_files, label=f"proyecto:{proyecto_id}")


def get_migration_status(conn, label: str = "BD") -> dict:
    """Devuelve el estado de migraciones de una BD."""
    try:
        rows = conn.execute(
            "SELECT version, applied_at FROM schema_migrations ORDER BY version"
        ).fetchall()
        return {
            "label": label,
            "applied": [{"version": r[0], "applied_at": r[1]} for r in rows],
            "count": len(rows)
        }
    except Exception:
        return {"label": label, "applied": [], "count": 0}
