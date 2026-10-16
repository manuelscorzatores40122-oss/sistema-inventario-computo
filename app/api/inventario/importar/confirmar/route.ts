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
      const auditDetallesToInsert: Array<{
        fila_excel: number;
        numero_ugel: string;
        huella_registro: string;
        resultado: string;
        mensaje: string;
        datos: string;
      }> = [];

      type ItemParaInsertar = {
        filaNum: number;
        numUgel: string;
        huella: string;
        filaRaw: any;
        nombre: string;
        descripcion: string | null;
        categoria: string;
        totalCant: number;
        disponibleFinal: number;
        ubicacion: string;
        estadoFinal: string;
        marca: string | null;
        modelo: string | null;
        condFisica: string;
        numero_serie: string | null;
        color: string | null;
        nivel: string | null;
        observaciones: string | null;
        procedencia_entidad: string | null;
        documento_sustentatorio: string | null;
        fecha_documento: string | null;
        adminSit: string;
        situacion_detalle: string | null;
      };

      const validItems: ItemParaInsertar[] = [];

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

          auditDetallesToInsert.push({
            fila_excel: filaNum,
            numero_ugel: numUgel,
            huella_registro: huella,
            resultado: 'rechazado',
            mensaje: msg,
            datos: JSON.stringify(fila),
          });
          detalles.push({ fila: filaNum, resultado: 'rechazado', motivo: msg });
          continue;
        }

        // Comprobar colisión por número de serie en BD o filas previas del mismo archivo
        const serieNorm = fila.serie_es_valida && fila.numero_serie ? fila.numero_serie.toUpperCase() : null;
        if (serieNorm && seriesExistentes.has(serieNorm)) {
          if (omitirDuplicados) {
            omitidos++;
            const match = seriesExistentes.get(serieNorm)!;
            const msg = `Omitido por serie duplicada con ítem #${match.id} (${match.nombre})`;
            auditDetallesToInsert.push({
              fila_excel: filaNum,
              numero_ugel: numUgel,
              huella_registro: huella,
              resultado: 'omitido',
              mensaje: msg,
              datos: JSON.stringify(fila),
            });
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

        // Anotar en mapa para colisiones internas en el mismo archivo
        if (serieNorm) {
          seriesExistentes.set(serieNorm, { id: 0, nombre: fila.nombre });
        }

        validItems.push({
          filaNum,
          numUgel,
          huella,
          filaRaw: fila,
          nombre: fila.nombre,
          descripcion: fila.observaciones ? `[Obs: ${fila.observaciones}]` : null,
          categoria: fila.categoria || 'Equipos y Accesorios',
          totalCant,
          disponibleFinal,
          ubicacion: fila.ubicacion || 'Almacén General',
          estadoFinal,
          marca: fila.marca || null,
          modelo: fila.modelo || null,
          condFisica,
          numero_serie: fila.numero_serie || null,
          color: fila.color || null,
          nivel: fila.nivel || null,
          observaciones: fila.observaciones || null,
          procedencia_entidad: fila.procedencia_entidad || null,
          documento_sustentatorio: fila.documento_sustentatorio || null,
          fecha_documento: fila.fecha_documento || null,
          adminSit,
          situacion_detalle: fila.situacion_detalle || null,
        });
      }

      // Inserción en lotes de auditoría de filas omitidas/rechazadas (lotes de 100)
      const AUDIT_BATCH_SIZE = 100;
      for (let i = 0; i < auditDetallesToInsert.length; i += AUDIT_BATCH_SIZE) {
        const batch = auditDetallesToInsert.slice(i, i + AUDIT_BATCH_SIZE);
        const placeholders: string[] = [];
        const params: any[] = [];
        batch.forEach((item, idx) => {
          const offset = idx * 6;
          placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`);
          params.push(importacionId, item.fila_excel, item.numero_ugel, item.huella_registro, item.resultado, item.mensaje);
        });
        await client.query(
          `INSERT INTO importaciones_inventario_detalle (
            importacion_id, fila_excel, numero_ugel, huella_registro, resultado, mensaje
          ) VALUES ${placeholders.join(', ')}`,
          params
        );
      }

      // Inserción de artículos válidos en lotes de alto rendimiento (75 filas por query para ultra-velocidad)
      const INSERT_BATCH_SIZE = 75;
      for (let i = 0; i < validItems.length; i += INSERT_BATCH_SIZE) {
        const batch = validItems.slice(i, i + INSERT_BATCH_SIZE);

        // 1. Lote de INVENTARIO
        const invPlaceholders: string[] = [];
        const invParams: any[] = [];
        batch.forEach((item, idx) => {
          const offset = idx * 19;
          invPlaceholders.push(`(
            $${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5},
            $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10},
            $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15},
            $${offset + 16}, $${offset + 17}, $${offset + 18}, $${offset + 19}
          )`);
          invParams.push(
            item.nombre,
            item.descripcion,
            item.categoria,
            item.totalCant,
            item.disponibleFinal,
            item.ubicacion,
            item.estadoFinal,
            item.marca,
            item.modelo,
            item.condFisica,
            item.numero_serie,
            item.color,
            item.nivel,
            item.observaciones,
            item.procedencia_entidad,
            item.documento_sustentatorio,
            item.fecha_documento,
            item.adminSit,
            item.situacion_detalle
          );
        });

        const insertInvRes = await client.query(
          `INSERT INTO inventario (
            nombre, descripcion, categoria, cantidad_total, cantidad_disponible,
            ubicacion, estado, marca, modelo, condicion,
            numero_serie, color, nivel, observaciones, procedencia_entidad,
            documento_sustentatorio, fecha_documento, situacion_administrativa, situacion_detalle
          ) VALUES ${invPlaceholders.join(', ')} RETURNING id`,
          invParams
        );

        // 2. Lote de MOVIMIENTOS y DETALLES asociados
        const movPlaceholders: string[] = [];
        const movParams: any[] = [];
        const detPlaceholders: string[] = [];
        const detParams: any[] = [];

        batch.forEach((item, idx) => {
          const nuevoId = insertInvRes.rows[idx].id;
          const movOffset = idx * 4;
          movPlaceholders.push(`($${movOffset + 1}, 'entrada', $${movOffset + 2}, $${movOffset + 3}, $${movOffset + 4}, CURRENT_TIMESTAMP)`);
          movParams.push(nuevoId, item.totalCant, adminId, `Importación masiva UGEL: ${fileName} (Fila ${item.filaNum})`);

          const detOffset = idx * 6;
          detPlaceholders.push(`($${detOffset + 1}, $${detOffset + 2}, $${detOffset + 3}, $${detOffset + 4}, $${detOffset + 5}, 'insertado', 'Registrado correctamente.', $${detOffset + 6})`);
          detParams.push(importacionId, item.filaNum, item.numUgel, item.huella, nuevoId, JSON.stringify(item.filaRaw));

          insertados++;
          detalles.push({ fila: item.filaNum, resultado: 'insertado', inventario_id: nuevoId });
        });

        await client.query(
          `INSERT INTO movimientos_inventario (
            inventario_id, tipo_movimiento, cantidad, usuario_id, descripcion, fecha
          ) VALUES ${movPlaceholders.join(', ')}`,
          movParams
        );

        await client.query(
          `INSERT INTO importaciones_inventario_detalle (
            importacion_id, fila_excel, numero_ugel, huella_registro,
            inventario_id, resultado, mensaje, datos
          ) VALUES ${detPlaceholders.join(', ')}`,
          detParams
        );
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
