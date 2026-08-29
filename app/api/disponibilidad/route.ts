import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

// GET - Obtener disponibilidad
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const profesor_id = searchParams.get('profesor_id');
    const dia_semana = searchParams.get('dia_semana');

    let sql = 'SELECT d.*, u.nombre as profesor_nombre, u.apellido, ru.nombre as reservado_por_nombre FROM disponibilidad d JOIN usuarios u ON d.profesor_id = u.id LEFT JOIN usuarios ru ON d.reservado_por = ru.id WHERE 1=1';
    const params: any[] = [];

    if (profesor_id) {
      sql += ' AND d.profesor_id = $' + (params.length + 1);
      params.push(profesor_id);
    }

    if (dia_semana) {
      sql += ' AND d.dia_semana = $' + (params.length + 1);
      params.push(dia_semana);
    }

    sql += ' ORDER BY CASE WHEN d.dia_semana = \'Lunes\' THEN 1 WHEN d.dia_semana = \'Martes\' THEN 2 WHEN d.dia_semana = \'Miércoles\' THEN 3 WHEN d.dia_semana = \'Jueves\' THEN 4 WHEN d.dia_semana = \'Viernes\' THEN 5 END, d.hora_inicio';

    const result = await query(sql, params);

    return NextResponse.json({
      disponibilidades: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('Error al obtener disponibilidad:', error);
    return NextResponse.json(
      { error: 'Error al obtener disponibilidad' },
      { status: 500 }
    );
  }
}

// POST - Crear o actualizar disponibilidad (profesor)
export async function POST(request: NextRequest) {
  try {
    const { profesor_id, dia_semana, hora_inicio, hora_fin } = await request.json();

    if (!profesor_id || !dia_semana || !hora_inicio || !hora_fin) {
      return NextResponse.json(
        { error: 'Campos requeridos' },
        { status: 400 }
      );
    }

    const result = await query(
      'INSERT INTO disponibilidad (profesor_id, dia_semana, hora_inicio, hora_fin, estado) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (profesor_id, dia_semana) DO UPDATE SET hora_inicio = $3, hora_fin = $4 RETURNING *',
      [profesor_id, dia_semana, hora_inicio, hora_fin, 'disponible']
    );

    return NextResponse.json({
      message: 'Disponibilidad actualizada',
      disponibilidad: result.rows[0],
    });
  } catch (error) {
    console.error('Error al guardar disponibilidad:', error);
    return NextResponse.json(
      { error: 'Error al guardar disponibilidad' },
      { status: 500 }
    );
  }
}
