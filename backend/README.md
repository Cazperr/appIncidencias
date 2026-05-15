# Backend — Gestión Incidencias Metro Madrid
> FastAPI + SQLite/Turso · Auth JWT con sesión persistente · Event Sourcing

## Estructura

```
backend/
├── app/
│   ├── main.py                  # Entry point FastAPI
│   ├── core/
│   │   ├── config.py            # Variables de entorno
│   │   └── security.py          # JWT, hashing, dependencias auth
│   ├── db/
│   │   ├── database.py          # Conexión SQLite/Turso + schema
│   │   └── eventos.py           # Event Sourcing service
│   ├── models/
│   │   └── schemas.py           # Pydantic schemas
│   └── routers/
│       ├── auth.py              # /api/auth/*
│       ├── usuarios.py          # /api/usuarios/*
│       ├── incidencias.py       # /api/incidencias/*
│       └── dashboard.py         # /api/dashboard/*
├── migrate_db.py                # Script migración DB existente
├── requirements.txt
├── railway.toml                 # Deploy Railway
├── Procfile                     # Deploy Render
└── .env.example                 # Variables de entorno (copiar a .env)
```

## Setup local

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configurar entorno
cp .env.example .env
# Editar .env si es necesario (en local funciona sin tocar nada)

# Migrar datos existentes (opcional)
python migrate_db.py --origen /ruta/incidencias.db --destino ./incidencias.db

# Arrancar
uvicorn app.main:app --reload
```

Abre http://localhost:8000/docs para ver todos los endpoints (Swagger UI automático).

**Usuario inicial creado automáticamente:**
- Email: `admin@metro.local`
- Password: `Admin1234!`
- ⚠️ Cámbiala en el primer login desde /api/usuarios/{id}

## Endpoints principales

| Método | Ruta | Descripción | Rol |
|--------|------|-------------|-----|
| POST | /api/auth/login | Login → access + refresh token | todos |
| POST | /api/auth/refresh | Renovar access token | todos |
| POST | /api/auth/logout | Cerrar sesión | todos |
| GET  | /api/auth/me | Info del usuario logueado | todos |
| GET  | /api/usuarios | Listar usuarios | ADMIN |
| POST | /api/usuarios | Crear usuario | ADMIN |
| GET  | /api/incidencias | Listar con filtros | TECNICO+ |
| POST | /api/incidencias | Crear incidencia | TECNICO+ |
| PUT  | /api/incidencias/{id} | Editar incidencia | TECNICO+ |
| POST | /api/incidencias/{id}/asignar | Asignarse la incidencia (genera evento ASIGNADA) | TECNICO+ |
| POST | /api/incidencias/{id}/iniciar | Iniciar trabajo (genera evento INICIO_TRABAJO) | TECNICO+ |
| POST | /api/incidencias/{id}/solucionar | Cerrar con formulario completo | TECNICO+ |
| GET  | /api/incidencias/{id}/eventos | Timeline de eventos de la incidencia | TECNICO+ |
| GET  | /api/dashboard/stats | Estadísticas generales | TECNICO+ |

## Deploy en Railway (gratuito)

1. Sube el código a GitHub
2. Entra en [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Añade las variables de entorno del `.env.example`
4. Railway detecta `railway.toml` automáticamente y despliega

## Deploy en Render (alternativa gratuita)

1. [render.com](https://render.com) → New Web Service → conecta GitHub
2. Build command: `pip install -r requirements.txt`
3. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

## Base de datos en producción: Turso

```bash
# Instalar CLI de Turso
curl -sSfL https://get.tur.so/install.sh | bash

# Crear base de datos
turso db create incidencias-metro

# Obtener URL y token
turso db show incidencias-metro
turso db tokens create incidencias-metro

# Añadir en Railway/Render como variables de entorno:
# DATABASE_URL=libsql://incidencias-metro-xxx.turso.io
# TURSO_AUTH_TOKEN=eyJhbG...
```

## Flujo de sesión (sin re-login molesto)

```
Login → access_token (8h) + refresh_token cookie httpOnly (30d)
         │
         ├── Cada petición usa el access_token en header Authorization: Bearer xxx
         │
         └── Cuando el access_token expira:
             Frontend llama a POST /api/auth/refresh automáticamente
             → nuevo access_token sin que el usuario note nada
             → si el refresh también expiró (30d sin usar) → re-login obligatorio
```

## Event Sourcing — flujo completo

```
Técnico abre incidencia
  → POST /api/incidencias/{id}/asignar
  → estado: ASIGNADA | evento: ASIGNADA @ 08:32

Técnico pulsa "Iniciar trabajo"
  → POST /api/incidencias/{id}/iniciar
  → estado: EN CURSO | evento: INICIO_TRABAJO @ 09:15

Técnico pulsa "Solucionar"
  → POST /api/incidencias/{id}/solucionar (con formulario)
  → estado: SOLUCIONADA | evento: SOLUCIONADA @ 11:40
  → escalado creado automáticamente con tiempos calculados
  → duración trabajo: 11:40 - 09:15 = 145 min (automático)
```
