import { NextRequest, NextResponse } from 'next/server';
import { getClient, query } from '@/app/lib/db';

// GET - Listar préstamos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');
    const profesor_id = searchParams.get('profesor_id');

    let sql = `SELECT p.*,
                      i.nombre as item_nombre,
                      i.categoria,
                      u.nombre as profesor_nombre,
                      u.apellido
               FROM prestamos p
               JOIN inventario i ON p.inventario_id = i.id
               JOIN usuarios u ON p.profesor_id = u.id
               WHERE 1=1`;
    const params: any[] = [];

    if (estado) {
      sql += ' AND p.estado = $' + (params.length + 1);
      params.push(estado);
    }

    if (profesor_id) {
      sql += ' AND p.profesor_id = $' + (params.length + 1);
      params.push(profesor_id);
    }

    sql += ' ORDER BY p.fecha_prestamo DESC';

    const result = await query(sql, params);

    return NextResponse.json({
      prestamos: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('Error al obtener préstamos:', error);
    return NextResponse.json(
      { error: 'Error al obtener préstamos' },
      { status: 500 }
    );
  }
}

// POST - Registrar préstamo de equipo a un profesor
export async function POST(request: NextRequest) {
  try {
    const { inventario_id, profesor_id, cantidad, detalle } = await request.json();
    const cantidadNum = Number(cantidad || 1);

    if (!inventario_id || !profesor_id || !Number.isInteger(cantidadNum) || cantidadNum <= 0) {
      return NextResponse.json(
        { error: 'Selecciona un equipo, un profesor y una cantidad válida' },
        { status: 400 }
      );
    }

    const client = await getClient();

    try {
      await client.query('BEGIN');

      const inventario = await client.query(
        'SELECT id, nombre, cantidad_disponible FROM inventario WHERE id = $1 AND estado = $2 FOR UPDATE',
        [inventario_id, 'disponible']
      );

      if (inventario.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Equipo no disponible' },
          { status: 404 }
        );
      }

      if (inventario.rows[0].cantidad_disponible < cantidadNum) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: `Solo hay ${inventario.rows[0].cantidad_disponible} unidades disponibles` },
          { status: 400 }
        );
      }

      const result = await client.query(
        `INSERT INTO prestamos (inventario_id, profesor_id, cantidad, detalle, estado)
         VALUES ($1, $2, $3, $4, 'prestado')
         RETURNING *`,
        [inventario_id, profesor_id, cantidadNum, detalle || null]
      );

      await client.query(
        'UPDATE inventario SET cantidad_disponible = cantidad_disponible - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [cantidadNum, inventario_id]
      );

      await client.query(
        'INSERT INTO movimientos_inventario (inventario_id, tipo_movimiento, cantidad, usuario_id, descripcion) VALUES ($1, $2, $3, $4, $5)',
        [inventario_id, 'salida', cantidadNum, profesor_id, `Préstamo #${result.rows[0].id} a profesor`]
      );

      await client.query('COMMIT');

      return NextResponse.json({
        message: 'Préstamo registrado, el equipo queda en estado Prestado',
        prestamo: result.rows[0],
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error al registrar préstamo:', error);
    return NextResponse.json(
      { error: 'Error al registrar préstamo' },
      { status: 500 }
    );
  }
}