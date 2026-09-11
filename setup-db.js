const { Pool } = require('pg');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DATABASE_URL = "postgresql://neondb_owner:npg_adUYEZb3z2rO@ep-tiny-queen-ae9bmyxw-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function setup() {
  const pool = new Pool({
    connectionString: DATABASE_URL
  });

  try {
    console.log('Conectando a la base de datos...');
    
    // Crear tablas
    console.log('Creando esquema de la base de datos...');
    const schema = fs.readFileSync('db/schema.sql', 'utf8');
    await pool.query(schema);
    console.log('Tablas creadas exitosamente.');

    // Insertar usuarios
    console.log('Generando contraseñas y creando usuarios...');
    const adminPassword = await bcrypt.hash('admin123', 10);
    const profesorPassword = await bcrypt.hash('profesor123', 10);

    const insertQuery = `
      INSERT INTO usuarios (email, nombre, apellido, password, role, telefono) 
      VALUES 
      ('admin@colegio.com', 'Admin', 'Sistema', $1, 'admin', '+51987654321'),
      ('profesor@colegio.com', 'Juan', 'Pérez', $2, 'profesor', '+51987654322')
      ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, role = EXCLUDED.role;
    `;
    
    await pool.query(insertQuery, [adminPassword, profesorPassword]);
    console.log('Usuarios de prueba creados/actualizados exitosamente.');
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

setup();
