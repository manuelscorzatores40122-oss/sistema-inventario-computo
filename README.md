# Sistema de inventario — I.E. Manuel Scorza

Aplicación de recursos educativos con Next.js 14, React 18, TypeScript, Bootstrap y PostgreSQL/Neon.

## Módulos

- **Docente:** resumen personal, catálogo y solicitudes de equipos, seguimiento de respuestas y préstamos, almanaque mensual de sala, reservas por hora y perfil.
- **Administración:** inventario patrimonial e importación Excel, cuentas de docentes, aprobación de solicitudes, entregas y devoluciones, horario semanal e historial.
- **Notificaciones:** centro de avisos con acciones directas, filtros y lecturas persistentes por usuario. Las altas públicas requieren aprobación administrativa.

## Requisitos y arquitectura

- Node.js compatible con Next.js 14 (mínimo 18.17) y npm.
- PostgreSQL accesible desde el servidor de la aplicación; el proyecto utiliza Neon mediante el controlador `pg`, sin ORM.
- Next.js App Router, React 18 y TypeScript con modo estricto.
- Bootstrap 5, iconos de `react-icons/fi` y estilos compartidos en `app/globals.css`.
- Autenticación propia mediante JWT y bcrypt; el flujo de sesión no utiliza NextAuth.

Las páginas de administración y del profesor comparten componentes, pero las rutas y API comprueban sus permisos por separado.

## Desarrollo

1. Instalar dependencias con `npm ci`.
2. Copiar `.env.example` a `.env.local` y configurar `DATABASE_URL` y `JWT_SECRET`.
3. Configurar las tres variables `CLOUDINARY_*` para subir imágenes. Las credenciales se mantienen fuera de Git.
4. Para una base nueva, ejecutar `db/schema.sql` con un cliente PostgreSQL. Las bases existentes deben aplicar únicamente las migraciones pendientes correspondientes a su historial.
5. Ejecutar `npm run dev` y abrir http://localhost:3011.

La migración `db/migrations/2026-10-16_centro-notificaciones.sql` crea la persistencia de avisos leídos; es aditiva e idempotente.

## Variables de entorno

Usar `.env.example` como plantilla y mantener los valores reales en `.env.local` o en la configuración del proveedor de alojamiento.

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Conexión PostgreSQL utilizada por `app/lib/db.ts`. |
| `JWT_SECRET` | Firma y verificación de la sesión. |
| `CLOUDINARY_CLOUD_NAME` | Cuenta de Cloudinary que almacena las fotos del inventario. |
| `CLOUDINARY_API_KEY` | Identificador de la API de Cloudinary. |
| `CLOUDINARY_API_SECRET` | Secreto del servidor para subir y eliminar fotos. |
| `WHATSAPP_*` | Configuración del webhook y sus integraciones; consultar `.env.example` para los nombres disponibles. |

La conexión usa `DATABASE_URL`, no `POSTGRES_URL`. Las claves de Cloudinary son variables del servidor y no deben llevar el prefijo `NEXT_PUBLIC_`. La base de datos y la sesión son necesarias para operar; las tres variables de Cloudinary son necesarias cuando se adjuntan fotos.

## Verificación

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

Las pruebas por defecto usan dependencias simuladas y no escriben en la base de datos. Los archivos antiguos `tests/test_import_*.cjs` utilizan PostgreSQL y deben revisarse antes de ejecutarlos; no forman parte de `npm test`.

Con Playwright y un navegador instalado:

```sh
npm run test:teacher-ui
npm run test:admin-ui
```

Variables opcionales para esas pruebas:

- `PLAYWRIGHT_MODULE`: ruta al paquete Playwright si no está instalado en el proyecto.
- `TEST_BROWSER_CHANNEL`: por ejemplo `msedge` o `chrome`.
- `TEST_BASE_URL`: por defecto `http://localhost:3011`.
- `TEST_SCREENSHOTS`: carpeta para las capturas; por defecto `test-results`.

La prueba docente simula todas las API. La prueba administrativa hace lecturas reales y bloquea cualquier escritura del navegador.

## Sesión y datos

La sesión usa una cookie HttpOnly y JWT firmado. Los endpoints verifican usuario activo y rol; las consultas del profesor se restringen al propietario autenticado. Entregas, devoluciones y decisiones de solicitudes usan transacciones.

El inventario y las disponibilidades que muestra la aplicación corresponden a datos reales: administración debe verificar estado físico, situación administrativa y stock antes de habilitar un recurso para préstamo.
