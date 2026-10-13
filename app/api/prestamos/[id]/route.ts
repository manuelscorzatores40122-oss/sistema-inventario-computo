import { NextRequest, NextResponse } from 'next/server';
import { getClient, query } from '@/app/lib/db';

// PUT - Actualizar estado de préstamo (entregar, devolver con observaciones o cancelar)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `SELECT p.*, i.cantidad_disponible, i.nombre as item_nombre
         FROM prestamos p
         JOIN inventario i ON p.inventario_id = i.id
         WHERE p.id = $1
         FOR UPDATE OF p, i`,
        [params.id]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Préstamo no encontrado' },
          { status: 404 }
        );
      }

      const prestamo = result.rows[0];
      const body = await request.json().catch(() => ({}));
      const nuevoEstado = body.estado || 'devuelto';
      const observacion = body.devolucion_observacion || body.observacion || null;
      const estadoFisico = body.devolucion_estado || 'bueno';

      if (prestamo.estado === 'devuelto') {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Este préstamo ya fue marcado como devuelto' },
          { status: 400 }
        );
      }

      if (prestamo.estado === 'cancelado') {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Este préstamo ya fue cancelado' },
          { status: 400 }
        );
      }

      // 1. Entregar equipo (pendiente -> prestado)
      if (nuevoEstado === 'prestado') {
        if (prestamo.estado === 'prestado') {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { error: 'El equipo ya fue entregado al profesor' },
            { status: 400 }
          );
        }
        await client.query(
          `UPDATE prestamos
           SET estado = 'prestado',
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [params.id]
        );
        await client.query('COMMIT');
        return NextResponse.json({
          message: 'Equipo entregado al profesor exitosamente',
        });
      }

      // 2. Cancelar préstamo pendiente (reponiendo stock)
      if (nuevoEstado === 'cancelado') {
        // Restaurar stock descontado
        await client.query(
          'UPDATE inventario SET cantidad_disponible = cantidad_disponible + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [prestamo.cantidad, prestamo.inventario_id]
        );

        await client.query(
          'INSERT INTO movimientos_inventario (inventario_id, tipo_movimiento, cantidad, usuario_id, descripcion) VALUES ($1, $2, $3, $4, $5)',
          [prestamo.inventario_id, 'entrada', prestamo.cantidad, prestamo.profesor_id, `Cancelación de préstamo #${prestamo.id} (${prestamo.item_nombre})`]
        );

        await client.query(
          `UPDATE prestamos
           SET estado = 'cancelado',
               devolucion_observacion = COALESCE($2, 'Préstamo cancelado sin retiro de equipo'),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [params.id, observacion]
        );

        await client.query('COMMIT');
        return NextResponse.json({
          message: 'Préstamo cancelado y stock restablecido al inventario',
        });
      }

      // 3. Devolución de equipo (prestado o pendiente -> devuelto)
      await client.query(
        `UPDATE prestamos
         SET estado = 'devuelto',
             fecha_devolucion = CURRENT_TIMESTAMP,
             devolucion_observacion = $2,
             devolucion_estado = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [params.id, observacion, estadoFisico]
      );

      // Reponer stock
      await client.query(
        'UPDATE inventario SET cantidad_disponible = cantidad_disponible + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [prestamo.cantidad, prestamo.inventario_id]
      );

      await client.query(
        'INSERT INTO movimientos_inventario (inventario_id, tipo_movimiento, cantidad, usuario_id, descripcion) VALUES ($1, $2, $3, $4, $5)',
        [prestamo.inventario_id, 'entrada', prestamo.cantidad, prestamo.profesor_id, `Devolución de préstamo #${prestamo.id}${observacion ? ` - Nota: ${observacion}` : ''}`]
      );

      await client.query('COMMIT');

      return NextResponse.json({
        message: 'Equipo devuelto al inventario con éxito',
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error al actualizar préstamo:', error);
    return NextResponse.json(
      { error: 'Error al actualizar estado del préstamo' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar préstamo (solo registros finalizados: devueltos o cancelados)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await query(
      'SELECT estado FROM prestamos WHERE id = $1',
      [params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Préstamo no encontrado' },
        { status: 404 }
      );
    }

    if (result.rows[0].estado === 'prestado' || result.rows[0].estado === 'pendiente') {
      return NextResponse.json(
        { error: 'No se puede eliminar un préstamo activo o pendiente. Debes marcarlo como Devuelto o Cancelarlo para no perder stock.' },
        { status: 400 }
      );
    }

    await query('DELETE FROM prestamos WHERE id = $1', [params.id]);

    return NextResponse.json({ message: 'Registro de préstamo eliminado' });
  } catch (error) {
    console.error('Error al eliminar préstamo:', error);
    return NextResponse.json(
      { error: 'Error al eliminar préstamo' },
      { status: 500 }
    );
  }
}