# 🚀 Guía de Despliegue en Vercel + Neon

## Paso 1: Crear Base de Datos en Neon

1. Ir a [neon.tech](https://neon.tech)
2. Crear cuenta gratuita
3. Crear nuevo proyecto PostgreSQL
4. Copiar la connection string (ejemplo: `postgresql://user:password@...`)

## Paso 2: Inicializar Base de Datos

1. Conectarse a Neon con cualquier cliente PostgreSQL
2. Ejecutar el script SQL:

```bash
# Con psql
psql "postgresql://user:password@...database.neon.tech/neondb" -f db/schema.sql
```

O copiar y pegar contenido de `db/schema.sql` en Neon Console

## Paso 3: Preparar Código para Vercel

1. Asegurar que todo está committeado:
```bash
git add .
git commit -m "Initial commit"
```

2. Actualizar `package.json` con dependencias para Vercel:
```json
{
  "devDependencies": {
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.3.0"
  }
}
```

Ejecutar:
```bash
npm install
```

## Paso 4: Subir a GitHub

1. Crear repositorio en GitHub
2. Push:
```bash
git remote add origin https://github.com/usuario/colegio-system.git
git branch -M main
git push -u origin main
```

## Paso 5: Desplegar en Vercel

1. Ir a [vercel.com](https://vercel.com)
2. Hacer login con GitHub
3. Hacer clic en "New Project"
4. Seleccionar repositorio `colegio-system`
5. Configurar variables de entorno:

| Variable | Valor |
|----------|-------|
| `POSTGRES_URL` | Tu connection string de Neon |
| `NEXTAUTH_SECRET` | Generar: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Tu dominio Vercel (ej: https://colegio.vercel.app) |
| `JWT_SECRET` | Generar: `openssl rand -base64 32` |

6. Hacer clic en "Deploy"

## Paso 6: Pruebas Post-Despliegue

1. Acceder a tu dominio Vercel
2. Probar login
3. Verificar funcionalidades

## 🔒 Seguridad en Producción

### Cambiar contraseñas de prueba

Ejecutar en Neon:
```sql
UPDATE usuarios SET password = '$2a$10$...' WHERE email = 'admin@colegio.com';
```

(Usar bcrypt para hashear nuevas contraseñas)

### Habilitar HTTPS
Vercel lo hace automáticamente

### Configurar CORS si es necesario
En `next.config.js`:
```javascript
headers: async () => [
  {
    source: '/api/:path*',
    headers: [
      { key: 'Access-Control-Allow-Origin', value: 'https://tudominio.com' },
    ],
  },
],
```

## 📊 Monitorear

1. Ir a panel de Vercel
2. Ver logs en "Deployments"
3. Ver analytics en "Analytics"

## 🆘 Solucionar Problemas

### "Cannot find module"
```bash
npm install
```

### Error de BD en Vercel
- Verificar `POSTGRES_URL` está correcta
- Verificar IP de Vercel está permitida en Neon (normalmente no necesario)
- Ver logs en Vercel

### Aplicación lenta
- Optimizar queries en Neon
- Aumentar plan si es necesario
- Revisar logs de función

## 📱 Hacer responsivo para móvil

Vercel sirve automáticamente en mobile. Probar con:
- Chrome DevTools (F12 → Toggle device)
- Acceder desde teléfono real a URL de Vercel

## 🔄 Actualizaciones

Para actualizar código:
```bash
git push origin main
```

Vercel redeploy automáticamente

## 💰 Costos

- **Vercel**: Gratis hasta cierto uso
- **Neon**: Gratis hasta cierto almacenamiento/conexiones
- **Ambos** planes pagos si crece uso

## ✅ Checklist Final

- [ ] Base de datos en Neon funcionando
- [ ] Repositorio en GitHub
- [ ] Variables de entorno en Vercel
- [ ] Deploy exitoso
- [ ] Login funciona
- [ ] CRUD de inventario funciona
- [ ] Solicitudes funcionan
- [ ] Correo de recuperación configurado (opcional)
- [ ] WhatsApp integrado (opcional)

¡Listo para producción! 🎉
