const { loadEnvConfig } = require('@next/env');
const { Pool } = require('pg');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

async function main() {
  loadEnvConfig(process.cwd());
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no está configurada');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
  try {
    await pool.query(readFileSync(join(__dirname, '../db/migrations/2026-09-29_solicitudes-ubicacion.sql'), 'utf8'));
    const result = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'solicitudes' AND column_name IN ('seccion', 'numero_aula') ORDER BY column_name");
    if (result.rows.length !== 2) throw new Error('No se pudieron verificar las columnas');
    console.log('Migración aplicada y verificada: solicitudes.seccion y solicitudes.numero_aula.');
  } finally { await pool.end(); }
}
main().catch(error => {
  console.error('No se pudo aplicar la migración. Código:', error.code || error.name);
  process.exitCode = 1;
});
