import { saveAvailability } from '@/app/lib/availability';
import { requireSession } from '@/app/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/app/lib/db';

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
  let client;
  try {
    const session = await requireSession(request, true);
    if (session.response) return session.response;
    client = await getClient();
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(3011, 1)');
    // Mantiene el orden de bloqueo de la aprobación: solicitud antes que turno.
    await client.query("SELECT id FROM solicitudes WHERE disponibilidad_id = $1 AND estado IN ('pendiente', 'aprobada') ORDER BY id FOR UPDATE", [params.id]);
    const current = await client.query('SELECT * FROM disponibilidad WHERE id = $1 FOR UPDATE', [params.id]);
    if (!current.rows.length) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Disponibilidad no encontrada' }, { status: 404 });
    }
    const requests = await client.query("UPDATE solicitudes SET estado = 'cancelada', updated_at = CURRENT_TIMESTAMP WHERE disponibilidad_id = $1 AND estado IN ('pendiente', 'aprobada') RETURNING id, profesor_id", [params.id]);
    for (const row of requests.rows) {
      await client.query(`INSERT INTO notificaciones_whatsapp (usuario_id, numero_telefono, mensaje, tipo, referencia_id, estado)
        VALUES ($1, '-', $2, 'solicitud_cancelada', $3, 'pendiente')`, [row.profesor_id, `Administración liberó el turno de la solicitud #${row.id}. Consulta el calendario para elegir otra fecha.`, row.id]);
    }
    if (!requests.rows.length && current.rows[0].reservado_por) {
      const row = current.rows[0];
      await client.query(`INSERT INTO notificaciones_whatsapp (usuario_id, numero_telefono, mensaje, tipo, referencia_id, estado)
        VALUES ($1, '-', $2, 'reserva_cancelada', $3, 'pendiente')`, [row.reservado_por, `Administración canceló tu turno de sala de cómputo de ${String(row.hora_inicio).slice(0, 5)} a ${String(row.hora_fin).slice(0, 5)}${row.fecha_reserva ? '' : ` de los ${row.dia_semana}`}. Consulta el calendario para revisar la disponibilidad.`, row.id]);
    }
    const result = await client.query(
      "UPDATE disponibilidad SET estado = 'disponible', reservado_por = NULL, motivo_reserva = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id",
      [params.id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Disponibilidad no encontrada' },
        { status: 404 }
      );
    }

    await client.query('COMMIT');
    return NextResponse.json({ message: 'Turno liberado correctamente' });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Error al eliminar disponibilidad:', error);
    return NextResponse.json(
      { error: 'Error al eliminar disponibilidad' },
      { status: 500 }
    );
  } finally { client?.release(); }
}
