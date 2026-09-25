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
              i.nombre as item_nombre
       FROM solicitudes s
       JOIN usuarios u ON s.profesor_id = u.id
       LEFT JOIN inventario i ON s.inventario_id = i.id
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
    const { estado, admin_id: bodyAdminId, comentarios, cantidad_solicitada, motivo } = await request.json();
    
    // Extraer admin_id del token por seguridad si no viene en el body
    let admin_id = bodyAdminId;
    const authToken = request.cookies.get('auth-token')?.value;
    if (authToken && !admin_id) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(authToken, process.env.JWT_SECRET || 'tu_secreto_jwt_cambiar') as any;
        if (decoded && decoded.userId) {
          admin_id = decoded.userId;
        }
      } catch (e) {
        console.error("Error validando token en solicitudes:", e);
      }
    }
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

        if (sol.inventario_id) {
          if (sol.cantidad_disponible < nextCantidad) {
            await client.query('ROLLBACK');
            return NextResponse.json(
              { error: 'No hay suficiente stock para aprobar la solicitud' },
              { status: 400 }
            );
          }

          await client.query(
            'UPDATE inventario SET cantidad_disponible = cantidad_disponible - $1 WHERE id = $2',
            [nextCantidad, sol.inventario_id]
          );

          await client.query(
            'INSERT INTO movimientos_inventario (inventario_id, tipo_movimiento, cantidad, usuario_id, descripcion) VALUES ($1, $2, $3, $4, $5)',
            [sol.inventario_id, 'salida', nextCantidad, admin_id, `Aprobación de solicitud #${params.id}`]
          );

          await client.query(
            `INSERT INTO prestamos (inventario_id, profesor_id, cantidad, detalle, estado)
             VALUES ($1, $2, $3, $4, 'pendiente')`,
            [sol.inventario_id, sol.profesor_id, nextCantidad, `Generado desde solicitud #${params.id}`]
          );
        } else if (sol.disponibilidad_id) {
          // Aula request approved
          await client.query(
            "UPDATE disponibilidad SET estado = 'separado' WHERE id = $1",
            [sol.disponibilidad_id]
          );
        }
      } else if (nextEstado === 'rechazada' || nextEstado === 'cancelada') {
        // If it was an aula request, and it's rejected/canceled, remove the pending availability
        if (sol.disponibilidad_id) {
          await client.query(
            "DELETE FROM disponibilidad WHERE id = $1 AND estado = 'pendiente'",
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

      if (['aprobada', 'rechazada', 'cancelada'].includes(nextEstado)) {
        const itemType = sol.item_nombre ? 'equipo' : 'salon';
        const itemName = sol.item_nombre || 'Aula de Cómputo';
        const msgEstado = nextEstado === 'aprobada' ? 'aprobado' : (nextEstado === 'rechazada' ? 'desaprobado' : 'cancelado');
        
        let mensaje = `Solicitud del ${itemType} (${itemName}) ${msgEstado}`;
        if (comentarios && comentarios.trim() !== '') {
          mensaje += ` - Motivo/Nota: ${comentarios}`;
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
      { error: error.message, stack: error.stack },
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
