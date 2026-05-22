"""
Script de setup inicial multi-proyecto.
Crea el primer proyecto en la BD master y lo asigna al admin.

Uso:
    python setup_proyecto.py

Edita las variables de configuración antes de ejecutar.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

# ── Configuración ─────────────────────────────────────────────────────────────

PROYECTO_ID       = "metro-madrid"
PROYECTO_NOMBRE   = "Metro de Madrid"
PROYECTO_DESC     = "Red de intercomunicación e interfonía. Líneas L1-L12 y ML1."
PROYECTO_INITIALS = "MM"

# En desarrollo usa SQLite local. En producción pon la URL de Turso.
# Ejemplo Turso: "libsql://metro-madrid-cazperr.turso.io"
PROYECTO_DB_URL   = "sqlite:///./metro_madrid.db"
PROYECTO_DB_TOKEN = ""  # Solo necesario para Turso

# Email del admin al que asignar el proyecto
ADMIN_EMAIL = "admin@metro.local"

# ─────────────────────────────────────────────────────────────────────────────

def main():
    from app.db.database import get_master_connection, init_project_db, init_db

    print("🔧 Inicializando BD master...")
    init_db()

    conn = get_master_connection()

    # Buscar admin
    admin = conn.execute(
        "SELECT id, nombre FROM usuarios WHERE email=? AND activo=1",
        (ADMIN_EMAIL,)
    ).fetchone()

    if not admin:
        print(f"❌ No se encontró usuario con email '{ADMIN_EMAIL}'")
        print("   Asegúrate de haber arrancado el backend al menos una vez para crear el admin.")
        conn.close()
        sys.exit(1)

    print(f"✅ Admin encontrado: {admin['nombre']} (id={admin['id']})")

    # Comprobar si el proyecto ya existe
    existe = conn.execute(
        "SELECT id FROM proyectos WHERE id=?", (PROYECTO_ID,)
    ).fetchone()

    if existe:
        print(f"⚠️  El proyecto '{PROYECTO_ID}' ya existe. Saltando creación.")
    else:
        print(f"📦 Creando proyecto '{PROYECTO_ID}'...")
        conn.execute(
            """INSERT INTO proyectos (id, nombre, descripcion, initials, db_url, db_token)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (PROYECTO_ID, PROYECTO_NOMBRE, PROYECTO_DESC,
             PROYECTO_INITIALS, PROYECTO_DB_URL, PROYECTO_DB_TOKEN)
        )
        conn.commit()
        print(f"✅ Proyecto creado.")

        print(f"🗄️  Provisionando BD del proyecto ({PROYECTO_DB_URL})...")
        try:
            init_project_db(PROYECTO_ID)
            print("✅ BD del proyecto inicializada con el schema.")
        except Exception as e:
            print(f"❌ Error provisionando BD: {e}")
            conn.execute("DELETE FROM proyectos WHERE id=?", (PROYECTO_ID,))
            conn.commit()
            conn.close()
            sys.exit(1)

    # Asignar admin al proyecto
    ya_asignado = conn.execute(
        "SELECT 1 FROM usuario_proyecto WHERE usuario_id=? AND proyecto_id=?",
        (admin["id"], PROYECTO_ID)
    ).fetchone()

    if ya_asignado:
        print(f"⚠️  Admin ya estaba asignado al proyecto.")
    else:
        conn.execute(
            "INSERT INTO usuario_proyecto (usuario_id, proyecto_id, rol) VALUES (?,?,?)",
            (admin["id"], PROYECTO_ID, "ADMIN")
        )
        conn.commit()
        print(f"✅ Admin asignado al proyecto como ADMIN.")

    conn.close()

    print("")
    print("🎉 Setup completado.")
    print(f"   Proyecto ID : {PROYECTO_ID}")
    print(f"   BD          : {PROYECTO_DB_URL}")
    print(f"   Admin       : {ADMIN_EMAIL}")
    print("")
    print("   Próximos pasos:")
    print("   1. Arranca el backend: uvicorn app.main:app --reload")
    print("   2. Haz login y selecciona el proyecto en el selector")
    print("   3. Para añadir más proyectos usa POST /api/proyectos (desde admin)")

if __name__ == "__main__":
    main()
