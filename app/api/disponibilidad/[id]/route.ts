import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

// PUT - Reservar disponibilidad (admin)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { reservado_por, motivo_reserva } = await request.json();

    if (!reservado_por) {
      return NextResponse.json(
        { error: 'reservado_por requerido' },
        { status: 400 }
      );
    }

    const result = await query(
      'UPDATE disponibilidad SET estado = $1, reservado_por = $2, motivo_reserva = $3, fecha_reserva = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      ['separado', reservado_por, motivo_reserva || null, params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Disponibilidad no encontrada' },
        { status: 404 }
      );
    }

    // TODO: Enviar notificación WhatsApp al profesor

    return NextResponse.json({
      message: 'Disponibilidad reservada',
      disponibilidad: result.rows[0],
    });
  } catch (error) {
    console.error('Error al reservar disponibilidad:', error);
    return NextResponse.json(
      { error: 'Error al reservar disponibilidad' },
      { status: 500 }
    );
  }
}

// DELETE - Liberar disponibilidad
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await query(
      'UPDATE disponibilidad SET estado = $1, reservado_por = $2, motivo_reserva = $3 WHERE id = $4 RETURNING *',
      ['disponible', null, null, params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Disponibilidad no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Disponibilidad liberada',
      disponibilidad: result.rows[0],
    });
  } catch (error) {
    console.error('Error al liberar disponibilidad:', error);
    return NextResponse.json(
      { error: 'Error al liberar disponibilidad' },
      { status: 500 }
    );
  }
}
