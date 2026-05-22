from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import init_db


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
        "http://localhost:5173",
        "https://app-incidencias-git-feature-proyectos-92d583-cazperrs-projects.vercel.app",
        "https://app-incidencias.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# ROUTERS
# ─────────────────────────────────────────────
from app.routers import auth, usuarios, incidencias, dashboard, pdf_parser, proyectos

app.include_router(auth.router)
app.include_router(usuarios.router)
app.include_router(incidencias.router)
app.include_router(dashboard.router)
app.include_router(pdf_parser.router)
app.include_router(proyectos.router)
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