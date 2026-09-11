import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

// GET - Obtener disponibilidad
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reservado_por = searchParams.get('reservado_por');
    const dia_semana = searchParams.get('dia_semana');
    const estado = searchParams.get('estado');

    let sql = 'SELECT d.*, ru.nombre as reservado_por_nombre, ru.apellido as reservado_por_apellido FROM disponibilidad d LEFT JOIN usuarios ru ON d.reservado_por = ru.id WHERE 1=1';
    const params: any[] = [];

    if (reservado_por) {
      sql += ' AND d.reservado_por = $' + (params.length + 1);
      params.push(reservado_por);
    }

    if (dia_semana) {
      sql += ' AND d.dia_semana = $' + (params.length + 1);
      params.push(dia_semana);
    }

    if (estado) {
      sql += ' AND d.estado = $' + (params.length + 1);
      params.push(estado);
    }

    sql += " ORDER BY d.sala_nombre, CASE WHEN d.dia_semana = 'Lunes' THEN 1 WHEN d.dia_semana = 'Martes' THEN 2 WHEN d.dia_semana = 'Miércoles' THEN 3 WHEN d.dia_semana = 'Jueves' THEN 4 WHEN d.dia_semana = 'Viernes' THEN 5 WHEN d.dia_semana = 'Sábado' THEN 6 WHEN d.dia_semana = 'Domingo' THEN 7 END, d.hora_inicio";

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

// POST - Crear disponibilidad de sala (admin)
export async function POST(request: NextRequest) {
  try {
    const { sala_nombre = 'Sala de Cómputo', dia_semana, hora_inicio, hora_fin, estado = 'disponible' } = await request.json();

    if (!sala_nombre || !dia_semana || !hora_inicio || !hora_fin) {
      return NextResponse.json(
        { error: 'Campos requeridos' },
        { status: 400 }
      );
    }

    const result = await query(
      'INSERT INTO disponibilidad (sala_nombre, dia_semana, hora_inicio, hora_fin, estado) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [sala_nombre, dia_semana, hora_inicio, hora_fin, estado]
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
