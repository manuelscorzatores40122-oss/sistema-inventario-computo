require('@next/env').loadEnvConfig(process.cwd());
const { Pool } = require('pg');
const DATABASE_URL = process.env.DATABASE_URL || process.env.DATABASE_URL;

async function addColumns() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query(`ALTER TABLE inventario ADD COLUMN IF NOT EXISTS imagen_url VARCHAR(500);`);
    await client.query(`ALTER TABLE inventario ADD COLUMN IF NOT EXISTS imagen_public_id VARCHAR(255);`);
    console.log("Columnas agregadas con éxito.");
  } catch(e) {
    console.error(e);
  } finally {
    client.release();
    await pool.end();
  }
}
addColumns();
