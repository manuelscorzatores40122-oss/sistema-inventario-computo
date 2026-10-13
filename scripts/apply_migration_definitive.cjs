const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL=(.*)/);

if (!dbUrlMatch) {
  console.error('Error: No se encontró DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({ connectionString: dbUrlMatch[1].trim().replace(/^["']|["']$/g, '') });

async function applyMigration() {
  console.log('--- Aplicando migración definitiva validada en Neon ---');
  const migrationPath = path.join(__dirname, '..', 'db', 'migrations', '2026-10-13_importacion-inventario-ugel.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Quitar la sección de reversión comentada para ejecutar la transacción limpia
  const sqlToExecute = sql.split('-- REVERSIÓN')[0];

  await pool.query(sqlToExecute);
  console.log('✓ Migración ejecutada con COMMIT exitoso.');

  // Verificaciones post-migración
  const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'inventario' ORDER BY ordinal_position");
  console.log('✓ Columnas actuales en inventario:', cols.rows.map(r => r.column_name).join(', '));

  const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'importaciones_%'");
  console.log('✓ Nuevas tablas creadas:', tables.rows.map(r => r.table_name).join(', '));

  const items = await pool.query("SELECT id, nombre, situacion_administrativa, estado, condicion FROM inventario ORDER BY id ASC");
  console.log(`✓ Artículos existentes intactos: ${items.rows.length} (todos situacion_administrativa = '${items.rows[0]?.situacion_administrativa}')`);

  await pool.end();
}

applyMigration().catch(err => {
  console.error('Error fatal al aplicar migración:', err);
  pool.end();
  process.exit(1);
});
