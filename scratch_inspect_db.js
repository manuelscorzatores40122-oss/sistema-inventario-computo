const { Pool } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const dbUrl = env.match(/DATABASE_URL=(.*)/)[1].trim().replace(/^["']|["']$/g, '');
const pool = new Pool({ connectionString: dbUrl });

async function inspectDb() {
  const cols = await pool.query(`
    SELECT column_name, data_type, character_maximum_length AS len, is_nullable, column_default
    FROM information_schema.columns WHERE table_name = 'inventario' ORDER BY ordinal_position`);
  console.log('=== inventario: columnas ===');
  console.table(cols.rows);

  const cons = await pool.query(`
    SELECT conname, contype, pg_get_constraintdef(oid) AS def
    FROM pg_constraint WHERE conrelid = 'inventario'::regclass`);
  console.log('=== inventario: constraints ===');
  console.table(cons.rows);

  const refs = await pool.query(`
    SELECT conrelid::regclass AS tabla, conname, pg_get_constraintdef(oid) AS def
    FROM pg_constraint WHERE confrelid = 'inventario'::regclass`);
  console.log('=== FKs que apuntan a inventario ===');
  console.table(refs.rows);

  const tables = await pool.query(`
    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`);
  console.log('=== tablas ===', tables.rows.map(r => r.table_name).join(', '));

  const stats = await pool.query(`
    SELECT estado, condicion, COUNT(*)::int AS n FROM inventario GROUP BY estado, condicion ORDER BY 1, 2`);
  console.log('=== inventario: estado x condicion ===');
  console.table(stats.rows);

  const serie = await pool.query(`SELECT COUNT(*)::int AS n, COUNT(codigo_patrimonial)::int AS con_codigo FROM inventario`);
  console.log('=== totales ===', serie.rows[0]);

  await pool.end();
}

inspectDb().catch(e => { console.error(e.message); pool.end(); });
