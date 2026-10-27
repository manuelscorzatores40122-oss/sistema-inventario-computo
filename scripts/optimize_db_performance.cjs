const { Pool } = require('pg');
const fs = require('fs');

let envContent = '';
if (fs.existsSync('.env.local')) envContent = fs.readFileSync('.env.local', 'utf8');
else if (fs.existsSync('.env')) envContent = fs.readFileSync('.env', 'utf8');

const dbUrlLine = envContent.split('\n').find(l => l.trim().startsWith('DATABASE_URL='));
let connectionString = dbUrlLine ? dbUrlLine.split(/=(.*)/s)[1].replace(/["']/g, '').trim() : process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const indexStatements = [
  // Inventario
  'CREATE INDEX IF NOT EXISTS idx_inventario_nombre ON inventario(nombre);',
  'CREATE INDEX IF NOT EXISTS idx_inventario_estado_cat ON inventario(estado, categoria);',
  'CREATE INDEX IF NOT EXISTS idx_inventario_disp ON inventario(cantidad_disponible);',
  
  // Prestamos
  'CREATE INDEX IF NOT EXISTS idx_prestamos_fecha_desc ON prestamos(fecha_prestamo DESC);',
  'CREATE INDEX IF NOT EXISTS idx_prestamos_profesor_fecha ON prestamos(profesor_id, fecha_prestamo DESC);',
  'CREATE INDEX IF NOT EXISTS idx_prestamos_inv_estado ON prestamos(inventario_id, estado);',
  
  // Solicitudes
  'CREATE INDEX IF NOT EXISTS idx_solicitudes_fecha_desc ON solicitudes(fecha_solicitud DESC);',
  'CREATE INDEX IF NOT EXISTS idx_solicitudes_inventario ON solicitudes(inventario_id);',
  'CREATE INDEX IF NOT EXISTS idx_solicitudes_profesor_estado ON solicitudes(profesor_id, estado);',
  
  // Usuarios
  'CREATE INDEX IF NOT EXISTS idx_usuarios_role_activo_nom ON usuarios(role, activo, nombre, apellido);',
  
  // Movimientos
  'CREATE INDEX IF NOT EXISTS idx_movimientos_inv_fecha ON movimientos_inventario(inventario_id, fecha DESC);',
  'CREATE INDEX IF NOT EXISTS idx_movimientos_tipo ON movimientos_inventario(tipo_movimiento);',

  // Importaciones
  'CREATE INDEX IF NOT EXISTS idx_importaciones_fecha ON importaciones_inventario(fecha_importacion DESC);',
  'CREATE INDEX IF NOT EXISTS idx_import_detalle_resultado ON importaciones_inventario_detalle(importacion_id, resultado);'
];

async function getConnectedClient(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      return client;
    } catch (err) {
      console.log(`Intento de conexión ${i + 1} falló (${err.message}). Reintentando en 1s...`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error('No se pudo conectar después de 3 intentos.');
}

async function run() {
  const client = await getConnectedClient();
  console.log('Optimizando índices de alto rendimiento en Neon PostgreSQL...');
  try {
    for (const sql of indexStatements) {
      const t = Date.now();
      await client.query(sql);
      console.log(`✓ Ejecutado en ${Date.now() - t}ms: ${sql.slice(0, 65)}...`);
    }
    console.log('\n¡Todos los índices de aceleración creados y activos exitosamente!');
  } catch (err) {
    console.error('Error aplicando índices:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
