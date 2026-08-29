import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

// GET - Listar solicitudes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');
    const profesor_id = searchParams.get('profesor_id');

    let sql = 'SELECT s.*, u.nombre as profesor_nombre, u.apellido, i.nombre as item_nombre FROM solicitudes s JOIN usuarios u ON s.profesor_id = u.id JOIN inventario i ON s.inventario_id = i.id WHERE 1=1';
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

    if (!profesor_id || !inventario_id || !cantidad_solicitada) {
      return NextResponse.json(
        { error: 'Campos requeridos' },
        { status: 400 }
      );
    }

    const result = await query(
      'INSERT INTO solicitudes (profesor_id, inventario_id, cantidad_solicitada, motivo) VALUES ($1, $2, $3, $4) RETURNING *',
      [profesor_id, inventario_id, cantidad_solicitada, motivo]
    );

    // TODO: Enviar notificación WhatsApp al admin

    return NextResponse.json({
      message: 'Solicitud creada exitosamente',
      solicitud: result.rows[0],
    });
  } catch (error) {
    console.error('Error al crear solicitud:', error);
    return NextResponse.json(
      { error: 'Error al crear solicitud' },
      { status: 500 }
    );
  }
}
