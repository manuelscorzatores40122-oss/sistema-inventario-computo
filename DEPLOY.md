# Despliegue

1. Configurar el proyecto Next.js y su repositorio en el proveedor de hosting.
2. Definir `DATABASE_URL` con la conexión PostgreSQL/Neon y `JWT_SECRET` con un secreto propio aleatorio.
3. Para imágenes, configurar `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET`.
4. Aplicar las migraciones pendientes con una conexión administrativa a PostgreSQL. La de 2026-10-16 añade `notificaciones_lecturas`; no borra registros existentes.
5. Ejecutar `npm ci`, `npm test` y `npm run build`. El servidor de producción inicia con `npm start` y respeta `PORT`.
6. Comprobar login de ambos roles, catálogo, solicitudes, reserva de sala, aprobación, entrega, devolución, perfil y lectura de avisos.

Las variables reales se documentan en `.env.example`. El código usa `DATABASE_URL`, no `POSTGRES_URL`, y la autenticación propia usa `JWT_SECRET`.

El centro de notificaciones funciona dentro de la plataforma. Las variables `WHATSAPP_*` corresponden al webhook opcional de Meta; los avisos internos de solicitudes no implican envío externo por WhatsApp o correo.

Publicar cambios en GitHub no confirma por sí solo que un proveedor de hosting haya completado el despliegue. Revisar la compilación y las variables en ese proveedor.
