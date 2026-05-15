# Frontend PWA — Incidencias Metro Madrid
> React + Vite · PWA instalable · Diseño industrial para móvil

## Setup local

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

El proxy de Vite redirige `/api/*` → `http://localhost:8000` automáticamente.

## Build y deploy en Vercel (gratis)

```bash
npm run build   # genera dist/

# En vercel.com → New Project → importa el repo
# Framework: Vite
# Build command: npm run build
# Output dir: dist
# Variable de entorno: VITE_API_URL=https://tu-backend.railway.app
```

## Instalar como app en móvil

1. Abre la URL en Chrome (Android) o Safari (iOS)
2. Android: menú → "Añadir a pantalla de inicio"
3. iOS: botón compartir → "Añadir a pantalla de inicio"
4. Se instala como app nativa sin pasar por ninguna tienda

## Páginas

| Ruta | Página |
|------|--------|
| `/` | Lista de incidencias con filtros y búsqueda |
| `/incidencia/:id` | Detalle + botones Asignar / Iniciar / Solucionar + Timeline eventos |
| `/nueva` | Formulario nueva incidencia |
| `/dashboard` | KPIs, gráficas por estado/línea, top equipos |
| `/usuarios` | CRUD usuarios (solo ADMIN) |
| `/perfil` | Info usuario, cambio contraseña, cerrar sesión |

## Flujo de trabajo en el móvil

```
Lista → toca incidencia → [Asignarme]
                       → estado: ASIGNADA, evento guardado con hora

                       → [Iniciar trabajo]
                       → estado: EN CURSO, evento guardado con hora

                       → [Solucionar]
                       → modal: desplazamiento + descripción + piezas
                       → estado: SOLUCIONADA, parte de trabajo creado automáticamente
                       → duración calculada: hora_fin - hora_inicio (desde eventos)
```
