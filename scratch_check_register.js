const fs = require('fs');
const env = {};
fs.readFileSync('D:/sistema-inventario-computo/.env', 'utf8').split(/\r?\n/).forEach(l => {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
});
const { Pool } = require('pg');
const pool = new Pool({ connectionString: env.DATABASE_URL, max: 2 });
(async () => {
  const cols = await pool.query(`SELECT column_name, data_type, character_maximum_length, is_nullable
    FROM information_schema.columns WHERE table_name='usuarios' ORDER BY ordinal_position`);
  console.log('--- USUARIOS ---');
  cols.rows.forEach(c => console.log(` ${c.column_name}: ${c.data_type}${c.character_maximum_length ? '(' + c.character_maximum_length + ')' : ''} ${c.is_nullable === 'NO' ? 'NOT NULL' : ''}`));
  const cons = await pool.query(`SELECT conname, pg_get_constraintdef(oid) def FROM pg_constraint WHERE conrelid='usuarios'::regclass`);
  console.log('--- CONSTRAINTS ---');
  cons.rows.forEach(c => console.log(' ', c.conname, '=>', c.def));
  await pool.end();
})().catch(e => console.error('ERR', e.message));
