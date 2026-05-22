from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Routers
from app.routers import (
    auth,
    usuarios,
    incidencias,
    dashboard,
    pdf_parser,
    proyectos,
)

# DB (solo import, NO ejecutar en startup)
from app.db.database import init_db


app = FastAPI(
    title="Gestión de Incidencias — Metro Madrid",
    description="API REST para la gestión de incidencias con Event Sourcing",
    version="2.0.0",
    redirect_slashes=False,
)

# ─────────────────────────────────────────────
# CORS (Vercel + localhost + previews)
# ─────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://app-incidencias.vercel.app",
    ],
    allow_origin_regex=r"https://app-incidencias.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# ROUTERS
# ─────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(usuarios.router)
app.include_router(incidencias.router)
app.include_router(dashboard.router)
app.include_router(pdf_parser.router)
app.include_router(proyectos.router)


# ─────────────────────────────────────────────
# STARTUP (SIN DB → NO BLOQUEANTE)
# ─────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    print("🚀 API started successfully (no DB blocking)")
    # init_db eliminado del startup


# ─────────────────────────────────────────────
# SEED ADMIN (MANUAL / SAFE)
# ─────────────────────────────────────────────
def seed_admin_if_needed():
    from app.db.database import get_connection
    from app.core.security import hash_password

    try:
        conn = get_connection()

        count = conn.execute(
            "SELECT COUNT(*) FROM usuarios"
        ).fetchone()[0]

        if count == 0:
            conn.execute(
                """
                INSERT INTO usuarios (nombre, email, rol, password_hash)
                VALUES (?,?,?,?)
                """,
                (
                    "Administrador",
                    "admin@metro.local",
                    "ADMIN",
                    hash_password("Admin1234!"),
                ),
            )
            conn.commit()
            print("✅ Admin creado")

        conn.close()

    except Exception as e:
        print("⚠️ Seed skipped (DB error):", e)


# ─────────────────────────────────────────────
# HEALTHCHECK
# ─────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "version": "2.0.0"}