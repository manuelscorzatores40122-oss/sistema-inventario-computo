const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const DATABASE_URL = "postgresql://neondb_owner:npg_adUYEZb3z2rO@ep-tiny-queen-ae9bmyxw-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function createHiddenAdmin() {
  const pool = new Pool({
    connectionString: DATABASE_URL
  });

  try {
    console.log('Conectando a la base de datos...');
    
    const hashedPassword = await bcrypt.hash('admin', 10);

    const insertQuery = `
      INSERT INTO usuarios (email, nombre, apellido, password, role, oculto, activo) 
      VALUES ('admin', 'Super', 'Admin', $1, 'admin', true, true)
      ON CONFLICT (email) DO UPDATE 
      SET password = EXCLUDED.password, role = EXCLUDED.role, oculto = true, activo = true;
    `;
    
    await pool.query(insertQuery, [hashedPassword]);
    console.log('¡Cuenta admin oculta creada/actualizada exitosamente!');
    console.log('Credenciales:');
    console.log('Usuario: admin');
    console.log('Contraseña: admin');
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

createHiddenAdmin();
