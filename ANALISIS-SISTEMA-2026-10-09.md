# Análisis técnico del sistema de inventario

Fecha: 9 de octubre de 2026. Revisión del árbol de trabajo local, incluidos los cambios existentes sin commit.

## Alcance y resultado

Se revisaron la autenticación, middleware, los 16 archivos de rutas API, esquema SQL y migraciones, flujos de las vistas, notificaciones, imágenes, configuración y pruebas. El sistema compila y tiene flujos útiles implementados, pero hay problemas críticos de autorización y errores de integridad que deben resolverse antes de considerarlo listo para producción.

No se ejecutaron operaciones contra la base de datos real, migraciones, envíos de WhatsApp ni cargas de imágenes. No se realizó una prueba visual interactiva ni una auditoría de dependencias/CVE. Los defectos SQL se deducen del código y del esquema versionado: las restricciones efectivas en Neon podrían diferir. No se modificó código de aplicación ni se revirtieron cambios existentes.

## Arquitectura y funcionalidades

- Next.js App Router con React, TypeScript, Bootstrap y CSS propio. La compilación local usa Next.js 14.2.35.
- PostgreSQL mediante pg, consultas parametrizadas y transacciones manuales. DATABASE_URL es la variable utilizada realmente.
- Autenticación propia con bcrypt y JWT; next-auth no participa en el flujo revisado.
- Administración: dashboard, inventario con imágenes Cloudinary, docentes y aprobación de cuentas, solicitudes, préstamos múltiples, devoluciones, horario, historial y perfil.
- Profesor: dashboard, solicitudes de artículos con ubicación, reservas por fecha y horas, horario, consulta de préstamos, cancelación de solicitudes pendientes y perfil.
- Avisos internos persistidos en notificaciones_whatsapp. Un webhook separado puede responder a «hola» usando la API de Meta. Las notificaciones de solicitudes/préstamos no tienen implementado el envío externo de WhatsApp.
- Siete tablas principales. Los préstamos generados al aprobar solicitudes usan estado pendiente; el préstamo directo comienza como prestado.

## Hallazgos prioritarios

### 1. Crítico: API administrativas sin autenticación ni autorización

Referencias: app/api/usuarios/route.ts:46; app/api/usuarios/[id]/route.ts:32; app/api/inventario/route.ts:43; app/api/prestamos/route.ts:62; middleware.ts:48.

El middleware solo cubre /admin y /profesor. La mayoría de los handlers API no verifica ninguna sesión. POST /api/usuarios acepta role=admin y crea la cuenta activa. PUT /api/usuarios/[id] permite cambiar contraseña, rol y estado de cualquier usuario. Inventario, préstamos y disponibilidad también permiten escrituras sin comprobar al actor. Las lecturas de usuarios exponen DNI y datos de contacto.

Corregir con validación central de sesión, cuenta activa, rol y propiedad de cada recurso. Derivar profesor_id del usuario autenticado en operaciones del docente. No basta con proteger páginas o esconder botones.

### 2. Crítico: el middleware acepta JWT con firma inválida

Referencia: middleware.ts:22.

jwtDecode interpreta los datos, pero el middleware no verifica la firma. Una comprobación local en memoria con rol admin y firma inválida devolvió acceso permitido. Esto confirma el fallo sin tocar datos reales. Además, exp ausente no se rechaza explícitamente.

Validar criptográficamente el token, sus campos obligatorios y roles admitidos. Mantener autorización independiente en las API.

### 3. Crítico: secretos incorporados en el repositorio

Referencias: app/lib/cloudinary.ts:7; setup-db.js:5; fix-db.js:4; fix-login-dni.js:4; add-cloudinary-columns.js:2; create-hidden-admin.js:4; app/lib/auth.ts:5.

Cloudinary contiene un secreto literal de respaldo y varios scripts contienen cadenas de conexión PostgreSQL. No se reproducen sus valores en este informe ni se comprobó si siguen vigentes. El JWT también utiliza un secreto predecible cuando falta la variable de entorno.

Retirar los secretos del código, configurar variables obligatorias, rotar las credenciales expuestas y revisar el historial Git. Borrar el valor del último archivo no revoca una credencial.

### 4. Alto: recuperación de contraseña entrega un token aceptado por otros endpoints

Referencias: app/api/auth/forgot-password/route.ts:25; app/api/solicitudes/[id]/cancelar/route.ts:9; app/api/notificaciones/whatsapp/route.ts:72.

