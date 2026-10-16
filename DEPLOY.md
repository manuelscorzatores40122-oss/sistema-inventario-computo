# Despliegue

1. Configurar el proyecto Next.js y su repositorio en el proveedor de hosting.
2. Definir `DATABASE_URL` con la conexión PostgreSQL/Neon y `JWT_SECRET` con un secreto propio aleatorio.
3. Para imágenes, configurar `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET`.
4. Aplicar las migraciones pendientes con una conexión administrativa a PostgreSQL. Las de 2026-10-16 añaden `notificaciones_lecturas`, índices de rendimiento y `usuarios.estado_registro` para la bandeja de cuentas. No borran registros existentes.
5. Ejecutar `npm ci`, `npm test` y `npm run build`. El servidor de producción inicia con `npm start` y respeta `PORT`.
6. Comprobar login de ambos roles, catálogo, solicitudes, reserva de sala, aprobación, entrega, devolución, perfil y lectura de avisos.

Las variables reales se documentan en `.env.example`. El código usa `DATABASE_URL`, no `POSTGRES_URL`, y la autenticación propia usa `JWT_SECRET`.

El centro de notificaciones funciona dentro de la plataforma. Las variables `WHATSAPP_*` corresponden al webhook opcional de Meta; los avisos internos de solicitudes no implican envío externo por WhatsApp o correo.

Publicar cambios en GitHub no confirma por sí solo que un proveedor de hosting haya completado el despliegue. Revisar la compilación y las variables en ese proveedor.

## Vercel: acceso temporalmente sin configurar

El mensaje con código `AUTH_CONFIGURATION` indica que el despliegue no tiene `JWT_SECRET`. En el proyecto de Vercel, abrir **Settings → Environment Variables**, configurar `JWT_SECRET` con un secreto aleatorio propio y seleccionar **Production** (también Preview si se utilizan despliegues de prueba). `NEXTAUTH_SECRET` no sustituye esta variable. No usar el ejemplo como secreto ni subir `.env` al repositorio.

Verificar también `DATABASE_URL`. Después de guardar las variables, volver a desplegar desde **Deployments → Redeploy**: un despliegue existente no incorpora automáticamente los cambios de entorno. La compilación en Vercel comprueba ambas variables y se detiene si falta alguna, antes de publicar una versión sin acceso.

## Desarrollo: componente no encontrado

`app/components/admin/AccountRequestsInbox.tsx` forma parte del repositorio y se importa desde `CrudViews.tsx`. Comprobar que el checkout está actualizado y que el servidor de `localhost:3011` corresponde a ese mismo directorio. Si el archivo existe pero el navegador conserva el error, reiniciar `npm run dev` y recargar la página. `npm run build` valida la resolución de módulos; el aviso de versión de Next.js no es la causa de un módulo faltante.
