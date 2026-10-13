import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/app/lib/db';
import { requireAdminSession } from '@/app/lib/auth';
import { parseUgelExcel } from '@/app/lib/excelUgelParser';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export async function POST(request: NextRequest) {
  // 1. Autorización estricta: Solo administradores activos con sesión verificada
  const auth = await requireAdminSession(request);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const adminId = auth.user.id;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const omitirDuplicados = formData.get('omitir_duplicados') !== 'false';
    const forzarReimportacion = formData.get('forzar_reimportacion') === 'true';

    // 2. Validación de archivo en backend (Fuente de verdad)
    if (!file) {
      return NextResponse.json(
        { error: 'Se requiere el archivo Excel original para confirmar la importación.' },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: 'El archivo enviado está vacío (0 bytes).' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `El archivo excede el tamaño máximo permitido de 20 MB (tamaño actual: ${(file.size / (1024 * 1024)).toFixed(2)} MB).` },
        { status: 413 }
      );
    }

    const fileName = file.name || 'archivo.xlsx';
    if (!fileName.toLowerCase().endsWith('.xlsx') && !fileName.toLowerCase().endsWith('.xls')) {
      return NextResponse.json(
        { error: 'Formato no compatible. Por favor sube un archivo Excel válido (.xlsx o .xls).' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Re-análisis en el servidor: los registros provienen del Excel y no del frontend manipulable
    let parsedResult;
    try {
      parsedResult = parseUgelExcel(buffer, fileName);
    } catch (parseErr: any) {
      return NextResponse.json(
        { error: parseErr.message || 'Error al procesar el archivo Excel.' },
        { status: 422 }
      );
    }

    const { archivo_hash, tamano_bytes, hoja, filas } = parsedResult;

    if (!Array.isArray(filas) || filas.length === 0) {
      return NextResponse.json(
        { error: 'El archivo no contiene filas válidas para importar.' },
        { status: 400 }
      );
    }

    const client = await getClient();

    try {
      await client.query('BEGIN');

      // 4. Control de concurrencia: Bloqueo consultivo de PostgreSQL para importación
      const lockRes = await client.query('SELECT pg_try_advisory_xact_lock(3011, 2024) AS lock_acquired');
      if (!lockRes.rows[0]?.lock_acquired) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Existe otra importación de inventario en curso. Espere a que finalice para evitar inconsistencias.' },
          { status: 409 }
        );
      }

      // 5. Verificación de archivo duplicado por SHA-256
      if (!forzarReimportacion) {
        const prevImport = await client.query(
          `SELECT id, fecha_importacion FROM importaciones_inventario
           WHERE archivo_hash = $1 AND estado = 'completada'
           LIMIT 1`,
          [archivo_hash]
        );

        if (prevImport.rows.length > 0) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            {
              error: `Este archivo ya fue importado exitosamente con anterioridad (#${prevImport.rows[0].id} el ${new Date(prevImport.rows[0].fecha_importacion).toLocaleString('es-PE')}). Para volver a importarlo, active la opción de reimportación.`,
            },
            { status: 409 }
          );
        }
      }

      // 6. Crear registro maestro de importación
      const importRes = await client.query(
        `INSERT INTO importaciones_inventario (
          nombre_archivo, archivo_hash, tamano_bytes, hoja, admin_id,
          total_filas, insertados, actualizados, omitidos, rechazados, estado
        ) VALUES ($1, $2, $3, $4, $5, $6, 0, 0, 0, 0, 'completada')
        RETURNING id`,
        [fileName, archivo_hash, tamano_bytes, hoja || 'formato de inventarios', adminId, filas.length]
      );
      const importacionId = importRes.rows[0].id;

      // 7. Cargar mapa de series existentes en Neon bajo la transacción
      const seriesDBRes = await client.query(
        'SELECT UPPER(numero_serie) as serie_norm, id, nombre FROM inventario WHERE numero_serie IS NOT NULL'
      );
      const seriesExistentes = new Map<string, { id: number; nombre: string }>();
      for (const r of seriesDBRes.rows) {
        seriesExistentes.set(r.serie_norm, { id: r.id, nombre: r.nombre });
      }

      let insertados = 0;
      let omitidos = 0;
      let rechazados = 0;
      const detalles: any[] = [];

      for (const fila of filas) {
        const filaNum = fila.fila_excel;
        const numUgel = fila.numero_ugel || '';
        const huella = fila.huella_registro;

        // Fila inválida (cantidad nula, <= 0 o descripción vacía)
        if (!fila.valido || !fila.nombre || fila.cantidad === null || fila.cantidad === undefined || fila.cantidad <= 0) {
          rechazados++;
          const msg = fila.errores && fila.errores.length > 0
            ? fila.errores.join(' | ')
            : 'Fila con cantidad o descripción inválida.';

          await client.query(
            `INSERT INTO importaciones_inventario_detalle (
              importacion_id, fila_excel, numero_ugel, huella_registro,
              resultado, mensaje, datos
            ) VALUES ($1, $2, $3, $4, 'rechazado', $5, $6)`,
            [importacionId, filaNum, numUgel, huella, msg, JSON.stringify(fila)]
          );
          detalles.push({ fila: filaNum, resultado: 'rechazado', motivo: msg });
          continue;
        }

        // Comprobar colisión por número de serie en BD
        const serieNorm = fila.serie_es_valida && fila.numero_serie ? fila.numero_serie.toUpperCase() : null;
        if (serieNorm && seriesExistentes.has(serieNorm)) {
          if (omitirDuplicados) {
            omitidos++;
            const match = seriesExistentes.get(serieNorm)!;
            const msg = `Omitido por serie duplicada con ítem #${match.id} (${match.nombre})`;
            await client.query(
              `INSERT INTO importaciones_inventario_detalle (
                importacion_id, fila_excel, numero_ugel, huella_registro,
                resultado, mensaje, datos
              ) VALUES ($1, $2, $3, $4, 'omitido', $5, $6)`,
              [importacionId, filaNum, numUgel, huella, msg, JSON.stringify(fila)]
            );
            detalles.push({ fila: filaNum, resultado: 'omitido', motivo: msg });
            continue;
          }
        }

        // Reglas estrictas de operatividad y disponibilidad
        const adminSit = ['activo', 'baja', 'perdido', 'pendiente_revision'].includes(fila.situacion_administrativa)
          ? fila.situacion_administrativa
          : 'activo';
        const condFisica = ['bueno', 'regular', 'malo'].includes(fila.condicion) ? fila.condicion : 'bueno';

        let estadoFinal: 'no_prestable' | 'disponible' | 'mantenimiento' = 'no_prestable';
        let disponibleFinal = 0;

        if (adminSit === 'baja' || adminSit === 'perdido') {
          estadoFinal = 'no_prestable';
          disponibleFinal = 0;
        } else if (condFisica === 'malo') {
          estadoFinal = 'mantenimiento';
          disponibleFinal = 0;
        } else if (adminSit === 'pendiente_revision') {
          estadoFinal = 'no_prestable';
          disponibleFinal = 0;
        } else {
          estadoFinal = 'no_prestable';
          disponibleFinal = 0;
        }

        const totalCant = Math.floor(fila.cantidad);

        // Inserción en inventario (sin tocar artículos preexistentes)
        const insertInvRes = await client.query(
          `INSERT INTO inventario (
            nombre, descripcion, categoria, cantidad_total, cantidad_disponible,
            ubicacion, estado, marca, modelo, condicion,
            numero_serie, color, nivel, observaciones, procedencia_entidad,
            documento_sustentatorio, fecha_documento, situacion_administrativa, situacion_detalle
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15,
            $16, $17, $18, $19
          ) RETURNING id`,
          [
            fila.nombre,
            fila.observaciones ? `[Obs: ${fila.observaciones}]` : null,
            fila.categoria || 'Equipos y Accesorios',
            totalCant,
            disponibleFinal,
            fila.ubicacion || 'Almacén General',
            estadoFinal,
            fila.marca || null,
            fila.modelo || null,
            condFisica,
            fila.numero_serie || null,
            fila.color || null,
            fila.nivel || null,
            fila.observaciones || null,
            fila.procedencia_entidad || null,
            fila.documento_sustentatorio || null,
            fila.fecha_documento || null,
            adminSit,
            fila.situacion_detalle || null,
          ]
        );

        const nuevoId = insertInvRes.rows[0].id;

        // Registrar movimiento de trazabilidad
        await client.query(
          `INSERT INTO movimientos_inventario (
            inventario_id, tipo_movimiento, cantidad, usuario_id, descripcion, fecha
          ) VALUES ($1, 'entrada', $2, $3, $4, CURRENT_TIMESTAMP)`,
          [nuevoId, totalCant, adminId, `Importación masiva UGEL: ${fileName} (Fila ${filaNum})`]
        );

        // Registrar detalle de auditoría
        await client.query(
          `INSERT INTO importaciones_inventario_detalle (
            importacion_id, fila_excel, numero_ugel, huella_registro,
            inventario_id, resultado, mensaje, datos
          ) VALUES ($1, $2, $3, $4, $5, 'insertado', 'Registrado correctamente.', $6)`,
          [importacionId, filaNum, numUgel, huella, nuevoId, JSON.stringify(fila)]
        );

        // Registrar en el mapa en memoria para detectar duplicados en filas subsiguientes del archivo
        if (serieNorm) {
          seriesExistentes.set(serieNorm, { id: nuevoId, nombre: fila.nombre });
        }

        insertados++;
        detalles.push({ fila: filaNum, resultado: 'insertado', inventario_id: nuevoId });
      }

      // 8. Actualizar totales maestros y confirmar transacción
      await client.query(
        `UPDATE importaciones_inventario
         SET insertados = $1, omitidos = $2, rechazados = $3, estado = 'completada'
         WHERE id = $4`,
        [insertados, omitidos, rechazados, importacionId]
      );

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        importacion_id: importacionId,
        nombre_archivo: fileName,
        total_procesadas: filas.length,
        insertados,
        omitidos,
        rechazados,
        detalles,
        mensaje: `Importación finalizada: ${insertados} registrados, ${omitidos} omitidos, ${rechazados} rechazados.`,
      });
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('Error durante la transacción de importación:', err);
      return NextResponse.json(
        { error: 'Ocurrió un error transaccional durante la importación. Se revirtieron todos los cambios.' },
        { status: 500 }
      );
    } finally {
      client.release();
    }
  } catch (outerErr: any) {
    console.error('Error general en POST /api/inventario/importar/confirmar:', outerErr);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud de confirmación.' },
      { status: 500 }
    );
  }
}
