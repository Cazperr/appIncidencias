# migrar_admin.py
import sqlite3
import os

print("🔧 Migrando base de datos para soportar múltiples proyectos...")

# Conectar a tu base de datos (incidencias.db)
conn = sqlite3.connect("incidencias.db")
cursor = conn.cursor()

# 1. Añadir columna db_url a proyectos (si no existe)
try:
    cursor.execute("ALTER TABLE proyectos ADD COLUMN db_url TEXT")
    print("✅ Añadida columna db_url")
except:
    print("⚠️ db_url ya existe")

# 2. Añadir columna db_token a proyectos
try:
    cursor.execute("ALTER TABLE proyectos ADD COLUMN db_token TEXT")
    print("✅ Añadida columna db_token")
except:
    print("⚠️ db_token ya existe")

# 3. Añadir columna activo a proyectos
try:
    cursor.execute("ALTER TABLE proyectos ADD COLUMN activo INTEGER DEFAULT 1")
    print("✅ Añadida columna activo")
except:
    print("⚠️ activo ya existe")

# 4. Crear tabla proyecto_usuarios
cursor.execute("""
    CREATE TABLE IF NOT EXISTS proyecto_usuarios (
        proyecto_id TEXT,
        usuario_id INTEGER,
        rol TEXT DEFAULT 'TECNICO',
        asignado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (proyecto_id, usuario_id)
    )
""")
print("✅ Tabla proyecto_usuarios creada")

# 5. Añadir columna rol a usuarios
try:
    cursor.execute("ALTER TABLE usuarios ADD COLUMN rol TEXT DEFAULT 'VIEWER'")
    print("✅ Añadida columna rol a usuarios")
except:
    print("⚠️ rol ya existe en usuarios")

# 6. Añadir columna activo a usuarios
try:
    cursor.execute("ALTER TABLE usuarios ADD COLUMN activo INTEGER DEFAULT 1")
    print("✅ Añadida columna activo a usuarios")
except:
    print("⚠️ activo ya existe en usuarios")

conn.commit()
conn.close()

print("\n🎉 Migración completada!")