import { NextRequest, NextResponse } from 'next/server';
import { getClient, query } from '@/app/lib/db';

// GET - Listar préstamos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');
    const profesor_id = searchParams.get('profesor_id');
    const desde = searchParams.get('desde');
    const hasta = searchParams.get('hasta');

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

    if (desde) {
      sql += ' AND p.fecha_prestamo >= $' + (params.length + 1);
      params.push(`${desde} 00:00:00`);
    }

    if (hasta) {
      sql += ' AND p.fecha_prestamo <= $' + (params.length + 1);
      params.push(`${hasta} 23:59:59`);
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
    const body = await request.json();
    const profesor_id = Number(body.profesor_id);
    const rawItems = body.articulos === undefined ? [body] : body.articulos;
    if (!Number.isSafeInteger(profesor_id) || profesor_id <= 0 || !Array.isArray(rawItems) || !rawItems.length) {
      return NextResponse.json({ error: 'Selecciona un profesor y al menos un artículo' }, { status: 400 });
    }
    const articulos: { inventario_id: number; cantidad: number; detalle: string }[] = [];
    for (const item of rawItems) {
      const id = Number(item?.inventario_id);
      const cantidad = Number(item?.cantidad ?? 1);
      if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(cantidad) || cantidad <= 0 ||
          (item?.detalle != null && typeof item.detalle !== 'string')) {
        return NextResponse.json({ error: 'Cada artículo debe tener un equipo y una cantidad entera mayor que cero' }, { status: 400 });
      }
      if (articulos.some(previous => previous.inventario_id === id)) {
        return NextResponse.json({ error: 'El artículo está repetido. Agrupa su cantidad en una sola fila.' }, { status: 400 });
      }
      articulos.push({ inventario_id: id, cantidad, detalle: item.detalle?.trim() || '' });
    }

    const client = await getClient();

    try {
      await client.query('BEGIN');

      const profesor = await client.query(
        "SELECT id, telefono FROM usuarios WHERE id = $1 AND role = 'profesor' AND activo = true",
        [profesor_id]
      );
      if (!profesor.rows.length) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Profesor no disponible' }, { status: 400 });
      }

      // Bloqueo en orden estable para entregas concurrentes con varios equipos.
      const stock = new Map<number, { nombre: string; cantidad_disponible: number }>();
      for (const articulo of [...articulos].sort((a, b) => a.inventario_id - b.inventario_id)) {
        const inventario = await client.query(
          'SELECT id, nombre, cantidad_disponible FROM inventario WHERE id = $1 AND estado = $2 FOR UPDATE',
          [articulo.inventario_id, 'disponible']
        );
        if (!inventario.rows.length) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: 'Uno de los equipos ya no está disponible' }, { status: 404 });
        }
        const item = inventario.rows[0];
        if (item.cantidad_disponible < articulo.cantidad) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: `${item.nombre}: solo hay ${item.cantidad_disponible} unidades disponibles` }, { status: 400 });
        }
        stock.set(articulo.inventario_id, item);
      }

      const prestamos = [];
      const detalles: string[] = [];
      for (const articulo of articulos) {
        const { inventario_id, cantidad, detalle } = articulo;
        const result = await client.query(
          `INSERT INTO prestamos (inventario_id, profesor_id, cantidad, detalle, estado)
           VALUES ($1, $2, $3, $4, 'prestado') RETURNING *`,
          [inventario_id, profesor_id, cantidad, detalle || null]
        );
        prestamos.push(result.rows[0]);
        await client.query(
          'UPDATE inventario SET cantidad_disponible = cantidad_disponible - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [cantidad, inventario_id]
        );
        await client.query(
          'INSERT INTO movimientos_inventario (inventario_id, tipo_movimiento, cantidad, usuario_id, descripcion) VALUES ($1, $2, $3, $4, $5)',
          [inventario_id, 'salida', cantidad, profesor_id, `Préstamo #${result.rows[0].id} a profesor`]
        );
        detalles.push(`#${result.rows[0].id}: ${stock.get(inventario_id)!.nombre}, ${cantidad} ${cantidad === 1 ? 'unidad' : 'unidades'}.${detalle ? ` Detalle: ${detalle}` : ''}`);
      }
      // Una sola notificación para toda la entrega, dentro de la misma transacción.
      const mensaje = `La administración registró a tu nombre ${prestamos.length === 1 ? 'el préstamo' : 'los préstamos'} ${detalles.join(' | ')}`;
      await client.query(
        `INSERT INTO notificaciones_whatsapp (usuario_id, numero_telefono, mensaje, tipo, referencia_id, estado)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [profesor_id, profesor.rows[0].telefono || '-', mensaje, 'prestamo_registrado', prestamos[0].id, 'pendiente']
      );

      await client.query('COMMIT');

      return NextResponse.json({
        message: prestamos.length === 1 ? 'Préstamo registrado' : 'Préstamos registrados correctamente',
        prestamo: prestamos[0],
        prestamos,
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
