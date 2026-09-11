const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_adUYEZb3z2rO@ep-tiny-queen-ae9bmyxw-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function fix() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log('Conectando a la base de datos...');
    await client.query('BEGIN');

    // 1. Agregar columnas dni y area si no existen
    await client.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS dni VARCHAR(20)');
    await client.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS area VARCHAR(255)');
    console.log('[OK] Columnas dni y area verificadas.');

    // 2. Agregar UNIQUE constraint en dni si no existe
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_dni_key'
        ) THEN
          ALTER TABLE usuarios ADD CONSTRAINT usuarios_dni_key UNIQUE (dni);
        END IF;
      END $$;
    `);
    console.log('[OK] UNIQUE en dni verificado.');

    // 3. Sincronizar codigo (email) = dni y hashear contraseñas en texto plano
    const result = await client.query(`
      SELECT id, email, password, dni
      FROM usuarios
      WHERE activo = true
    `);

    let hashedCount = 0;
    let dniFixCount = 0;

    for (const user of result.rows) {
      let needsUpdate = false;
      let updates = [];
      let params = [];

      // Si la contraseña no es un hash bcrypt, hashearla
      if (!user.password.startsWith('$2')) {
        const hashed = await bcrypt.hash(user.password, 10);
        updates.push(`password = $${params.length + 1}`);
        params.push(hashed);
        hashedCount++;
        needsUpdate = true;
      }

      // Si el dni es null o vacio, usar el email (que es el DNI)
      if (!user.dni || user.dni === '') {
        updates.push(`dni = $${params.length + 1}`);
        params.push(user.email);
        dniFixCount++;
        needsUpdate = true;
      }

      if (needsUpdate) {
        params.push(user.id);
        await client.query(
          `UPDATE usuarios SET ${updates.join(', ')} WHERE id = $${params.length}`,
          params
        );
      }
    }

    console.log(`[OK] Contraseñas hasheadas: ${hashedCount}`);
    console.log(`[OK] DNIs sincronizados: ${dniFixCount}`);

    // 4. Verificar que el usuario 29625007 existe
    const check = await client.query(
      `SELECT id, email, nombre, apellido, role, dni, activo FROM usuarios WHERE email = '29625007' OR dni = '29625007'`
    );

    if (check.rows.length === 0) {
      console.log('[INFO] El usuario 29625007 NO existe en la base de datos.');
      console.log('Para crearlo, ejecuta los INSERT de db/schema.sql o usa el registro de la app.');
    } else {
      console.log('[OK] Usuario 29625007 encontrado:');
      console.log(JSON.stringify(check.rows[0], null, 2));
    }

    await client.query('COMMIT');
    console.log('Migración completada.');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

fix();