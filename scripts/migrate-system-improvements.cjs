const { Pool } = require('pg');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const dbUrlLine = envContent.split('\n').find(l => l.startsWith('DATABASE_URL='));
const connectionString = dbUrlLine ? dbUrlLine.split('=')[1].replace(/"/g, '').trim() : process.env.DATABASE_URL;

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function migrate() {
  console.log('Iniciando migración de mejoras...');
  
  // 1. Columnas en inventario
  await pool.query(`
    ALTER TABLE inventario 
    ADD COLUMN IF NOT EXISTS codigo_patrimonial VARCHAR(100),
    ADD COLUMN IF NOT EXISTS marca VARCHAR(100),
    ADD COLUMN IF NOT EXISTS modelo VARCHAR(100),
    ADD COLUMN IF NOT EXISTS condicion VARCHAR(50) DEFAULT 'bueno';
  `);
  console.log('✔ Columnas de inventario (codigo_patrimonial, marca, modelo, condicion) aseguradas.');

  // 2. Columna en disponibilidad
  await pool.query(`
    ALTER TABLE disponibilidad 
    ADD COLUMN IF NOT EXISTS es_recurrente BOOLEAN DEFAULT true;
  `);
  console.log('✔ Columna es_recurrente en disponibilidad asegurada.');

  // 3. Tabla configuracion (para plantilla de horarios y ajustes globales)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS configuracion (
      clave VARCHAR(100) PRIMARY KEY,
      valor TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✔ Tabla configuracion asegurada.');

  // 4. Asegurar columnas de devolucion y solicitud_id en prestamos
  await pool.query(`
    ALTER TABLE prestamos
    ADD COLUMN IF NOT EXISTS solicitud_id INTEGER REFERENCES solicitudes(id),
    ADD COLUMN IF NOT EXISTS devolucion_observacion TEXT,
    ADD COLUMN IF NOT EXISTS devolucion_estado VARCHAR(50) DEFAULT 'bueno';
  `);
  console.log('✔ Columnas de prestamos aseguradas.');

  // Guardar formato por defecto en configuracion si no existe
  const formatoDefecto = JSON.stringify([
    { hora_inicio: '08:00', hora_fin: '08:45' },
    { hora_inicio: '08:45', hora_fin: '09:30' },
    { hora_inicio: '09:45', hora_fin: '10:30' },
    { hora_inicio: '10:30', hora_fin: '11:15' },
    { hora_inicio: '11:30', hora_fin: '12:15' },
    { hora_inicio: '12:15', hora_fin: '13:00' }
  ]);
  await pool.query(`
    INSERT INTO configuracion (clave, valor)
    VALUES ('horario_template', $1)
    ON CONFLICT (clave) DO NOTHING;
  `, [formatoDefecto]);
  console.log('✔ Configuración inicial de horario registrada.');

  console.log('Migración completada con éxito.');
  await pool.end();
}

migrate().catch(e => {
  console.error('Error durante la migración:', e);
  pool.end();
  process.exit(1);
});
