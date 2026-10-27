const { Pool } = require('pg');
const fs = require('fs');

let envContent = '';
if (fs.existsSync('.env.local')) envContent = fs.readFileSync('.env.local', 'utf8');
else if (fs.existsSync('.env')) envContent = fs.readFileSync('.env', 'utf8');

const dbUrlLine = envContent.split('\n').find(l => l.trim().startsWith('DATABASE_URL='));
const connectionString = dbUrlLine ? dbUrlLine.split(/=(.*)/s)[1].replace(/["']/g, '').trim() : process.env.DATABASE_URL;

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function clean() {
  const client = await pool.connect();
  try {
    console.log('Iniciando limpieza total de inventario...');
    await client.query('BEGIN');

    const resPrestamos = await client.query('DELETE FROM prestamos');
    console.log(`- Préstamos eliminados: ${resPrestamos.rowCount}`);

    const resSolicitudes = await client.query('DELETE FROM solicitudes');
    console.log(`- Solicitudes eliminadas: ${resSolicitudes.rowCount}`);

    const resMovimientos = await client.query('DELETE FROM movimientos_inventario');
    console.log(`- Movimientos de inventario eliminados: ${resMovimientos.rowCount}`);

    const resImpDetalle = await client.query('DELETE FROM importaciones_inventario_detalle');
    console.log(`- Detalles de importación eliminados: ${resImpDetalle.rowCount}`);

    const resImp = await client.query('DELETE FROM importaciones_inventario');
    console.log(`- Registros de importaciones eliminados: ${resImp.rowCount}`);

    const resInventario = await client.query('DELETE FROM inventario');
    console.log(`- Artículos de inventario eliminados: ${resInventario.rowCount}`);

    // Reiniciar secuencias de IDs para comenzar limpios desde 1
    const seqs = [
      'inventario_id_seq',
      'movimientos_inventario_id_seq',
      'prestamos_id_seq',
      'solicitudes_id_seq',
      'importaciones_inventario_id_seq',
      'importaciones_inventario_detalle_id_seq'
    ];

    for (const seq of seqs) {
      try {
        await client.query(`ALTER SEQUENCE ${seq} RESTART WITH 1`);
        console.log(`- Secuencia reiniciada a 1: ${seq}`);
      } catch (e) {
        // En caso de que alguna secuencia tenga otro nombre o no exista
        console.log(`- Nota sobre secuencia ${seq}: ${e.message}`);
      }
    }

    await client.query('COMMIT');
    console.log('¡Limpieza completada exitosamente! La tabla inventario y sus dependencias quedaron en 0.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error durante la limpieza. Se ejecutó ROLLBACK:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

clean().catch(console.error);
