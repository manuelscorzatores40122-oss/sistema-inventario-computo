import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import { requireAdminSession } from '@/app/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Autorización estricta: Solo administradores activos
    const auth = await requireAdminSession(request);
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const maestro = await query(
        `SELECT i.*, u.nombre as admin_nombre, u.apellido as admin_apellido, u.email as admin_email
         FROM importaciones_inventario i
         LEFT JOIN usuarios u ON u.id = i.admin_id
         WHERE i.id = $1`,
        [id]
      );

      if (maestro.rows.length === 0) {
        return NextResponse.json({ error: 'Importación no encontrada' }, { status: 404 });
      }

      const detalles = await query(
        `SELECT d.*, inv.nombre as bien_nombre, inv.codigo_patrimonial
         FROM importaciones_inventario_detalle d
         LEFT JOIN inventario inv ON inv.id = d.inventario_id
         WHERE d.importacion_id = $1
         ORDER BY d.fila_excel ASC`,
        [id]
      );

      return NextResponse.json({
        importacion: maestro.rows[0],
        detalles: detalles.rows,
      });
    }

    const historial = await query(
      `SELECT i.id, i.nombre_archivo, i.archivo_hash, i.tamano_bytes, i.hoja,
              i.total_filas, i.insertados, i.actualizados, i.omitidos, i.rechazados,
              i.estado, i.mensaje_error, i.fecha_importacion,
              u.nombre as admin_nombre, u.apellido as admin_apellido
       FROM importaciones_inventario i
       LEFT JOIN usuarios u ON u.id = i.admin_id
       ORDER BY i.fecha_importacion DESC
       LIMIT 50`
    );

    return NextResponse.json({
      historial: historial.rows,
      total: historial.rows.length,
    });
  } catch (error: any) {
    console.error('Error al consultar historial de importaciones:', error);
    return NextResponse.json(
      { error: 'Error al consultar historial de importaciones' },
      { status: 500 }
    );
  }
}