Conocer el identificador de una cuenta permite obtener un JWT firmado con su userId y rol reset. Cancelación y lectura de notificaciones aceptan cualquier token verificado que tenga userId, sin exigir rol profesor/admin ni propósito de sesión. Por ello ese token permite cancelar solicitudes pendientes de la víctima y leer sus notificaciones. No implica acceso admin a la API de aprobación, que sí comprueba el rol.

Separar tokens de recuperación y sesión, exigir propósito y rol, no devolver tokens de recuperación al solicitante y completar el flujo de recuperación con entrega verificada y uso único.

### 5. Alto: aprobaciones concurrentes pueden dejar stock negativo

Referencia: app/api/solicitudes/[id]/route.ts:78-131; db/schema.sql:20.

La aprobación bloquea únicamente la solicitud con FOR UPDATE OF s. Dos solicitudes distintas pueden leer el mismo stock, aprobar ambas y restar sin condición. El esquema no contiene un CHECK que impida valores negativos. También se omite volver a comprobar que el artículo siga disponible y fuera de mantenimiento.

Bloquear el inventario antes de verificarlo o descontar mediante UPDATE condicional con RETURNING. Añadir restricciones de stock e integración concurrente con PostgreSQL. Los préstamos directos ya bloquean inventario en orden estable, un patrón útil para unificar.

### 6. Alto: rechazar una reserva de aula puede fallar por clave foránea

Referencias: app/api/solicitudes/[id]/route.ts:151; db/schema.sql:73.

Se intenta borrar disponibilidad cuando solicitudes.disponibilidad_id todavía apunta al registro. La clave foránea versionada no tiene ON DELETE SET NULL ni CASCADE. Con ese esquema, rechazar o cancelar administrativamente una reserva pendiente causa error y rollback. La cancelación del profesor usa otra estrategia: libera el registro sin borrarlo.

Conservar el registro histórico y cambiar su estado de forma consistente, o diseñar explícitamente la desvinculación dentro de la transacción.

### 7. Alto: borrar préstamos pendientes pierde stock reservado

Referencias: app/api/solicitudes/[id]/route.ts:139; app/api/prestamos/[id]/route.ts:124.

Aprobar una solicitud descuenta stock y crea un préstamo pendiente de entrega. DELETE solo impide borrar préstamos prestados; permite borrar pendientes sin reponer unidades. Aunque la interfaz limite botones, la API acepta esa operación.

Permitir borrado exclusivamente de devueltos o implementar una cancelación transaccional que reponga unidades y registre el movimiento. PUT también necesita validar el estado: actualmente cualquier valor distinto de prestado termina tratado como devolución.

### 8. Alto: horarios recurrentes guardados como reservas del día actual

Referencias: app/components/AdminHorarioView.tsx:316; app/api/disponibilidad/route.ts:67; app/api/disponibilidad/[id]/route.ts:59; app/components/AdminHorarioView.tsx:166; app/api/solicitudes/route.ts:117.

La vista envía Horario de Clases como asignación semanal. La API asigna CURRENT_TIMESTAMP a fecha_reserva al asociar un docente. Sin embargo, la vista y la detección de cruces consideran recurrentes solo los registros sin fecha. Esto hace que una clase semanal se interprete como puntual, desaparezca de semanas posteriores o deje de bloquear reservas futuras.

Separar la fecha concreta de reserva de la fecha de creación y del horario recurrente. Las rutas administrativas también deben comprobar superposiciones dentro de la misma estrategia transaccional; actualmente pueden sobreescribir reservas o crear cruces aunque el cliente consulte previamente la disponibilidad.

### 9. Alto: cerrar sesión conserva la cookie de autenticación

Referencias: app/components/MobileTopBar.tsx:7; app/components/ProfesorHeader.tsx:84; app/components/ProfesorPerfilView.tsx:170; app/api/auth/login/route.ts:55.

Los cierres de sesión eliminan localStorage y redirigen. La cookie real es HttpOnly y permanece: tampoco puede eliminarla document.cookie en el perfil nuevo. En un equipo compartido la sesión puede seguir autorizando rutas/API. La desactivación o cambio de rol tampoco se revalida en los endpoints que solo confían en el JWT.

Implementar logout en el servidor que expire la cookie y definir revocación de sesiones. Unificar duración: token de siete días frente a cookie de un día. Configurar Secure según HTTPS del despliegue, no únicamente por VERCEL.

## Otros problemas funcionales y de mantenimiento

