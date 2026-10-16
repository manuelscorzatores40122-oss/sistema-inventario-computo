/** @type {import('next').NextConfig} */
const { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } = require('next/constants')

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
}

// Evita que next build sobrescriba los chunks del servidor de desarrollo.
module.exports = (phase) => {
  // Detectar configuración incompleta antes de publicar un login que no funciona.
  if (phase === PHASE_PRODUCTION_BUILD && process.env.VERCEL === '1') {
    const missing = ['DATABASE_URL', 'JWT_SECRET'].filter(name => !process.env[name]?.trim())
    if (missing.length) {
      throw new Error(`Configuración de Vercel incompleta: ${missing.join(', ')}. Añade estas variables en Settings > Environment Variables para el entorno del despliegue y vuelve a desplegar.`)
    }
  }
  return {
  ...nextConfig,
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
  }
}
