# AGENTS.md — Mapa del Sistema de Inventario del Colegio

Guía de referencia interna para trabajar en este repositorio. Describe la arquitectura, dónde vive cada componente y los comandos útiles.

## Stack

- **Next.js 14** (App Router) + **TypeScript** (`strict`), puerto desarrollo `3011`
- **React 18** + **Bootstrap 5** (dependencia npm) + **react-icons (Fi*)**
- **Base de datos**: PostgreSQL vía Neon, controlador `pg` (`Pool`). Sin ORM.
- **Auth**: JWT manual con `jsonwebtoken` + `bcryptjs`. ^**NO usa next-auth en la práctica** (peso muerto en package.json).
- **Estilos globals**: `app/globals.css` tiene clases custom (`inventory-panel`, `inventory-form-input`, `btn-primary-custom`, `mobile-bottom-nav`, `status-badge`, etc.). Login tiene CSS propio en `app/components/Login.css`.

## Comandos

| Comando | Uso |
|---|---|
| `npm run dev` | Dev server en `http://localhost:3011` |
| `npm run build` | Build de producción |
| `npm start` | Serve build |
| `npm run lint` | Lint (next lint) |
| `node setup-db.js` | Crea schema + usuarios de prueba (usa credenciales hardcodeadas) |
| `node fix-db.js` | Hashea passwords en texto plano y sincroniza `dni` |
| `node fix-login-dni.js` | Igual que fix-db + asegura UNIQUE en dni |

## Variables de entorno (`.env.local`)

- `DATABASE_URL` — **LA VARIABLE REAL USADA** por `app/lib/db.ts` (no `POSTGRES_URL` como dice el README)
- `JWT_SECRET` — firma de tokens (usa fallback hardcodeado)
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `TWILIO_*` — declaradas pero NO se usan en el código actual

> ⚠️ `setup-db.js` y `fix-db.js` contienen la connection string de Neon **hardcodeada**. No hacer commit de nuevas credenciales.

## Estructura de directorios

```
sistema-inventario-computo/
├── app/
│   ├── layout.tsx          # Root layout (carga bootstrap + globals.css)
│   ├── page.tsx            # Redirige a /auth/login
│   ├── globals.css         # Clases CSS custom de todo el sistema
│   ├── auth/login/page.tsx # Página login → <Login/>
│   ├── admin/              # Panel admin (rutas protegidas por middleware)
│   ├── profesor/           # Panel profesor (rutas protegidas)
│   ├── components/         # Componentes React (client components)
│   ├── lib/                # auth.ts (helpers JWT/bcrypt) y db.ts (pool pg)
│   └── api/                # Rutas API (route.ts) por módulo
├── db/
│   ├── schema.sql          # Tablas + seed de ~50 profesores (DNI=email=password)
│   ├── seed.sql            # Datos de prueba (admins, inventario, solicitudes)
│   └── migrations/         # 2026-08-29 disponibilidad, 2026-09-18 prestamos
├── middleware.ts           # Valida cookie auth-token (JWT) y roles /admin /profesor
├── public/                 # fondo*.jpg/jpeg, logo.png, manifest.json
├── types/bcryptjs.d.ts     # Shims de tipos
├── setup-db.js / fix-db.js / fix-login-dni.js  # scripts de BD
└── package.json / tsconfig.json / next.config.js
```

## Páginas (rutas) y qué renderizan

