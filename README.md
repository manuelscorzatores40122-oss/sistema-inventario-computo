# Sistema de Inventarios y Autenticación para Colegio

Sistema web completo de gestión de inventarios, solicitudes y disponibilidades para colegio con autenticación de roles (Admin y Profesor).

##  Características

-  Autenticación con roles (Admin y Profesor)
-  Gestión de inventarios (CRUD)
-  Sistema de solicitudes de artículos
-  Control de disponibilidad de profesores
-  Aprobación/Rechazo de solicitudes por admin
-  Integración WhatsApp (base preparada)
-  Recuperación de contraseña
-  Dashboard responsivo

##  Requisitos

- Node.js >= 16
- PostgreSQL (o Neon)
- npm o yarn

##  Instalación

1. **Clonar el proyecto**
```bash
unzip colegio-system.zip
cd colegio-system
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env.local
```

Editar `.env.local` con tus valores:
```
POSTGRES_URL=postgresql://user:password@host:5432/colegio_db
NEXTAUTH_SECRET=tu_secreto_aqui
JWT_SECRET=tu_jwt_secret
```

4. **Crear la base de datos**

Conectarse a PostgreSQL y ejecutar:
```bash
psql -U usuario -d colegio_db -f db/schema.sql
```

5. **Ejecutar el servidor de desarrollo**
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 📱 Usuarios de Prueba

### Admin
- Email: `.
admin@colegio.com
- Contraseña: `
admin123`

### Profesor
- Email: `profesor@colegio.com`
- Contraseña: `profesor123`

*Crear usuarios de prueba ejecutando estos INSERT en PostgreSQL:*

```sql
INSERT INTO usuarios (email, nombre, apellido, password, role, telefono) 
VALUES 
('admin@colegio.com', 'Admin', 'Sistema', '$2a$10$...', 'admin', '+51987654321'),
('profesor@colegio.com', 'Juan', 'Pérez', '$2a$10$...', 'profesor', '+51987654322');
```

##  Estructura del Proyecto

```
colegio-system/
├── app/
│   ├── api/                    # Rutas API
│   │   ├── auth/              # Autenticación
│   │   ├── inventario/        # Inventarios
│   │   ├── solicitudes/       # Solicitudes
│   │   ├── disponibilidad/    # Disponibilidades
│   │   └── notificaciones/    # Notificaciones
│   ├── components/            # Componentes React
│   ├── lib/                   # Funciones auxiliares
│   ├── admin/                 # Páginas admin
│   ├── profesor/              # Páginas profesor
│   ├── auth/                  # Páginas autenticación
│   └── layout.tsx             # Layout principal
├── db/
│   └── schema.sql            # Esquema de base de datos
├── public/                    # Assets estáticos
└── package.json
```

##  Endpoints de API

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrarse
- `POST /api/auth/forgot-password` - Recuperar contraseña

### Inventario
- `GET /api/inventario` - Listar inventario
- `POST /api/inventario` - Crear item (admin)
- `PUT /api/inventario/[id]` - Actualizar item (admin)
- `DELETE /api/inventario/[id]` - Eliminar item (admin)

### Solicitudes
- `GET /api/solicitudes` - Listar solicitudes
- `POST /api/solicitudes` - Crear solicitud (profesor)
- `PUT /api/solicitudes/[id]` - Aprobar/Rechazar (admin)

### Disponibilidad
- `GET /api/disponibilidad` - Obtener disponibilidades
- `POST /api/disponibilidad` - Crear disponibilidad (profesor)
- `PUT /api/disponibilidad/[id]` - Reservar (admin)
- `DELETE /api/disponibilidad/[id]` - Liberar

### Notificaciones
- `GET /api/notificaciones/whatsapp` - Obtener notificaciones
- `POST /api/notificaciones/whatsapp` - Enviar notificación

##  Desplegar en Vercel

1. Push del código a GitHub
2. Conectar repositorio en Vercel
3. Configurar variables de entorno en Vercel
4. Deploy automático

## Integración WhatsApp (Twilio)

Para activar notificaciones por WhatsApp:

1. Crear cuenta en [Twilio](https://www.twilio.com)
2. Obtener ACCOUNT_SID, AUTH_TOKEN y número WhatsApp
3. Agregar variables en `.env.local`:

```
LIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890
```

4. Descommentar código en `/api/notificaciones/whatsapp/route.ts`

## Personalización

### Agregar nuevas categorías de inventario
Editar en base de datos o agregar selector en UI

### Cambiar colores
Editar `app/globals.css` y componentes

### Añadir más roles
1. Modificar tabla usuarios y lógica de roles
2. Crear nuevas páginas en `app/[rol]/`
3. Crear middleware de autorización

## Notas Importantes

- Las contraseñas se hashean con bcryptjs
- Los tokens JWT expiran en 7 días
- Cambiar `NEXTAUTH_SECRET` y `JWT_SECRET` en producción
- Usar HTTPS en producción
- Configurar CORS si es necesario

## Troubleshooting

### Error de conexión a BD
- Verificar `POSTGRES_URL`
- Asegurar que PostgreSQL está corriendo
- Verificar credenciales

### Errores de autenticación
- Limpiar localStorage
- Verificar `NEXTAUTH_SECRET`
- Recrear tablas de usuarios

### WhatsApp no funciona
- Verificar credenciales Twilio
- Asegurar números con formato internacional
- Revisar logs de Twilio

##  Licencia

MIT

## Autor

Sistema creado para colegios - 2024
# sistema-inventario-computo
