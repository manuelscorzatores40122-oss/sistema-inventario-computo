const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// 1. Cargar DATABASE_URL de manera segura sin imprimir credenciales
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL=(.*)/);

if (!dbUrlMatch) {
  console.error('Error: No se encontró DATABASE_URL en .env');
  process.exit(1);
}

const dbUrl = dbUrlMatch[1].trim().replace(/^["']|["']$/g, '');
const pool = new Pool({
  connectionString: dbUrl,
  connectionTimeoutMillis: 10000,
});

async function run() {
  const report = {
    backup: null,
    preState: {},
    dryRun: {
      appliedDdl: false,
      existingCompatibility: false,
      constraintTests: [],
      advisoryLockTest: false,
      rolledBack: false,
    },
    postState: {},
    errors: [],
    warnings: [],
  };

  console.log('================================================================');
  console.log('   INICIANDO PROCEDIMIENTO DE RESPALDO Y DRY-RUN (CON ROLLBACK)  ');
  console.log('================================================================\n');

  // --- PASO 1: GENERAR RESPALDO DE LOS 10 ARTÍCULOS ---
  console.log('[1/4] Generando respaldo preventivo de los artículos existentes...');
  try {
    const itemsRes = await pool.query('SELECT * FROM inventario ORDER BY id ASC');
    const backupDir = path.join(__dirname, '..', 'referencia');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const backupPath = path.join(backupDir, 'backup_inventario_pre_migracion.json');

    const backupData = {
      fecha_respaldo: new Date().toISOString(),
      total_registros: itemsRes.rows.length,
      registros: itemsRes.rows,
    };

    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');

    // Verificar lectura del archivo respaldado
    const verifiedContent = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    if (verifiedContent.total_registros === itemsRes.rows.length && verifiedContent.registros.length === itemsRes.rows.length) {
      report.backup = {
        exitoso: true,
        archivo: 'referencia/backup_inventario_pre_migracion.json',
        tamano_bytes: fs.statSync(backupPath).size,
        total_articulos: itemsRes.rows.length,
      };
      console.log(`  ✓ Respaldo creado y verificado con éxito: ${itemsRes.rows.length} artículos guardados (${report.backup.tamano_bytes} bytes).`);
    } else {
      throw new Error('La verificación del archivo de respaldo no coincidió con los datos de BD.');
    }
  } catch (err) {
    report.backup = { exitoso: false, error: err.message };
    console.error('  ✗ Fallo al generar el respaldo:', err.message);
    await pool.end();
    process.exit(1);
  }

  // --- PASO 2: CAPTURAR ESTADO PRE-MIGRACIÓN ---
  console.log('\n[2/4] Verificando estado pre-migración de tablas y relaciones...');
  const countInvPre = await pool.query('SELECT COUNT(*)::int as c FROM inventario');
  const countSolPre = await pool.query('SELECT COUNT(*)::int as c FROM solicitudes');
  const countPresPre = await pool.query('SELECT COUNT(*)::int as c FROM prestamos');
  const countMovPre = await pool.query('SELECT COUNT(*)::int as c FROM movimientos_inventario');
  const colsInvPre = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'inventario' ORDER BY ordinal_position");
  const tablesPre = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");

  report.preState = {
    inventario_count: countInvPre.rows[0].c,
    solicitudes_count: countSolPre.rows[0].c,
    prestamos_count: countPresPre.rows[0].c,
    movimientos_count: countMovPre.rows[0].c,
    columnas_inventario: colsInvPre.rows.map(r => r.column_name),
    tablas_existentes: tablesPre.rows.map(r => r.table_name),
  };
  console.log(`  ✓ Conteos iniciales: inventario=${report.preState.inventario_count}, solicitudes=${report.preState.solicitudes_count}, prestamos=${report.preState.prestamos_count}, movimientos=${report.preState.movimientos_count}`);

  // --- PASO 3: EJECUTAR DRY-RUN EN TRANSACCIÓN AISLADA ---
  console.log('\n[3/4] Ejecutando Dry-Run dentro de transacción con ROLLBACK forzado...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    console.log('  -> Transacción iniciada (BEGIN)');

    // DDL de la migración
    await client.query(`
      ALTER TABLE inventario
        ADD COLUMN IF NOT EXISTS numero_serie             VARCHAR(150),
        ADD COLUMN IF NOT EXISTS color                    VARCHAR(100),
        ADD COLUMN IF NOT EXISTS nivel                    VARCHAR(50),
        ADD COLUMN IF NOT EXISTS observaciones            TEXT,
        ADD COLUMN IF NOT EXISTS procedencia_entidad      VARCHAR(255),
        ADD COLUMN IF NOT EXISTS documento_sustentatorio  VARCHAR(255),
        ADD COLUMN IF NOT EXISTS fecha_documento          DATE,
        ADD COLUMN IF NOT EXISTS situacion_administrativa VARCHAR(20) NOT NULL DEFAULT 'activo',
        ADD COLUMN IF NOT EXISTS situacion_detalle        VARCHAR(255);
    `);

    // Constraints con protección ante NULL
    await client.query(`
      ALTER TABLE inventario
        ADD CONSTRAINT inventario_situacion_administrativa_check
        CHECK (situacion_administrativa IN ('activo', 'baja', 'perdido', 'pendiente_revision'));

      ALTER TABLE inventario
        ADD CONSTRAINT inventario_inactivo_no_prestable_check
        CHECK (COALESCE(situacion_administrativa, 'pendiente_revision') = 'activo' OR estado IS DISTINCT FROM 'disponible');

      ALTER TABLE inventario
        ADD CONSTRAINT inventario_malo_no_prestable_check
        CHECK (COALESCE(condicion, 'bueno') != 'malo' OR estado IS DISTINCT FROM 'disponible');

      ALTER TABLE inventario
        ADD CONSTRAINT inventario_no_prestable_stock_check
        CHECK (COALESCE(estado, '') != 'no_prestable' OR COALESCE(cantidad_disponible, 0) = 0);
    `);

    // Tablas de historial e índices
    await client.query(`
      CREATE TABLE importaciones_inventario (
        id                SERIAL PRIMARY KEY,
        nombre_archivo    VARCHAR(255) NOT NULL,
        archivo_hash      CHAR(64)     NOT NULL,
        tamano_bytes      INTEGER      NOT NULL,
        hoja              VARCHAR(100),
        admin_id          INTEGER      NOT NULL REFERENCES usuarios(id),
        total_filas       INTEGER      NOT NULL DEFAULT 0,
        insertados        INTEGER      NOT NULL DEFAULT 0,
        actualizados      INTEGER      NOT NULL DEFAULT 0,
        omitidos          INTEGER      NOT NULL DEFAULT 0,
        rechazados        INTEGER      NOT NULL DEFAULT 0,
        estado            VARCHAR(20)  NOT NULL DEFAULT 'completada' CHECK (estado IN ('completada', 'fallida')),
        mensaje_error     TEXT,
        fecha_importacion TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE importaciones_inventario_detalle (
        id              SERIAL PRIMARY KEY,
        importacion_id  INTEGER     NOT NULL REFERENCES importaciones_inventario(id) ON DELETE CASCADE,
        fila_excel      INTEGER     NOT NULL,
        numero_ugel     VARCHAR(20),
        huella_registro CHAR(64),
        inventario_id   INTEGER     REFERENCES inventario(id) ON DELETE SET NULL,
        resultado       VARCHAR(20) NOT NULL CHECK (resultado IN ('insertado', 'actualizado', 'omitido', 'rechazado')),
        mensaje         TEXT,
        datos           JSONB       NOT NULL
      );

      CREATE INDEX idx_inventario_numero_serie ON inventario (UPPER(numero_serie)) WHERE numero_serie IS NOT NULL;
      CREATE INDEX idx_inventario_situacion ON inventario (situacion_administrativa);
      CREATE INDEX idx_importaciones_hash ON importaciones_inventario (archivo_hash);
      CREATE INDEX idx_import_detalle_importacion ON importaciones_inventario_detalle (importacion_id);
      CREATE INDEX idx_import_detalle_huella ON importaciones_inventario_detalle (huella_registro);
    `);

    report.dryRun.appliedDdl = true;
    console.log('  ✓ DDL aplicado correctamente dentro de la transacción.');

    // Verificar compatibilidad con los 10 artículos existentes
    const compatRes = await client.query('SELECT id, nombre, estado, condicion, situacion_administrativa FROM inventario ORDER BY id ASC');
    const allActive = compatRes.rows.every(r => r.situacion_administrativa === 'activo');
    if (compatRes.rows.length === 10 && allActive) {
      report.dryRun.existingCompatibility = true;
      console.log('  ✓ Compatibilidad de los 10 artículos existentes verificada: todos adoptaron situacion_administrativa="activo" por DEFAULT.');
    } else {
      throw new Error(`Los artículos existentes no cumplieron el estado esperado (${compatRes.rows.length} filas, allActive=${allActive}).`);
    }

    // --- PRUEBAS ESPECÍFICAS DE CHECK CONSTRAINTS CON SAVEPOINTS ---
    console.log('\n  -> Probando validaciones y CHECK constraints (con SAVEPOINTS aislados):');

    async function testConstraint({ name, sql, params, shouldFail, expectedConstraint }) {
      await client.query('SAVEPOINT sp_test');
      try {
        await client.query(sql, params);
        await client.query('RELEASE SAVEPOINT sp_test');
        if (shouldFail) {
          report.dryRun.constraintTests.push({ name, passed: false, detail: 'Debió fallar pero fue aceptado' });
          console.log(`    ✗ ${name}: FALLÓ (debió ser rechazado)`);
        } else {
          report.dryRun.constraintTests.push({ name, passed: true, detail: 'Aceptado correctamente' });
          console.log(`    ✓ ${name}: ACEPTADO CORRECTAMENTE`);
        }
      } catch (err) {
        await client.query('ROLLBACK TO SAVEPOINT sp_test');
        if (shouldFail) {
          const matched = expectedConstraint ? err.message.includes(expectedConstraint) : true;
          report.dryRun.constraintTests.push({ name, passed: matched, detail: `Rechazado como esperado (${err.code})` });
          console.log(`    ✓ ${name}: RECHAZADO CORRECTAMENTE (${expectedConstraint || 'CHECK violation'})`);
        } else {
          report.dryRun.constraintTests.push({ name, passed: false, detail: `Error inesperado: ${err.message}` });
          console.log(`    ✗ ${name}: Error inesperado: ${err.message}`);
        }
      }
    }

    // C1: Baja + disponible -> debe fallar
    await testConstraint({
      name: 'C1: Bien dado de BAJA intentando registrarse como disponible',
      sql: `INSERT INTO inventario (nombre, categoria, cantidad_total, cantidad_disponible, estado, situacion_administrativa, condicion)
            VALUES ('Equipo Test C1', 'Cómputo', 1, 1, 'disponible', 'baja', 'bueno')`,
      params: [],
      shouldFail: true,
      expectedConstraint: 'inventario_inactivo_no_prestable_check',
    });

    // C2: Perdido + disponible -> debe fallar
    await testConstraint({
      name: 'C2: Bien PERDIDO intentando registrarse como disponible',
      sql: `INSERT INTO inventario (nombre, categoria, cantidad_total, cantidad_disponible, estado, situacion_administrativa, condicion)
            VALUES ('Equipo Test C2', 'Cómputo', 1, 1, 'disponible', 'perdido', 'bueno')`,
      params: [],
      shouldFail: true,
      expectedConstraint: 'inventario_inactivo_no_prestable_check',
    });

    // C3: Pendiente revisión + disponible -> debe fallar
    await testConstraint({
      name: 'C3: Bien PENDIENTE_REVISION intentando registrarse como disponible',
      sql: `INSERT INTO inventario (nombre, categoria, cantidad_total, cantidad_disponible, estado, situacion_administrativa, condicion)
            VALUES ('Equipo Test C3', 'Cómputo', 1, 1, 'disponible', 'pendiente_revision', 'bueno')`,
      params: [],
      shouldFail: true,
      expectedConstraint: 'inventario_inactivo_no_prestable_check',
    });

    // C4: Condición MALO + disponible -> debe fallar
    await testConstraint({
      name: 'C4: Bien en condición MALO intentando registrarse como disponible',
      sql: `INSERT INTO inventario (nombre, categoria, cantidad_total, cantidad_disponible, estado, situacion_administrativa, condicion)
            VALUES ('Equipo Test C4', 'Cómputo', 1, 1, 'disponible', 'activo', 'malo')`,
      params: [],
      shouldFail: true,
      expectedConstraint: 'inventario_malo_no_prestable_check',
    });

    // C5: Estado no_prestable con stock > 0 -> debe fallar
    await testConstraint({
      name: 'C5: Bien en NO_PRESTABLE con cantidad_disponible > 0',
      sql: `INSERT INTO inventario (nombre, categoria, cantidad_total, cantidad_disponible, estado, situacion_administrativa, condicion)
            VALUES ('Equipo Test C5', 'Cómputo', 1, 1, 'no_prestable', 'activo', 'bueno')`,
      params: [],
      shouldFail: true,
      expectedConstraint: 'inventario_no_prestable_stock_check',
    });

    // C6: Situación inválida en el ENUM check -> debe fallar
    await testConstraint({
      name: 'C6: Situación administrativa inválida (ej. "destruido")',
      sql: `INSERT INTO inventario (nombre, categoria, cantidad_total, cantidad_disponible, estado, situacion_administrativa, condicion)
            VALUES ('Equipo Test C6', 'Cómputo', 1, 0, 'no_prestable', 'destruido', 'bueno')`,
      params: [],
      shouldFail: true,
      expectedConstraint: 'inventario_situacion_administrativa_check',
    });

    // C7: Válido en baja como no_prestable con disponible = 0 -> debe pasar
    await testConstraint({
      name: 'C7: Bien en BAJA registrado como no_prestable (disponible = 0)',
      sql: `INSERT INTO inventario (nombre, categoria, cantidad_total, cantidad_disponible, estado, situacion_administrativa, condicion)
            VALUES ('Equipo Test C7', 'Cómputo', 1, 0, 'no_prestable', 'baja', 'malo')`,
      params: [],
      shouldFail: false,
    });

    // C8: Válido en activo, bueno y disponible -> debe pasar
    await testConstraint({
      name: 'C8: Bien ACTIVO, BUENO y DISPONIBLE para préstamo',
      sql: `INSERT INTO inventario (nombre, categoria, cantidad_total, cantidad_disponible, estado, situacion_administrativa, condicion)
            VALUES ('Equipo Test C8', 'Cómputo', 1, 1, 'disponible', 'activo', 'bueno')`,
      params: [],
      shouldFail: false,
    });

    // C9: Válido con valores NULL en campos secundarios (número de serie, color, observaciones, fecha) -> debe pasar
    await testConstraint({
      name: 'C9: Inserción válida con campos opcionales en NULL (compatibilidad NULL-logic)',
      sql: `INSERT INTO inventario (
              nombre, categoria, cantidad_total, cantidad_disponible, estado,
              situacion_administrativa, condicion, numero_serie, color, observaciones, fecha_documento
            ) VALUES (
              'Equipo Test C9', 'Cómputo', 5, 0, 'no_prestable',
              'activo', 'regular', NULL, NULL, NULL, NULL
            )`,
      params: [],
      shouldFail: false,
    });

    // C10: Prueba del bloqueo de concurrencia (Advisory Lock)
    const lockRes = await client.query('SELECT pg_try_advisory_xact_lock(3011, 2024) as locked');
    if (lockRes.rows[0].locked === true) {
      report.dryRun.advisoryLockTest = true;
      console.log('    ✓ C10: Bloqueo de concurrencia advisory_xact_lock(3011, 2024) probado con éxito.');
    } else {
      console.log('    ✗ C10: Falló al adquirir advisory lock.');
    }

    // Verificar que solicitudes y préstamos siguen pudiendo consultarse en la transacción
    await client.query('SELECT * FROM solicitudes LIMIT 1');
    await client.query('SELECT * FROM prestamos LIMIT 1');
    await client.query('SELECT * FROM movimientos_inventario LIMIT 1');
    console.log('  ✓ Consultas en solicitudes, prestamos y movimientos_inventario ejecutadas sin interferencias.');

  } catch (err) {
    report.errors.push(`Error en ejecución de dry-run: ${err.message}`);
    console.error('  ✗ Error durante el dry-run:', err);
  } finally {
    // FORZAR ROLLBACK EN TODOS LOS CASOS
    await client.query('ROLLBACK');
    client.release();
    report.dryRun.rolledBack = true;
    console.log('  -> Transacción revertida con éxito (ROLLBACK ejecutado).');
  }

  // --- PASO 4: VERIFICAR QUE NO HUBO CAMBIOS PERMANENTES ---
  console.log('\n[4/4] Verificando que Neon permanece 100% intacto tras el ROLLBACK...');
  const countInvPost = await pool.query('SELECT COUNT(*)::int as c FROM inventario');
  const countSolPost = await pool.query('SELECT COUNT(*)::int as c FROM solicitudes');
  const countPresPost = await pool.query('SELECT COUNT(*)::int as c FROM prestamos');
  const countMovPost = await pool.query('SELECT COUNT(*)::int as c FROM movimientos_inventario');
  const colsInvPost = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'inventario' ORDER BY ordinal_position");
  const tablesPost = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");

  report.postState = {
    inventario_count: countInvPost.rows[0].c,
    solicitudes_count: countSolPost.rows[0].c,
    prestamos_count: countPresPost.rows[0].c,
    movimientos_count: countMovPost.rows[0].c,
    columnas_inventario: colsInvPost.rows.map(r => r.column_name),
    tablas_existentes: tablesPost.rows.map(r => r.table_name),
  };

  const countsMatch =
    report.preState.inventario_count === report.postState.inventario_count &&
    report.preState.solicitudes_count === report.postState.solicitudes_count &&
    report.preState.prestamos_count === report.postState.prestamos_count &&
    report.preState.movimientos_count === report.postState.movimientos_count;

  const colsMatch = JSON.stringify(report.preState.columnas_inventario) === JSON.stringify(report.postState.columnas_inventario);
  const tablesMatch = JSON.stringify(report.preState.tablas_existentes.sort()) === JSON.stringify(report.postState.tablas_existentes.sort());

  console.log(`  ✓ Conteo posterior: inventario=${report.postState.inventario_count} (idéntico: ${countsMatch})`);
  console.log(`  ✓ Columnas en inventario idénticas a las iniciales: ${colsMatch}`);
  console.log(`  ✓ Tablas en esquema idénticas a las iniciales: ${tablesMatch}`);

  await pool.end();

  // Guardar reporte local
  fs.writeFileSync(
    path.join(__dirname, '..', 'referencia', 'reporte_dry_run.json'),
    JSON.stringify(report, null, 2),
    'utf8'
  );

  return report;
}

run().catch(e => {
  console.error('Error fatal:', e);
  process.exit(1);
});
