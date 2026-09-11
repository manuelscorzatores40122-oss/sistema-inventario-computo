const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_adUYEZb3z2rO@ep-tiny-queen-ae9bmyxw-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function createAdmin() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    const hashed = await bcrypt.hash('admin', 10);

    const result = await pool.query(`
      INSERT INTO usuarios (email, nombre, apellido, password, role, activo)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE
        SET password = $4, role = $5, activo = $6
      RETURNING id, email, nombre, apellido, role, activo
    `, ['admin', 'Admin', 'Sistema', hashed, 'admin', true]);

    console.log('Admin creado/actualizado:');
    console.log(JSON.stringify(result.rows[0], null, 2));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

createAdmin();