| Ruta | Archivo | Componente / función |
|---|---|---|
| `/` | app/page.tsx | redirect → /auth/login |
| `/auth/login` | app/auth/login/page.tsx | `<Login/>` (app/components/Login.tsx) |
| `/admin` | app/admin/page.tsx | redirect → /admin/dashboard |
| `/admin/dashboard` | app/admin/dashboard/page.tsx | `<AdminDashboard/>` |
| `/admin/inventario` | app/admin/inventario/page.tsx | `AdminInventarioView` (CrudViews.tsx) |
| `/admin/solicitudes` | app/admin/solicitudes/page.tsx | `AdminSolicitudesView` (CrudViews.tsx) |
| `/admin/prestamos` | app/admin/prestamos/page.tsx | `AdminPrestamosView` (CrudViews.tsx) |
| `/admin/profesores` | app/admin/profesores/page.tsx | `AdminProfesoresView` (CrudViews.tsx) |
| `/admin/horario` | app/admin/horario/page.tsx | `<AdminHorarioView/>` |
| `/admin/perfil` | app/admin/perfil/page.tsx | `<PerfilView/>` |
| `/profesor` | app/profesor/page.tsx | redirect → /profesor/dashboard |
| `/profesor/dashboard` | app/profesor/dashboard/page.tsx | `<ProfesorDashboard/>` |
| `/profesor/solicitudes` | app/profesor/solicitudes/page.tsx | `ProfesorSolicitudesView` (CrudViews.tsx) |
| `/profesor/perfil` | app/profesor/perfil/page.tsx | `<PerfilView/>` |

**Layouts**: `app/layout.tsx` (raíz). `app/admin/layout.tsx` y `app/profesor/layout.tsx` montan sidebar/header desktop, `MobileTopBar` (<lg) y `MobileBottomNav`.

## Componentes (app/components/)

- `Login.tsx` + `Login.css` — Login con fondos rotativos (`/fondo.jpeg`, `/fondo3.jpeg`, `/fondo4.jpg`, `/fondo2.jpg`). Guarda en localStorage `token` y `user` y cookie `auth-token`.
- `CrudViews.tsx` — **El archivo más grande (1239 líneas)**: contiene `AdminInventarioView`, `AdminProfesoresView`, `AdminSolicitudesView`, `ProfesorSolicitudesView`, `AdminPrestamosView`, helpers (`PageShell`, `Notice`, `StatusBadge`, `StockMeter`, `SolicitudesTable`).
- `AdminDashboard.tsx` — KPIs + aprobar/rechazar solicitudes pendientes.
- `ProfesorDashboard.tsx` — Accesos rápidos + solicitar artículos.
- `AdminHorarioView.tsx` — Grilla semanal (Lun–Sáb), formato de turnos en `localStorage['horarioTemplate']`, asigna profesor/materia vía `/api/disponibilidad`.
- `PerfilView.tsx` — Ver/editar credenciales (email/DNI, correo personal, teléfono, password).
- `AdminSidebar.tsx` — Menú desktop admin.
- `AdminBottomNav.tsx` / `ProfesorBottomNav.tsx` — Items de navegación móvil.
- `MobileBottomNav.tsx` — Barra inferior móvil genérica (recibe `items`).
- `MobileTopBar.tsx` — Header móvil con logout.
- `ProfesorHeader.tsx` — Header desktop profesor.

## API (app/api/)

### /api/auth
- `login/route.ts` — POST: valida email/DNI + password, setea cookie `auth-token` (httpOnly, 24h).
- `register/route.ts` — POST: crea usuario role profesor.
- `forgot-password/route.ts` — POST: devuelve token de reset (sin enviar correo; TODO).

### /api/usuarios
- `route.ts` — GET (filtros: `role`, `activo`, `incluirOcultos`; excluye ocultos), POST (crea, password default = email/DNI).
- `[id]/route.ts` — GET, PUT (COALESCE por campo, valida password≥6), DELETE (soft: `activo=false`, hard con `?hard=true`).

### /api/inventario
- `route.ts` — GET (filtros `categoria`, `estado`), POST (valida cantidades enteras).
- `[id]/route.ts` — GET, PUT (COALESCE, valida `disponible <= total`), DELETE.

### /api/solicitudes
- `route.ts` — GET (filtros `estado`, `profesor_id`, JOIN usuario+inventario), POST (transacción: verifica stock con `FOR UPDATE`, inserta, crea notificaciones_whatsapp a admins).
- `[id]/route.ts` — GET, PUT (solo cambia estado de pendientes; aprobar descuenta stock + registro en `movimientos_inventario`; inserta notificación al profesor), DELETE.

