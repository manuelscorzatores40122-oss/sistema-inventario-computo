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

async function fullBackup() {
  console.log('--- Iniciando respaldo completo de todas las tablas ---');
  const tables = [
    'inventario',
    'usuarios',
    'solicitudes',
    'prestamos',
    'movimientos_inventario',
    'disponibilidad',
    'configuracion',
    'notificaciones_whatsapp'
  ];

  const backupData = {
    fecha: new Date().toISOString(),
    tablas: {}
  };

  for (const table of tables) {
    try {
      const res = await pool.query(`SELECT * FROM ${table}`);
      backupData.tablas[table] = {
        total: res.rows.length,
        filas: res.rows
      };
      console.log(`  ✓ Tabla ${table}: ${res.rows.length} registros respaldados`);
    } catch (err) {
      console.warn(`  ! Tabla ${table}: no existe o error (${err.message})`);
    }
  }

  const backupPath = path.join(__dirname, '..', 'referencia', 'backup_completo_pre_migracion.json');
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');

  // Verificar archivo
  const stat = fs.statSync(backupPath);
  const readBack = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

  if (stat.size > 0 && Object.keys(readBack.tablas).length > 0) {
    console.log(`\n✓ Respaldo completo verificado exitosamente en:`);
    console.log(`  referencia/backup_completo_pre_migracion.json (${(stat.size / 1024).toFixed(2)} KB)`);
  } else {
    throw new Error('El archivo de respaldo está vacío o corrupto');
  }

  await pool.end();
}

fullBackup().catch(err => {
  console.error('Error fatal al respaldar:', err);
  process.exit(1);
});
