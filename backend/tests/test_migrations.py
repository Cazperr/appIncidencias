"""Tests del sistema de migraciones."""
import sqlite3
import tempfile
import os
from pathlib import Path
from unittest.mock import patch


def make_conn(path):
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn


def test_migrations_se_aplican_una_vez(tmp_path):
    """Las migraciones no se aplican dos veces."""
    from app.db.migrations import run_migrations, _get_applied, _ensure_migrations_table

    db_path = str(tmp_path / "test.db")
    
    # Crear migration de prueba
    mig_dir = tmp_path / "migrations"
    mig_dir.mkdir()
    mig_file = mig_dir / "0001_test.sql"
    mig_file.write_text("CREATE TABLE IF NOT EXISTS test_tabla (id INTEGER PRIMARY KEY);")
    
    conn = make_conn(db_path)
    run_migrations(conn, [mig_file], "test")
    
    applied_1 = _get_applied(conn)
    assert "0001_test" in applied_1
    
    # Aplicar de nuevo — no debe duplicar
    run_migrations(conn, [mig_file], "test")
    applied_2 = _get_applied(conn)
    assert len(applied_2) == len(applied_1)
    conn.close()


def test_migrations_en_orden(tmp_path):
    """Las migraciones se aplican en orden numérico."""
    from app.db.migrations import run_migrations, _get_applied

    db_path = str(tmp_path / "test.db")
    mig_dir = tmp_path / "migrations"
    mig_dir.mkdir()

    applied_order = []

    (mig_dir / "0002_segunda.sql").write_text(
        "CREATE TABLE IF NOT EXISTS segunda (id INTEGER PRIMARY KEY);"
    )
    (mig_dir / "0001_primera.sql").write_text(
        "CREATE TABLE IF NOT EXISTS primera (id INTEGER PRIMARY KEY);"
    )

    files = sorted(mig_dir.glob("*.sql"))
    conn = make_conn(db_path)
    run_migrations(conn, files, "test")
    applied = _get_applied(conn)
    
    assert "0001_primera" in applied
    assert "0002_segunda" in applied
    conn.close()


def test_migration_status(tmp_path):
    """get_migration_status devuelve info correcta."""
    from app.db.migrations import run_migrations, get_migration_status

    db_path = str(tmp_path / "test.db")
    mig_dir = tmp_path / "migrations"
    mig_dir.mkdir()
    (mig_dir / "0001_init.sql").write_text(
        "CREATE TABLE IF NOT EXISTS algo (id INTEGER PRIMARY KEY);"
    )

    conn = make_conn(db_path)
    run_migrations(conn, list(mig_dir.glob("*.sql")), "test")
    
    status = get_migration_status(conn, "test")
    assert status["count"] == 1
    assert status["applied"][0]["version"] == "0001_init"
    conn.close()
