const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const DATABASE_URL = "postgresql://neondb_owner:npg_adUYEZb3z2rO@ep-tiny-queen-ae9bmyxw-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function fix() {
  const pool = new Pool({
    connectionString: DATABASE_URL
  });

  try {
    console.log('Conectando a la base de datos...');
    
    // Check if dni and area columns exist, add them if not
    await pool.query(`
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS dni VARCHAR(20);
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS area VARCHAR(100);
    `);
    console.log('Columnas dni y area verificadas/añadidas.');

    // Buscamos usuarios cuyas contraseñas no estén hasheadas
    // Los hashes de bcrypt normalmente empiezan con $2a$, $2b$, o $2y$ y tienen 60 caracteres
    const result = await pool.query(`SELECT id, password FROM usuarios WHERE password NOT LIKE '$2%'`);
    const usersToFix = result.rows;
    
    if (usersToFix.length === 0) {
      console.log('No se encontraron contraseñas en texto plano para hashear.');
    } else {
      console.log(`Encontrados ${usersToFix.length} usuarios con contraseña en texto plano. Hasheando...`);
      for (const user of usersToFix) {
        // En este punto user.password es el DNI en texto plano
        const hashedPassword = await bcrypt.hash(user.password, 10);
        await pool.query(`UPDATE usuarios SET password = $1, dni = $2 WHERE id = $3`, [hashedPassword, user.password, user.id]);
        console.log(`Usuario ID ${user.id} actualizado.`);
      }
      console.log('Todas las contraseñas han sido hasheadas correctamente.');
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

fix();