- **Perfiles:** PUT actualiza email, pero no dni. Como el login busca ambos campos, cambiar el DNI mostrado no sustituye el identificador anterior. Además, una actualización parcial sin telefono lo pone en NULL; aprobar una cuenta con solo activo puede borrar su teléfono. Referencia: app/api/usuarios/[id]/route.ts:55.
- **Errores expuestos:** la actualización de solicitudes devuelve error.message y stack al cliente. La creación también concatena el error interno. Usar mensajes públicos controlados y detalle solo en logs. Referencia: app/api/solicitudes/[id]/route.ts:215.
- **Instalación incompleta:** schema.sql no crea imagen_url ni imagen_public_id, exigidos por las escrituras de inventario. Existe un script separado con conexión incorporada. La migración de agosto altera disponibilidad.profesor_id, ausente en el esquema actual; no puede aplicarse indiscriminadamente sobre una instalación nueva. Unificar schema y migraciones con historial de ejecución.
- **Configuración local del horario:** horarioTemplate se guarda en localStorage; los cambios de bloques no se comparten automáticamente con otros administradores o docentes.
- **Integridad:** faltan CHECK para estados y cantidades, y una relación estructurada entre solicitud y préstamo; actualmente esa relación se codifica en detalle. Editar cantidad_disponible manualmente mientras hay préstamos puede romper la reconciliación al devolver.
- **Historial:** borrar una solicitud de aula no libera su disponibilidad; borrar la reserva referenciada puede fallar por FK. Definir reglas de conservación y cancelación en lugar de borrados independientes.
- **Escalabilidad:** varios listados devuelven todas las filas y filtran/paginan en cliente. La consulta periódica de avisos puede aumentar carga con el historial. Añadir paginación y filtros en servidor cuando el volumen lo requiera.
- **Mantenimiento:** CrudViews.tsx tiene aproximadamente 2400 líneas y mezcla cinco vistas, formularios y reglas. Hay respaldos de componentes bajo el repositorio, incluidos por los patrones amplios de TypeScript, y un hook useProfesorDashboard sin referencias que aún envía solicitudes sin la ubicación exigida. Evitar reactivarlo sin actualizarlo.
- **Documentación:** README y DEPLOY usan POSTGRES_URL, pero el código requiere DATABASE_URL. README indica puerto 3000 en desarrollo, mientras el script usa 3011. AGENTS.md no refleja Cloudinary, webhook, historial y estado pendiente de préstamos. package.json y package-lock.json sí están versionados, aunque también aparecen en .gitignore.
- **Imágenes:** el límite y tipo de imagen se validan en el cliente; la API pasa imagen_base64 directamente a Cloudinary. Repetir controles en servidor y limitar tamaños.

## Lo que está bien implementado

- Consultas SQL parametrizadas en los flujos revisados.
- Hash bcrypt para altas y cambios de contraseña.
- Registro público crea profesores inactivos y exige aprobación.
- Préstamos directos múltiples con bloqueo ordenado, transacción y rollback.
- Avisos de préstamos y solicitudes dentro de las transacciones correspondientes.
- Aprobación verifica rol admin y evita repetir la decisión de la misma solicitud.
- Cancelación del profesor bloquea la solicitud y filtra por propietario, aunque debe rechazar tokens de recuperación.
- Formularios con validación, estados de carga, prevención de envíos duplicados en varios flujos y componentes accesibles como dialog y combobox.

## Validaciones realizadas

| Comprobación | Resultado |
|---|---|
| node --test sobre los cuatro archivos existentes | 14 pruebas correctas, 0 fallos |
| TypeScript: tsc --noEmit --incremental false | Correcto |
| npm run build | Correcto, salida 0 |
| npm run lint | No ejecuta lint: abre configuración inicial de ESLint y termina con salida 1 |
| Middleware con JWT de firma inválida, en memoria | Confirmado: permite continuar |

Las pruebas existentes simulan PostgreSQL y algunas funciones de autenticación. No validan restricciones reales, concurrencia entre transacciones ni toda la matriz de permisos. El build exitoso tampoco demuestra que los flujos funcionen contra el esquema desplegado.

## Orden recomendado de corrección

1. Cerrar API expuestas, verificar JWT y separar tokens de recuperación; retirar y rotar secretos.
2. Corregir concurrencia de stock, borrado de pendientes y rechazo/cancelación de reservas.
3. Unificar horarios recurrentes, reservas puntuales, sesión y edición de perfiles.
4. Consolidar migraciones y añadir pruebas de integración de permisos, claves foráneas y operaciones concurrentes.
5. Configurar lint, actualizar documentación y dividir vistas grandes por módulo.
