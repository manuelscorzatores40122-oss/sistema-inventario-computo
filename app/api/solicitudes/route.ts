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
                      i.nombre as item_nombre,
                      d.sala_nombre,
                      d.dia_semana,
                      d.hora_inicio,
                      d.hora_fin
               FROM solicitudes s
               JOIN usuarios u ON s.profesor_id = u.id
               LEFT JOIN inventario i ON s.inventario_id = i.id
               LEFT JOIN disponibilidad d ON s.disponibilidad_id = d.id
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
    const { profesor_id, inventario_id, disponibilidad_id, cantidad_solicitada, motivo } = await request.json();
    const cantidad = inventario_id ? Number(cantidad_solicitada || 1) : 1;

    if (!profesor_id || (!inventario_id && !disponibilidad_id) || !Number.isInteger(cantidad) || cantidad <= 0) {
      return NextResponse.json(
        { error: 'Selecciona un artículo o un horario de sala válido' },
        { status: 400 }
      );
    }

    const client = await getClient();

    try {
      await client.query('BEGIN');

      let itemNombre = '';

      if (inventario_id) {
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

        itemNombre = `${cantidad} ${inventario.rows[0].nombre}`;
      }

      let salaDetalle = '';

      if (disponibilidad_id) {
        const disponibilidad = await client.query(
          'SELECT id, sala_nombre, dia_semana, hora_inicio, hora_fin, estado FROM disponibilidad WHERE id = $1 FOR UPDATE',
          [disponibilidad_id]
        );

        if (disponibilidad.rows.length === 0 || disponibilidad.rows[0].estado !== 'disponible') {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { error: 'Horario de sala no disponible' },
            { status: 400 }
          );
        }

        const sala = disponibilidad.rows[0];
        salaDetalle = `${sala.sala_nombre} ${sala.dia_semana} ${sala.hora_inicio}-${sala.hora_fin}`;
      }

      const result = await client.query(
        'INSERT INTO solicitudes (profesor_id, inventario_id, disponibilidad_id, cantidad_solicitada, motivo) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [profesor_id, inventario_id || null, disponibilidad_id || null, cantidad, motivo]
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
            `Nueva solicitud #${result.rows[0].id}: ${[itemNombre, salaDetalle].filter(Boolean).join(' + ')}`,
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
