from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import init_db
from app.routers import auth, usuarios, incidencias, dashboard

app = FastAPI(
    title="Gestión de Incidencias — Metro Madrid",
    description="API REST para la gestión de incidencias técnicas con Event Sourcing",
    version="2.0.0",
    redirect_slashes=False,
)

# ─────────────────────────────────────────────
# CORS FIX DEFINITIVO (Vercel + Railway)
# ─────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://app-incidencias-xi.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
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

# ─────────────────────────────────────────────
# STARTUP
# ─────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    init_db()
    _seed_admin()


def _seed_admin():
    """Crea el usuario ADMIN inicial si no existe ningún usuario."""
    from app.db.database import get_connection
    from app.core.security import hash_password

    conn = get_connection()
    count = conn.execute("SELECT COUNT(*) FROM usuarios").fetchone()[0]

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
        print("✅ Usuario admin creado: admin@metro.local / Admin1234!")
        print("⚠️ Cambia la contraseña en el primer login.")

    conn.close()


# ─────────────────────────────────────────────
# HEALTHCHECK
# ─────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "version": "2.0.0"}