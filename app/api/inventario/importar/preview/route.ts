import { NextRequest, NextResponse } from 'next/server';
import { parseUgelExcel } from '@/app/lib/excelUgelParser';
import { query } from '@/app/lib/db';
import { requireAdminSession } from '@/app/lib/auth';
import crypto from 'crypto';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export async function POST(request: NextRequest) {
  try {
    // 1. Autorización estricta: Solo administradores activos
    const auth = await requireAdminSession(request);
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No se envió ningún archivo para importar.' },
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

    // 2. Parsear el archivo con el analizador UGEL
    let parsedResult;
    try {
      parsedResult = parseUgelExcel(buffer, fileName);
    } catch (parseErr: any) {
      return NextResponse.json(
        { error: parseErr.message || 'Error al procesar el archivo Excel.' },
        { status: 422 }
      );
    }

    // 2. Comprobar si el archivo ya fue importado con anterioridad
    const hashCheck = await query(
      `SELECT id, nombre_archivo, total_filas, insertados, estado, fecha_importacion
       FROM importaciones_inventario
       WHERE archivo_hash = $1 AND estado = 'completada'
       ORDER BY fecha_importacion DESC
       LIMIT 1`,
      [parsedResult.archivo_hash]
    );

    const importacionPrevia = hashCheck.rows[0] || null;
    const archivoYaImportado = Boolean(importacionPrevia);

    // 3. Obtener todas las series válidas del archivo para chequear colisiones en la BD
    const seriesValidas = Array.from(
      new Set(
        parsedResult.filas
          .filter(f => f.serie_es_valida && f.numero_serie)
          .map(f => f.numero_serie!.toUpperCase())
      )
    );

    const duplicadosBDMap = new Map<string, { id: number; nombre: string; estado: string }>();

    if (seriesValidas.length > 0) {
      const dbCheck = await query(
        `SELECT id, nombre, UPPER(numero_serie) as serie_norm, estado
         FROM inventario
         WHERE numero_serie IS NOT NULL AND UPPER(numero_serie) = ANY($1)`,
        [seriesValidas]
      );

      for (const row of dbCheck.rows) {
        duplicadosBDMap.set(row.serie_norm, {
          id: row.id,
          nombre: row.nombre,
          estado: row.estado,
        });
      }
    }

    // 4. Anotar las filas con información de colisión en BD
    let totalDuplicadosBD = 0;
    const filasAnotadas = parsedResult.filas.map(fila => {
      if (fila.serie_es_valida && fila.numero_serie) {
        const serieKey = fila.numero_serie.toUpperCase();
        const bdMatch = duplicadosBDMap.get(serieKey);
        if (bdMatch) {
          totalDuplicadosBD++;
          return {
            ...fila,
            es_duplicado_bd: true,
            duplicado_con_id: bdMatch.id,
            duplicado_razon: `Coincide con bien existente en BD: "${bdMatch.nombre}" (ID #${bdMatch.id})`,
            advertencias: [
              ...fila.advertencias,
              `Número de serie ya registrado en base de datos (ID #${bdMatch.id} - ${bdMatch.nombre}).`,
            ],
          };
        }
      }
      return fila;
    });

    return NextResponse.json({
      success: true,
      resumen: {
        nombre_archivo: parsedResult.nombre_archivo,
        archivo_hash: parsedResult.archivo_hash,
        tamano_bytes: parsedResult.tamano_bytes,
        hoja: parsedResult.hoja,
        filas_leidas: parsedResult.filas_leidas,
        total_validas: parsedResult.total_validas,
        total_advertencias: parsedResult.total_advertencias,
        total_errores: parsedResult.total_errores,
        total_bajas: parsedResult.total_bajas,
        total_duplicados_internos: parsedResult.total_duplicados,
        total_duplicados_bd: totalDuplicadosBD,
        archivo_ya_importado: archivoYaImportado,
        importacion_previa: importacionPrevia,
      },
      filas: filasAnotadas,
    });
  } catch (error: any) {
    console.error('Error en /api/inventario/importar/preview:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno al analizar el archivo Excel.' },
      { status: 500 }
    );
  }
}
