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

## Reservas de la sala de cómputo

Desde `/profesor/horario`, el docente puede consultar quién ocupa la sala y solicitar un turno. En celular, al pulsar un día se abre una ventana con las reservas de esa fecha y la opción de solicitar la sala.

El formulario móvil incluye:

- Fecha de uso.
- Campos **Desde** y **Hasta** con un reloj compacto, hora de 1 a 12, minutos exactos y selección de a. m. o p. m.
- Grado de 1.º a 5.º y sección A o B.
- Mensaje con la actividad prevista.

Al editar una hora, **Usar hora** aplica el valor y **Cancelar** descarta la edición. La solicitud solo se puede enviar cuando la edición de la hora está cerrada y los datos son válidos.

Los límites de las reservas usan la hora de Lima: el inicio debe ser futuro y el fin posterior al inicio. El sistema comprueba cruces con turnos existentes; la aprobación administrativa confirma la reserva. Las cancelaciones de reservas propias futuras avisan a administración, y las cancelaciones administrativas avisan al docente.

## Solicitudes de equipos

1. Abrir **Solicitar artículo** en el panel docente.
2. Seleccionar un equipo del catálogo; el formulario de solicitud aparece después de esa selección.
3. Indicar la cantidad, el grado (1.º–5.º), la sección (A/B) y la actividad o motivo.
4. Enviar la solicitud y revisar su estado en **Mis solicitudes**.

La administración revisa los pedidos en `/admin/solicitudes`. Las pestañas **Sala de cómputo** y **Equipos** separan ambos tipos de solicitud y sus contadores; la vista docente también mantiene esta separación.

El servidor valida la disponibilidad al solicitar y al aprobar. Las operaciones de stock y movimientos se realizan en transacciones para evitar que una aprobación repetida descuente existencias dos veces. Las entregas y devoluciones se gestionan desde **Préstamos y devoluciones**.

## Registro y revisión de cuentas docentes

El registro público crea una solicitud pendiente y mantiene la cuenta sin acceso hasta que administración la apruebe. La revisión está en **Profesores y cuentas → Solicitudes de cuenta** (`/admin/profesores/cuentas`), junto al acceso al directorio docente.

Cada solicitud ofrece **Ver detalles**, tanto en pendientes como en cuentas revisadas. La ficha muestra:

- Nombre y apellido.
- DNI o usuario.
- Área o curso.
- Teléfono y correo personal, cuando se proporcionaron.
- Fecha de solicitud y estado de la revisión.

Desde la ficha se puede pasar a aprobar o rechazar una cuenta pendiente. La decisión requiere confirmación; aprobar habilita el acceso con la contraseña que eligió el docente durante el registro. Rechazar conserva la revisión y mantiene la cuenta sin acceso.

La recuperación de contraseña actual remite a administración. Conocer el DNI de otra persona no constituye un mecanismo de recuperación automática.

## Notificaciones y seguimiento

El centro de notificaciones permite consultar avisos y abrir sus acciones relacionadas. Las lecturas se guardan por usuario mediante `/api/notificaciones/lecturas`; la migración `2026-10-16_centro-notificaciones.sql` incorpora su persistencia.

En la vista docente, los avisos se consultan periódicamente mientras la página está visible: aproximadamente cada segundo si hay solicitudes pendientes y cada tres segundos en el resto de casos. El resumen general tiene su propio refresco. Estos intervalos describen consultas del navegador, no una conexión permanente con el servidor.

En celular, las aprobaciones se presentan en una ventana destacada. Los avisos pendientes se mantienen en cola para no perder varias respuestas recibidas juntas.

Los avisos internos usan la tabla histórica `notificaciones_whatsapp`. La existencia de una fila en esa tabla no demuestra por sí sola que un mensaje externo de WhatsApp se haya entregado.

## Fotos del inventario y despliegue en Vercel

Las fotos se suben desde el servidor a Cloudinary. Se aceptan archivos JPG, PNG y WEBP; el navegador valida archivos de hasta 20 MB y reduce la imagen a un máximo de 1000 píxeles en su lado mayor. La imagen procesada enviada a la API debe respetar el límite de 2 MB del contenido codificado.

Para habilitar las fotos en producción:

1. Abrir el proyecto en Vercel y entrar en **Environment Variables**.
2. Añadir `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET` como secretos del entorno **Production**.
3. Confirmar que `DATABASE_URL` y `JWT_SECRET` también existen en ese entorno.
4. Guardar las variables y ejecutar **Redeploy** sobre la versión de producción que se desea publicar.
5. Completar la verificación de identidad si Vercel la solicita y esperar a que el despliegue esté en **Ready**.
6. Abrir el sistema publicado, seleccionar una foto desde Inventario y guardar el artículo.

Las variables de `.env.local` no se copian automáticamente a Vercel. Para utilizar fotos en despliegues de vista previa, configurar también las variables en **Preview**.

Si aparece **«La carga de fotos no está configurada en este servidor»**, comprobar las tres variables en el entorno del despliegue y volver a desplegar. Si las variables ya existen y aparece un error al subir, revisar su validez y los registros del servidor. Las rutas de creación y edición conservan el error de carga para evitar guardar silenciosamente un artículo sin la foto elegida.

## Referencias para mantenimiento

| Ubicación | Responsabilidad |
|---|---|
| [`app/components/CrudViews.tsx`](app/components/CrudViews.tsx) | Inventario, solicitudes, préstamos y vistas administrativas compartidas. |
| [`app/components/teacher/`](app/components/teacher/) | Espacio docente, solicitudes y componentes del calendario móvil. |
| [`app/components/admin/AccountRequestsInbox.tsx`](app/components/admin/AccountRequestsInbox.tsx) | Bandeja y detalles de solicitudes de cuenta. |
| [`app/lib/db.ts`](app/lib/db.ts) | Conexión y consultas PostgreSQL. |
| [`app/lib/cloudinary.ts`](app/lib/cloudinary.ts) | Configuración del almacenamiento de fotos. |
| [`app/api/`](app/api/) | Validaciones y operaciones del servidor. |
| [`middleware.ts`](middleware.ts) | Protección inicial de rutas y API. |
| [`db/migrations/`](db/migrations/) | Cambios incrementales del esquema. |

### Diagnóstico rápido

| Síntoma | Comprobación inicial |
|---|---|
| No se puede conectar a la base | Revisar `DATABASE_URL`, conectividad y registros del servidor. |
| El despliegue informa configuración incompleta | Configurar `DATABASE_URL` y `JWT_SECRET` en el entorno correcto y volver a desplegar. |
| Un docente registrado no puede entrar | Revisar si su solicitud de cuenta sigue pendiente o fue rechazada. |
| La reserva indica que la hora ya pasó | Revisar fecha, a. m./p. m. y la hora actual de Lima. |
| La reserva indica que el turno está ocupado | Consultar las reservas del día y elegir un intervalo sin cruces. |
| Una foto no puede subirse | Revisar formato, tamaño y configuración de Cloudinary en el servidor utilizado. |

Los cambios de documentación pueden revisarse con `git diff --check`. Para cambios funcionales, ejecutar las verificaciones descritas a continuación y elegir las pruebas de integración según el módulo afectado.

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
