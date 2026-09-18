import { NextRequest, NextResponse } from 'next/server';
import { getClient, query } from '@/app/lib/db';

// PUT - Marcar préstamo como Entregado (devolución)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `SELECT p.*, i.cantidad_disponible
         FROM prestamos p
         JOIN inventario i ON p.inventario_id = i.id
         WHERE p.id = $1
         FOR UPDATE`,
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

      if (prestamo.estado === 'devuelto') {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Este préstamo ya fue entregado' },
          { status: 400 }
        );
      }

      await client.query(
        `UPDATE prestamos
         SET estado = 'devuelto',
             fecha_devolucion = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [params.id]
      );

      await client.query(
        'UPDATE inventario SET cantidad_disponible = cantidad_disponible + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [prestamo.cantidad, prestamo.inventario_id]
      );

      await client.query(
        'INSERT INTO movimientos_inventario (inventario_id, tipo_movimiento, cantidad, usuario_id, descripcion) VALUES ($1, $2, $3, $4, $5)',
        [prestamo.inventario_id, 'entrada', prestamo.cantidad, prestamo.profesor_id, `Devolución de préstamo #${prestamo.id}`]
      );

      await client.query('COMMIT');

      return NextResponse.json({
        message: 'Equipo entregado y devuelto al inventario',
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error al marcar préstamo como entregado:', error);
    return NextResponse.json(
      { error: 'Error al marcar préstamo como entregado' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar préstamo (solo histórico devuelto)
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

    if (result.rows[0].estado === 'prestado') {
      return NextResponse.json(
        { error: 'No se puede eliminar un préstamo activo; márcalo como Entregado primero' },
        { status: 400 }
      );
    }

    await query('DELETE FROM prestamos WHERE id = $1', [params.id]);

    return NextResponse.json({ message: 'Préstamo eliminado' });
  } catch (error) {
    console.error('Error al eliminar préstamo:', error);
    return NextResponse.json(
      { error: 'Error al eliminar préstamo' },
      { status: 500 }
    );
  }
}