### /api/prestamos
- `route.ts` — GET (filtros `estado`, `profesor_id`), POST (transacción: descuenta `cantidad_disponible`, inserta movimiento 'salida').
- `[id]/route.ts` — PUT (marcar 'devuelto': repone stock + movimiento 'entrada'), DELETE (solo si ya 'devuelto').

### /api/disponibilidad
- `route.ts` — GET (filtros `reservado_por`, `dia_semana`, `estado`, `sala_nombre`; ordena por día/hora), POST (crea, `estado='separado'` si hay `reservado_por`).
- `[id]/route.ts` — GET, PUT (reservar/liberar; al poner 'disponible' limpia reservado_por; abreviado: estado permitido solo 'disponible'|'separado'), DELETE.

### /api/notificaciones/whatsapp
- `route.ts` — POST (registra notificación; integración Twilio es TODO), GET (filtro `usuario_id`).

## Base de datos (db/schema.sql)

Tablas: `usuarios`, `inventario`, `solicitudes`, `disponibilidad`, `movimientos_inventario`, `prestamos`, `notificaciones_whatsapp`.

Campos clave:
- `usuarios`: `email` (es el DNI), `dni` UNIQUE, `area` (curso/cargo del docente), `correo_personal`, `oculto`, `activo`, `role` ('admin'|'profesor').
- `inventario`: `cantidad_total`, `cantidad_disponible`, `estado` ('disponible'|'mantenimiento'|'agotado').
- `solicitudes`: `estado` ('pendiente'|'aprobada'|'rechazada'|'cancelada'), `inventario_id` (nullable), `disponibilidad_id` (nullable, FK opcional).
- `disponibilidad`: se usa como **horario de la sala de cómputo** con `sala_nombre='Horario de Clases'`; `reservado_por` → profesor asignado, `motivo_reserva` → materia.
- `prestamos`: `estado` 'prestado'|'devuelto', `fecha_prestamo`, `fecha_devolucion`.

**Seed**: ~50 profesores reales insertados con `email=dni`, `password=dni` en texto plano (hay que hashear con fix-db.js).

## Autenticación / Middleware

- `middleware.ts` protege `/admin/*` y `/profesor/*`: lee cookie `auth-token`, decodifica JWT, valida `exp` y rol según ruta; redirige a `/auth/login` si falla.
- Login guarda en localStorage `token` + `user` (para UI) y la cookie `auth-token` (para middleware).
- Cerrar sesión = borrar `token` y `user` de localStorage y redirigir a `/auth/login`.

## Patrones importantes al editar

- **Rutas API**: usar `query()` de `app/lib/db` para una consulta y `getClient()` + `BEGIN/COMMIT/ROLLBACK` para transacciones. Respuestas en español.
- **Client components**: casi todas las vistas son 'use client'. Leen el usuario de `localStorage.getItem('user')`.
- **Alias de import**: `@/*` → raíz del proyecto (ver tsconfig).
- **Bootstrap**: clases `d-*`, `col-*`, `btn` están disponibles globalmente; las clases `inventory-*`, `btn-*-custom`, `mobile-*` vienen de `app/globals.css`.
- **Iconos**: `react-icons/fi` (FiInbox, FiPackage, etc.).
- **Nuevos módulos**: agregar tabla en `db/schema.sql`, ruta API en `app/api/`, vista en `app/components/` y página en `app/admin/` o `app/profesor/`.

## Notas / TODOs conocidos

- Twilio WhatsApp sin implementar (solo registra en `notificaciones_whatsapp`).
- `forgot-password` no envía email real.
- El README habla de `POSTGRES_URL` pero el código real usa `DATABASE_URL`.
- `setup-db.js`/`fix-db.js` tienen credenciales de BD hardcodeadas (riesgo de seguridad; considerar mover a variables de entorno).
- Passwords de los profesores del seed están en texto plano hasta correr `fix-db.js` / `fix-login-dni.js`.