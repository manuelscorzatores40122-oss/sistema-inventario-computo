import { NextRequest, NextResponse } from 'next/server';
import { getClient, query } from '@/app/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await query(
      `SELECT s.*,
              u.nombre as profesor_nombre,
              u.apellido,
              u.telefono,
              i.nombre as item_nombre,
              d.sala_nombre,
              d.dia_semana,
              d.hora_inicio,
              d.hora_fin
       FROM solicitudes s
       JOIN usuarios u ON s.profesor_id = u.id
       LEFT JOIN inventario i ON s.inventario_id = i.id
       LEFT JOIN disponibilidad d ON s.disponibilidad_id = d.id
       WHERE s.id = $1`,
      [params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Solicitud no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ solicitud: result.rows[0] });
  } catch (error) {
    console.error('Error al obtener solicitud:', error);
    return NextResponse.json(
      { error: 'Error al obtener solicitud' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar estado de solicitud (admin)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { estado, admin_id, comentarios, cantidad_solicitada, motivo } = await request.json();
    const cantidad = cantidad_solicitada === undefined || cantidad_solicitada === ''
      ? undefined
      : Number(cantidad_solicitada);

    if (estado && !['pendiente', 'aprobada', 'rechazada', 'cancelada'].includes(estado)) {
      return NextResponse.json(
        { error: 'Estado inválido' },
        { status: 400 }
      );
    }

    if (cantidad !== undefined && (!Number.isInteger(cantidad) || cantidad <= 0)) {
      return NextResponse.json(
        { error: 'Cantidad inválida' },
        { status: 400 }
      );
    }

    const client = await getClient();

    try {
      await client.query('BEGIN');

      const solicitud = await client.query(
        `SELECT s.*,
                u.telefono,
                i.nombre as item_nombre,
                i.cantidad_disponible,
                d.sala_nombre,
                d.dia_semana,
                d.hora_inicio,
                d.hora_fin,
                d.estado as disponibilidad_estado
         FROM solicitudes s
         JOIN usuarios u ON s.profesor_id = u.id
         LEFT JOIN inventario i ON s.inventario_id = i.id
         LEFT JOIN disponibilidad d ON s.disponibilidad_id = d.id
         WHERE s.id = $1
         FOR UPDATE`,
        [params.id]
      );

      if (solicitud.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Solicitud no encontrada' },
          { status: 404 }
        );
      }

      const sol = solicitud.rows[0];
      const nextEstado = estado || sol.estado;
      const nextCantidad = cantidad ?? sol.cantidad_solicitada;

      if (sol.estado !== 'pendiente' && nextEstado !== sol.estado) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Solo se puede cambiar el estado de solicitudes pendientes' },
          { status: 400 }
        );
      }

      if (nextEstado === 'aprobada') {
        if (!admin_id) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { error: 'admin_id requerido para aprobar' },
            { status: 400 }
          );
        }

        if (sol.inventario_id && sol.cantidad_disponible < nextCantidad) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { error: 'No hay suficiente stock disponible' },
            { status: 400 }
          );
        }

        if (sol.inventario_id) {
          await client.query(
            'UPDATE inventario SET cantidad_disponible = cantidad_disponible - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [nextCantidad, sol.inventario_id]
          );

          await client.query(
            'INSERT INTO movimientos_inventario (inventario_id, tipo_movimiento, cantidad, usuario_id, descripcion) VALUES ($1, $2, $3, $4, $5)',
            [sol.inventario_id, 'salida', nextCantidad, sol.profesor_id, `Solicitud #${sol.id} aprobada`]
          );
        }

        if (sol.disponibilidad_id) {
          if (sol.disponibilidad_estado !== 'disponible') {
            await client.query('ROLLBACK');
            return NextResponse.json(
              { error: 'El horario de sala ya no está disponible' },
              { status: 400 }
            );
          }

          await client.query(
            `UPDATE disponibilidad
             SET estado = 'separado',
                 reservado_por = $1,
                 motivo_reserva = $2,
                 fecha_reserva = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [sol.profesor_id, comentarios || sol.motivo || `Solicitud #${sol.id} aprobada`, sol.disponibilidad_id]
          );
        }
      }

      const result = await client.query(
        `UPDATE solicitudes
         SET cantidad_solicitada = $1,
             motivo = COALESCE($2, motivo),
             estado = $3,
             admin_aprueba_id = COALESCE($4, admin_aprueba_id),
             comentarios = COALESCE($5, comentarios),
             fecha_aprobacion = CASE WHEN $3 IN ('aprobada', 'rechazada') THEN CURRENT_TIMESTAMP ELSE fecha_aprobacion END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6
         RETURNING *`,
        [nextCantidad, motivo, nextEstado, admin_id, comentarios, params.id]
      );

      if (['aprobada', 'rechazada', 'cancelada'].includes(nextEstado) && sol.telefono) {
        await client.query(
          'INSERT INTO notificaciones_whatsapp (usuario_id, numero_telefono, mensaje, tipo, referencia_id, estado) VALUES ($1, $2, $3, $4, $5, $6)',
          [
            sol.profesor_id,
            sol.telefono,
            `Tu solicitud #${sol.id} ${sol.item_nombre ? `de ${nextCantidad} ${sol.item_nombre}` : ''}${sol.sala_nombre ? ` para ${sol.sala_nombre} ${sol.dia_semana} ${sol.hora_inicio}-${sol.hora_fin}` : ''} fue ${nextEstado}.`,
            `solicitud_${nextEstado}`,
            sol.id,
            'pendiente',
          ]
        );
      }

      await client.query('COMMIT');

      return NextResponse.json({
        message: 'Solicitud actualizada',
        solicitud: result.rows[0],
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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
