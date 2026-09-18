import { NextRequest, NextResponse } from 'next/server';
import { getClient, query } from '@/app/lib/db';

// GET - Listar solicitudes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');
    const profesor_id = searchParams.get('profesor_id');

    let sql = `SELECT s.*,
                      u.nombre as profesor_nombre,
                      u.apellido,
                      i.nombre as item_nombre
               FROM solicitudes s
               JOIN usuarios u ON s.profesor_id = u.id
               LEFT JOIN inventario i ON s.inventario_id = i.id
               WHERE 1=1`;
    const params: any[] = [];

    if (estado) {
      sql += ' AND s.estado = $' + (params.length + 1);
      params.push(estado);
    }

    if (profesor_id) {
      sql += ' AND s.profesor_id = $' + (params.length + 1);
      params.push(profesor_id);
    }

    sql += ' ORDER BY s.fecha_solicitud DESC';

    const result = await query(sql, params);

    return NextResponse.json({
      solicitudes: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    return NextResponse.json(
      { error: 'Error al obtener solicitudes' },
      { status: 500 }
    );
  }
}

// POST - Crear solicitud (profesor)
export async function POST(request: NextRequest) {
  try {
    const { profesor_id, inventario_id, cantidad_solicitada, motivo } = await request.json();
    const cantidad = inventario_id ? Number(cantidad_solicitada || 1) : 1;

    if (!profesor_id || !inventario_id || !Number.isInteger(cantidad) || cantidad <= 0) {
      return NextResponse.json(
        { error: 'Selecciona un artículo de inventario válido' },
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
          { error: 'Artículo no disponible' },
          { status: 404 }
        );
      }

      if (inventario.rows[0].cantidad_disponible < cantidad) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'No hay suficiente stock disponible' },
          { status: 400 }
        );
      }

      const itemNombre = `${cantidad} ${inventario.rows[0].nombre}`;

      const result = await client.query(
        'INSERT INTO solicitudes (profesor_id, inventario_id, cantidad_solicitada, motivo) VALUES ($1, $2, $3, $4) RETURNING *',
        [profesor_id, inventario_id, cantidad, motivo]
      );

      const admins = await client.query(
        'SELECT id, telefono FROM usuarios WHERE role = $1 AND activo = true AND telefono IS NOT NULL',
        ['admin']
      );

      for (const admin of admins.rows) {
        await client.query(
          'INSERT INTO notificaciones_whatsapp (usuario_id, numero_telefono, mensaje, tipo, referencia_id, estado) VALUES ($1, $2, $3, $4, $5, $6)',
          [
            admin.id,
            admin.telefono,
            `Nueva solicitud #${result.rows[0].id}: ${itemNombre}`,
            'solicitud_creada',
            result.rows[0].id,
            'pendiente',
          ]
        );
      }

      await client.query('COMMIT');

      return NextResponse.json({
        message: 'Solicitud creada exitosamente',
        solicitud: result.rows[0],
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error al crear solicitud:', error);
    return NextResponse.json(
      { error: 'Error al crear solicitud' },
      { status: 500 }
    );
  }
}
