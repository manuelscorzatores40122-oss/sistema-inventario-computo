import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

// PUT - Actualizar estado de solicitud (admin)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { estado, admin_id, comentarios } = await request.json();

    if (!estado || !admin_id) {
      return NextResponse.json(
        { error: 'Estado y admin_id requeridos' },
        { status: 400 }
      );
    }

    // Obtener información de la solicitud
    const solicitud = await query(
      'SELECT * FROM solicitudes WHERE id = $1',
      [params.id]
    );

    if (solicitud.rows.length === 0) {
      return NextResponse.json(
        { error: 'Solicitud no encontrada' },
        { status: 404 }
      );
    }

    const sol = solicitud.rows[0];

    // Si es aprobada, actualizar inventario
    if (estado === 'aprobada') {
      await query(
        'UPDATE inventario SET cantidad_disponible = cantidad_disponible - $1 WHERE id = $2',
        [sol.cantidad_solicitada, sol.inventario_id]
      );

      // Registrar movimiento
      await query(
        'INSERT INTO movimientos_inventario (inventario_id, tipo_movimiento, cantidad, usuario_id, descripcion) VALUES ($1, $2, $3, $4, $5)',
        [sol.inventario_id, 'salida', sol.cantidad_solicitada, sol.profesor_id, `Solicitud #${sol.id} aprobada`]
      );
    }

    const result = await query(
      'UPDATE solicitudes SET estado = $1, admin_aprueba_id = $2, comentarios = $3, fecha_aprobacion = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [estado, admin_id, comentarios, params.id]
    );

    // TODO: Enviar notificación WhatsApp al profesor

    return NextResponse.json({
      message: 'Solicitud actualizada',
      solicitud: result.rows[0],
    });
  } catch (error) {
    console.error('Error al actualizar solicitud:', error);
    return NextResponse.json(
      { error: 'Error al actualizar solicitud' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar solicitud
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await query(
      'DELETE FROM solicitudes WHERE id = $1 RETURNING id',
      [params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Solicitud no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Solicitud eliminada' });
  } catch (error) {
    console.error('Error al eliminar solicitud:', error);
    return NextResponse.json(
      { error: 'Error al eliminar solicitud' },
      { status: 500 }
    );
  }
}
