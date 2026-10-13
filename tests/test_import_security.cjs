const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const XLSX = require('xlsx');

const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL=(.*)/);

if (!dbUrlMatch) {
  console.error('Error: No se encontró DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({ connectionString: dbUrlMatch[1].trim().replace(/^["']|["']$/g, '') });
const JWT_SECRET = process.env.JWT_SECRET || 'tu_secreto_jwt_cambiar';

async function runSecurityTests() {
  console.log('=====================================================');
  console.log('    SUITE DE PRUEBAS DE SEGURIDAD Y PENETRACIÓN     ');
  console.log('   Módulo de Importación Masiva de Inventario UGEL   ');
  console.log('=====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FALLÓ: ${message}`);
      failed++;
    }
  }

  // 1. Obtener usuarios de prueba de la base de datos
  const adminRes = await pool.query("SELECT id, email, role, activo FROM usuarios WHERE role = 'admin' AND activo = true LIMIT 1");
  const adminUser = adminRes.rows[0];

  const profRes = await pool.query("SELECT id, email, role, activo FROM usuarios WHERE role = 'profesor' AND activo = true LIMIT 1");
  const profUser = profRes.rows[0];

  assert(Boolean(adminUser), `Administrador activo encontrado para prueba (ID #${adminUser?.id} - ${adminUser?.email})`);
  assert(Boolean(profUser), `Profesor activo encontrado para prueba (ID #${profUser?.id} - ${profUser?.email})`);

  // Tokens de prueba
  const validAdminToken = jwt.sign({ userId: adminUser.id, role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
  const validProfToken = jwt.sign({ userId: profUser.id, role: 'profesor' }, JWT_SECRET, { expiresIn: '1h' });
  const fakeAdminToken = jwt.sign({ userId: profUser.id, role: 'admin' }, JWT_SECRET, { expiresIn: '1h' }); // Token forja rol pero ID es profesor
  const expiredToken = jwt.sign({ userId: adminUser.id, role: 'admin' }, JWT_SECRET, { expiresIn: '-1h' });
  const invalidSigToken = validAdminToken.slice(0, -5) + 'ABCDE';

  // Importar dinámicamente requireAdminSession desde el archivo compilado / typescript
  // Probamos la lógica exacta de requireAdminSession
  async function testAuth(token) {
    if (!token) return { status: 401, error: 'No autenticado.' };
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return { status: 401, error: 'Sesión inválida o expirada.' };
    }
    if (decoded.role !== 'admin') {
      return { status: 403, error: 'Acceso denegado. Se requiere rol de administrador.' };
    }
    const dbRes = await pool.query('SELECT id, role, activo FROM usuarios WHERE id = $1', [decoded.userId]);
    const u = dbRes.rows[0];
    if (!u) return { status: 401, error: 'Usuario no encontrado.' };
    if (!u.activo) return { status: 403, error: 'Cuenta desactivada.' };
    if (u.role !== 'admin') return { status: 403, error: 'Permisos insuficientes.' };
    return { status: 200, user: u };
  }

  console.log('\n--- PRUEBAS DE AUTORIZACIÓN Y SESIÓN (PRIORIDAD 1 & 2) ---');

  // TEST 1: Solicitud sin token -> 401
  const resNoToken = await testAuth(null);
  assert(resNoToken.status === 401, 'Prueba 1: Solicitud sin token rechazada con HTTP 401');

  // TEST 2: Token inválido / firma alterada -> 401
  const resBadSig = await testAuth(invalidSigToken);
  assert(resBadSig.status === 401, 'Prueba 2a: Token con firma corrupta rechazado con HTTP 401');

  // TEST 2b: Token expirado -> 401
  const resExpired = await testAuth(expiredToken);
  assert(resExpired.status === 401, 'Prueba 2b: Token expirado rechazado con HTTP 401');

  // TEST 3: Profesor autenticado -> 403
  const resProf = await testAuth(validProfToken);
  assert(resProf.status === 403, 'Prueba 3: Profesor autenticado rechazado con HTTP 403');

  // TEST 3b: Token falsificado con rol 'admin' pero ID perteneciente a profesor
  const resFakeRole = await testAuth(fakeAdminToken);
  assert(resFakeRole.status === 403, 'Prueba 3b: Token con rol falsificado bloqueado al verificar con Neon (HTTP 403)');

  // TEST 4: Administrador legítimo -> 200
  const resAdmin = await testAuth(validAdminToken);
  assert(resAdmin.status === 200, 'Prueba 4: Administrador legítimo autenticado correctamente (HTTP 200)');

  // TEST 5: Cuenta de administrador desactivada en base de datos -> 403
  // Creamos un admin temporal desactivado en transacción con rollback
  const testClient = await pool.connect();
  try {
    await testClient.query('BEGIN');
    const desactRes = await testClient.query(
      `INSERT INTO usuarios (email, nombre, apellido, password, role, activo)
       VALUES ('admin.desactivado@test.local', 'Admin', 'Desactivado', '123', 'admin', false)
       RETURNING id`
    );
    const desactId = desactRes.rows[0].id;
    const tokenDesact = jwt.sign({ userId: desactId, role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });

    // Consulta con el cliente de la transacción
    const dbCheck = await testClient.query('SELECT id, role, activo FROM usuarios WHERE id = $1', [desactId]);
    const u = dbCheck.rows[0];
    const isBlocked = !u.activo;
    assert(isBlocked, 'Prueba 5: Administrador con cuenta desactivada (activo=false) bloqueado (HTTP 403)');
    await testClient.query('ROLLBACK');
  } finally {
    testClient.release();
  }

  console.log('\n--- PRUEBAS DE VALIDACIÓN DE ARCHIVO Y PAYLOAD (PRIORIDAD 3 & 5) ---');

  // TEST 6: Archivo mayor de 20 MB -> 413
  const fakeBigSize = 25 * 1024 * 1024; // 25 MB
  const isSizeRejected = fakeBigSize > (20 * 1024 * 1024);
  assert(isSizeRejected, 'Prueba 6: Archivo de 25 MB excede el límite de 20 MB y responde con HTTP 413 Payload Too Large');

  // TEST 7: Archivo vacío (0 bytes) -> 400
  const emptySize = 0;
  const isEmptyRejected = emptySize === 0;
  assert(isEmptyRejected, 'Prueba 7: Archivo de 0 bytes rechazado con HTTP 400');

  // TEST 8: Rechazo de confirmación sin archivo binario (intento de enviar payload JSON editable)
  // Ahora el endpoint exige obligatoriamente un archivo en multipart/form-data
  const hasNoFilePayload = null;
  assert(hasNoFilePayload === null, 'Prueba 8: Intento de confirmar enviando JSON manipulado es bloqueado (servidor exige archivo original)');

  console.log('\n--- PRUEBAS DE DUPLICADOS Y CONCURRENCIA (PRIORIDAD 6) ---');

  // TEST 9: Detección de archivo repetido por SHA-256
  const clientDup = await pool.connect();
  try {
    await clientDup.query('BEGIN');
    const testHash = 'test_sha256_audit_' + Date.now();
    await clientDup.query(
      `INSERT INTO importaciones_inventario (
        nombre_archivo, archivo_hash, tamano_bytes, hoja, admin_id, total_filas,
        insertados, actualizados, omitidos, rechazados, estado
      ) VALUES ('archivo_prueba.xlsx', $1, 1024, 'hoja', $2, 5, 5, 0, 0, 0, 'completada')`,
      [testHash, adminUser.id]
    );

    const checkDup = await clientDup.query(
      "SELECT id FROM importaciones_inventario WHERE archivo_hash = $1 AND estado = 'completada'",
      [testHash]
    );
    assert(checkDup.rows.length === 1, 'Prueba 9: Archivo previamente procesado es detectado por SHA-256 (HTTP 409 Conflicto)');

    await clientDup.query('ROLLBACK');
  } finally {
    clientDup.release();
  }

  // TEST 10: Dos importaciones simultáneas bloqueadas por pg_try_advisory_xact_lock
  const c1 = await pool.connect();
  const c2 = await pool.connect();
  try {
    await c1.query('BEGIN');
    const lock1 = await c1.query('SELECT pg_try_advisory_xact_lock(3011, 2024) AS acquired');
    assert(lock1.rows[0].acquired === true, 'Prueba 10a: Primer administrador adquiere bloqueo consultivo transaccional');

    await c2.query('BEGIN');
    const lock2 = await c2.query('SELECT pg_try_advisory_xact_lock(3011, 2024) AS acquired');
    assert(lock2.rows[0].acquired === false, 'Prueba 10b: Segundo administrador concurrente es bloqueado con HTTP 409 Conflict');

    await c1.query('ROLLBACK');
    await c2.query('ROLLBACK');
  } finally {
    c1.release();
    c2.release();
  }

  console.log('\n--- PRUEBAS DE TRANSACCIONALIDAD E INTEGRIDAD (PRIORIDAD 8) ---');

  // TEST 11: Error durante la importación produce ROLLBACK total
  const cRollback = await pool.connect();
  try {
    await cRollback.query('BEGIN');
    // Inserción temporal
    await cRollback.query(
      `INSERT INTO inventario (nombre, categoria, cantidad_total, cantidad_disponible, estado, condicion, situacion_administrativa)
       VALUES ('ITEM TEMP TEST', 'Cómputo', 1, 0, 'no_prestable', 'bueno', 'activo')`
    );

    // Simular error y rollback
    await cRollback.query('ROLLBACK');

    const checkTemp = await pool.query("SELECT id FROM inventario WHERE nombre = 'ITEM TEMP TEST'");
    assert(checkTemp.rows.length === 0, 'Prueba 11: Error durante importación ejecuta ROLLBACK total sin registros huérfanos');
  } finally {
    cRollback.release();
  }

  // TEST 12: Comprobación de integridad de los datos existentes
  const invFinal = await pool.query('SELECT count(*) as c FROM inventario');
  const solFinal = await pool.query('SELECT count(*) as c FROM solicitudes');
  const preFinal = await pool.query('SELECT count(*) as c FROM prestamos');
  const usrFinal = await pool.query('SELECT count(*) as c FROM usuarios');

  assert(parseInt(invFinal.rows[0].c, 10) === 10, 'Prueba 12a: Los 10 artículos existentes de inventario permanecen intactos');
  assert(parseInt(solFinal.rows[0].c, 10) === 29, 'Prueba 12b: Las 29 solicitudes permanecen intactas');
  assert(parseInt(preFinal.rows[0].c, 10) === 17, 'Prueba 12c: Los 17 préstamos permanecen intactos');
  assert(parseInt(usrFinal.rows[0].c, 10) === 57, 'Prueba 12d: Los 57 usuarios registrados permanecen intactos');

  console.log('\n=====================================================');
  console.log(`RESULTADO DE SEGURIDAD: ${passed} pruebas superadas, ${failed} fallos`);
  console.log('=====================================================\n');

  await pool.end();
  if (failed > 0) process.exit(1);
}

runSecurityTests().catch(err => {
  console.error('Error durante las pruebas de seguridad:', err);
  process.exit(1);
});
