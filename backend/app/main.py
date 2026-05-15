from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.core.config import get_settings
from app.db.database import init_db
from app.routers import auth, usuarios, incidencias, dashboard

settings = get_settings()

app = FastAPI(
    title="Gestión de Incidencias — Metro Madrid",
    description="API REST para la gestión de incidencias técnicas con Event Sourcing",
    version="2.0.0",
)

# ── Forzar HTTPS en Railway (evita 307 http redirect) ────────────────────────
@app.middleware("http")
async def force_https(request: Request, call_next):
    if request.headers.get("x-forwarded-proto") == "http":
        url = str(request.url).replace("http://", "https://", 1)
        return RedirectResponse(url=url, status_code=301)
    return await call_next(request)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(usuarios.router)
app.include_router(incidencias.router)
app.include_router(dashboard.router)

# ── Startup ───────────────────────────────────────────────────────────────────
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
            "INSERT INTO usuarios (nombre, email, rol, password_hash) VALUES (?,?,?,?)",
            ("Administrador", "admin@metro.local", "ADMIN", hash_password("Admin1234!")),
        )
        conn.commit()
        print("✅ Usuario admin creado: admin@metro.local / Admin1234!")
        print("   ⚠️  Cambia la contraseña en el primer login.")
    conn.close()


@app.get("/health")
async def health():
    return {"status": "ok", "version": "2.0.0"}