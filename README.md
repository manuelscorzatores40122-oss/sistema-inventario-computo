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

## Preparación de la base de datos

1. Crear una base PostgreSQL y establecer su conexión en `DATABASE_URL`.
2. En una instalación nueva, revisar y ejecutar `db/schema.sql`.
3. En una instalación existente, revisar el esquema y aplicar las migraciones que todavía no estén incorporadas. No ejecutar semillas para actualizar una base con información real.
4. Verificar las tablas de usuarios, inventario, solicitudes, disponibilidad, préstamos y notificaciones antes de iniciar los flujos del sistema.

Las migraciones están en `db/migrations/`. Entre ellas se encuentran las de préstamos, ubicación de solicitudes, importaciones, bandeja de cuentas y lecturas de notificaciones. Revisar su contenido e historial antes de aplicarlas.

`db/seed.sql` contiene datos de prueba. Los scripts antiguos `setup-db.js`, `fix-db.js` y `fix-login-dni.js` modifican datos y deben revisarse antes de usarlos. El esquema incluye usuarios de ejemplo con contraseñas que requieren tratamiento previo antes de habilitar cuentas reales.

## Comandos de ejecución

| Comando | Resultado |
|---|---|
| `npm ci` | Instala las dependencias según el archivo de bloqueo. |
| `npm run dev` | Inicia desarrollo en el puerto 3011. |
| `npm run typecheck` | Comprueba los tipos sin generar archivos. |
| `npm run lint` | Ejecuta el análisis estático de Next.js. |
| `npm test` | Ejecuta la batería de pruebas unitarias configurada. |
| `npm run build` | Genera la compilación de producción. |
| `npm start` | Sirve la compilación de producción existente. |

El desarrollo guarda sus archivos generados en `.next-dev/`; la compilación de producción utiliza `.next/`. Esto permite compilar sin sobrescribir los archivos que usa el servidor de desarrollo.

El puerto 3011 está fijado en el comando de desarrollo. Para servir la compilación local en ese mismo puerto se puede ejecutar `npm start -- -p 3011`.

## Navegación por rol

| Función | Administración | Profesor |
|---|---|---|
| Resumen | `/admin/dashboard` | `/profesor/dashboard` |
| Inventario y catálogo | `/admin/inventario` | `/profesor/solicitar-articulo` |
| Solicitudes de sala y equipos | `/admin/solicitudes` | `/profesor/solicitudes` |
| Calendario de sala | `/admin/horario` | `/profesor/horario` |
| Directorio docente | `/admin/profesores` | — |
| Solicitudes de cuenta | `/admin/profesores/cuentas` | — |
| Entregas y devoluciones | `/admin/prestamos` | Seguimiento desde el panel docente |
| Historial | `/admin/historial` | — |
| Perfil | `/admin/perfil` | `/profesor/perfil` |

El ingreso se realiza en `/auth/login`. Las rutas de cada rol están protegidas por `middleware.ts`; los endpoints vuelven a comprobar la sesión y los permisos.

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
