const { Pool } = require('pg');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const dbUrlLine = envContent.split('\n').find(l => l.startsWith('DATABASE_URL='));
const connectionString = dbUrlLine ? dbUrlLine.split('=')[1].replace(/"/g, '').trim() : process.env.DATABASE_URL;

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function run() {
  const res = await pool.query("SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name, ordinal_position;");
  const tables = {};
  res.rows.forEach(r => {
    if (!tables[r.table_name]) tables[r.table_name] = [];
    tables[r.table_name].push(`${r.column_name} (${r.data_type})`);
  });
  console.log(JSON.stringify(tables, null, 2));
  await pool.end();
}

run().catch(e => { console.error(e); pool.end(); });
