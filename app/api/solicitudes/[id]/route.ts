import { requireSession } from '@/app/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { getClient, query } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/auth';
import { timeLabel } from '@/app/lib/time-label';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession(request);
    if (session.response) return session.response;
    const result = await query(
      `SELECT s.*,
              u.nombre as profesor_nombre,
              u.apellido,
              u.telefono,
              COALESCE(i.nombre, 'Aula de Cómputo (' || d.dia_semana || ' ' || TO_CHAR(d.fecha_reserva, 'DD/MM/YYYY') || ' ' || d.hora_inicio || '-' || d.hora_fin || ')') as item_nombre
       FROM solicitudes s
       JOIN usuarios u ON s.profesor_id = u.id
       LEFT JOIN inventario i ON s.inventario_id = i.id
       LEFT JOIN disponibilidad d ON s.disponibilidad_id = d.id
       WHERE s.id = $1 AND ($2::boolean OR s.profesor_id = $3)`,
      [params.id, session.user.role === 'admin', session.user.id]
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
    const session = await requireSession(request, true);
    if (session.response) return session.response;
    const { estado, comentarios, cantidad_solicitada, motivo } = await request.json();
    
    const admin_id = session.user.id;
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
      // Same lock order as calendar edits and cancellations: calendar, then rows.
      await client.query('SELECT pg_advisory_xact_lock(3011, 1)');

      const solicitud = await client.query(
        `SELECT s.*,
                u.telefono,
                i.nombre as item_nombre,
                i.cantidad_disponible
         FROM solicitudes s
         JOIN usuarios u ON s.profesor_id = u.id
         LEFT JOIN inventario i ON s.inventario_id = i.id
         WHERE s.id = $1
         FOR UPDATE OF s`,
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

      if (sol.estado !== 'pendiente') {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Esta solicitud ya fue procesada. Actualiza la lista para ver su estado.' },
          { status: 409 }
        );
      }

      if (sol.estado === 'pendiente' && nextEstado === 'aprobada') {
        if (!admin_id) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { error: 'admin_id requerido para aprobar' },
            { status: 400 }
          );
        }

        if (sol.inventario_id) {
          if (sol.cantidad_disponible < nextCantidad) {
            await client.query('ROLLBACK');
            return NextResponse.json(
              { error: 'No hay suficiente stock para aprobar la solicitud' },
              { status: 400 }
            );
          }

          const stockUpdate = await client.query(
            `UPDATE inventario SET cantidad_disponible = cantidad_disponible - $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2 AND cantidad_disponible >= $1 AND estado = 'disponible' RETURNING id`,
            [nextCantidad, sol.inventario_id]
          );
          if (!stockUpdate.rows.length) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: 'El stock cambió o el equipo ya no está disponible. Actualiza la lista.' }, { status: 409 });
          }

          await client.query(
            'INSERT INTO movimientos_inventario (inventario_id, tipo_movimiento, cantidad, usuario_id, descripcion) VALUES ($1, $2, $3, $4, $5)',
            [sol.inventario_id, 'salida', nextCantidad, admin_id, `Aprobación de solicitud #${params.id}`]
          );

          await client.query(
            `INSERT INTO prestamos (inventario_id, profesor_id, cantidad, detalle, estado, solicitud_id)
             VALUES ($1, $2, $3, $4, 'pendiente', $5)`,
            [sol.inventario_id, sol.profesor_id, nextCantidad, `Generado desde solicitud #${params.id}`, params.id]
          );
        } else if (sol.disponibilidad_id) {
          const reservation = await client.query(
            'SELECT * FROM disponibilidad WHERE id = $1 FOR UPDATE', [sol.disponibilidad_id]
          );
          const slot = reservation.rows[0];
          if (!slot || slot.estado !== 'pendiente' || slot.reservado_por !== sol.profesor_id) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: 'La reserva cambió o ya no está disponible. Actualiza las solicitudes.' }, { status: 409 });
          }
          const conflict = await client.query(
            `SELECT id, hora_inicio, hora_fin FROM disponibilidad
             WHERE id <> $1 AND estado IN ('separado', 'pendiente')
             AND ((fecha_reserva IS NULL AND dia_semana = $2) OR fecha_reserva::date = $3::date)
             AND hora_inicio < $5 AND hora_fin > $4
             ORDER BY hora_inicio LIMIT 1`,
            [slot.id, slot.dia_semana, slot.fecha_reserva, slot.hora_inicio, slot.hora_fin]
          );
          if (conflict.rows.length) {
            const occupied = conflict.rows[0];
            await client.query('ROLLBACK');
            return NextResponse.json({ error: `No se puede aprobar: el aula está ocupada de ${timeLabel(occupied.hora_inicio)} a ${timeLabel(occupied.hora_fin)}. Revisa el calendario y solicita otro horario.` }, { status: 409 });
          }
          await client.query(
            "UPDATE disponibilidad SET estado = 'separado', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
            [sol.disponibilidad_id]
          );
        }
      } else if (nextEstado === 'rechazada' || nextEstado === 'cancelada') {
        // If it was an aula request, and it's rejected/canceled, remove the pending availability
        if (sol.disponibilidad_id) {
          await client.query(
            "UPDATE disponibilidad SET estado = 'disponible', reservado_por = NULL, motivo_reserva = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND estado = 'pendiente'",
            [sol.disponibilidad_id]
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
             fecha_aprobacion = CASE WHEN $7::boolean THEN CURRENT_TIMESTAMP ELSE fecha_aprobacion END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6
         RETURNING *`,
        [nextCantidad, motivo, nextEstado, admin_id, comentarios, params.id, ['aprobada', 'rechazada'].includes(nextEstado)]
      );

      if (sol.estado === 'pendiente' && ['aprobada', 'rechazada', 'cancelada'].includes(nextEstado)) {
        const itemType = sol.item_nombre ? 'equipo' : 'salon';
        const itemName = sol.item_nombre || 'Aula de Cómputo';
        const msgEstado = nextEstado === 'aprobada' ? 'aprobado' : (nextEstado === 'rechazada' ? 'desaprobado' : 'cancelado');
        
        let mensaje = `Tu solicitud #${sol.id} del ${itemType} (${itemName}) fue ${msgEstado}.`;
        if (sol.motivo?.trim()) mensaje += ` Tu mensaje: ${sol.motivo.trim()}.`;
        if (comentarios && comentarios.trim() !== '') {
          mensaje += ` Respuesta de administración: ${comentarios.trim()}`;
        }

        const telefonoParaNotif = sol.telefono || '-';

        await client.query(
          'INSERT INTO notificaciones_whatsapp (usuario_id, numero_telefono, mensaje, tipo, referencia_id, estado) VALUES ($1, $2, $3, $4, $5, $6)',
          [
            sol.profesor_id,
            telefonoParaNotif,
            mensaje,
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
  } catch (error: any) {
    console.error('Error al actualizar solicitud:', error);
    return NextResponse.json(
      { error: 'No se pudo actualizar la solicitud. Intenta nuevamente.' },
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
    const session = await requireSession(request, true);
    if (session.response) return session.response;
    const result = await query(
      "DELETE FROM solicitudes WHERE id = $1 AND estado IN ('rechazada', 'cancelada') RETURNING id",
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
