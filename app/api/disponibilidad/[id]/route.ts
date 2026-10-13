import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await query(
      `SELECT d.*, ru.nombre as reservado_por_nombre, ru.apellido as reservado_por_apellido
       FROM disponibilidad d
       LEFT JOIN usuarios ru ON d.reservado_por = ru.id
       WHERE d.id = $1`,
      [params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Disponibilidad no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ disponibilidad: result.rows[0] });
  } catch (error) {
    console.error('Error al obtener disponibilidad:', error);
    return NextResponse.json(
      { error: 'Error al obtener disponibilidad' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar o reservar disponibilidad
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { sala_nombre, dia_semana, hora_inicio, hora_fin, estado, reservado_por, motivo_reserva, fecha_reserva, es_recurrente } = body;
    const nextEstado = estado || (reservado_por ? 'separado' : undefined);

    if (nextEstado && !['disponible', 'separado', 'pendiente'].includes(nextEstado)) {
      return NextResponse.json(
        { error: 'Estado inválido' },
        { status: 400 }
      );
    }

    const result = await query(
      `UPDATE disponibilidad
       SET sala_nombre = COALESCE($1, sala_nombre),
           dia_semana = COALESCE($2, dia_semana),
           hora_inicio = COALESCE($3, hora_inicio),
           hora_fin = COALESCE($4, hora_fin),
           estado = COALESCE($5, estado),
           reservado_por = CASE WHEN COALESCE($5, estado) = 'disponible' THEN NULL ELSE COALESCE($6, reservado_por) END,
           motivo_reserva = CASE WHEN COALESCE($5, estado) = 'disponible' THEN NULL ELSE COALESCE($7, motivo_reserva) END,
           fecha_reserva = CASE 
             WHEN COALESCE($5, estado) = 'disponible' THEN NULL 
             WHEN $8::boolean = true THEN NULL
             ELSE COALESCE($9, fecha_reserva)
           END,
           es_recurrente = COALESCE($8, es_recurrente),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [sala_nombre, dia_semana, hora_inicio, hora_fin, nextEstado, reservado_por, motivo_reserva, es_recurrente, fecha_reserva, params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Disponibilidad no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Disponibilidad actualizada',
      disponibilidad: result.rows[0],
    });
  } catch (error) {
    console.error('Error al actualizar disponibilidad:', error);
    return NextResponse.json(
      { error: 'Error al actualizar disponibilidad' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar disponibilidad
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await query(
      'DELETE FROM disponibilidad WHERE id = $1 RETURNING id',
      [params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Disponibilidad no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Disponibilidad eliminada' });
  } catch (error) {
    console.error('Error al eliminar disponibilidad:', error);
    return NextResponse.json(
      { error: 'Error al eliminar disponibilidad' },
      { status: 500 }
    );
  }
}
