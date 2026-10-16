import { saveAvailability } from '@/app/lib/availability';
import { requireSession } from '@/app/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession(request);
    if (session.response) return session.response;
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
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return saveAvailability(request, params.id);
}

// DELETE - Eliminar disponibilidad
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession(request, true);
    if (session.response) return session.response;
    const result = await query(
      "UPDATE disponibilidad SET estado = 'disponible', reservado_por = NULL, motivo_reserva = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id",
      [params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Disponibilidad no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Turno liberado correctamente' });
  } catch (error) {
    console.error('Error al eliminar disponibilidad:', error);
    return NextResponse.json(
      { error: 'Error al eliminar disponibilidad' },
      { status: 500 }
    );
  }
}
