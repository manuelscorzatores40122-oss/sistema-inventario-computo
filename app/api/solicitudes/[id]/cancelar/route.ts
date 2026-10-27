import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/app/lib/session';
import { getClient } from '@/app/lib/db';
import { notifyAdminsOfRequest } from '@/app/lib/admin-notifications';
import { reservationDate, reservationStart } from '@/app/lib/reservation-start';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  let client;
  try {
    const session = await requireSession(request);
    if (session.response) return session.response;
    const actor = { userId: session.user.id };
    client = await getClient();
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(3011, 1)');
    const result = await client.query('SELECT * FROM solicitudes WHERE id = $1 AND profesor_id = $2 FOR UPDATE', [params.id, actor.userId]);
    const sol = result.rows[0];
    if (!sol || (sol.estado !== 'pendiente' && !(sol.estado === 'aprobada' && sol.disponibilidad_id))) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: sol ? 'Esta solicitud ya no se puede cancelar. Actualiza la página.' : 'Solicitud no encontrada' }, { status: sol ? 409 : 404 });
    }
    let detail = '';
    if (sol.disponibilidad_id) {
      const availability = await client.query('SELECT * FROM disponibilidad WHERE id = $1 FOR UPDATE', [sol.disponibilidad_id]);
      const row = availability.rows[0];
      const start = row ? reservationStart(row.fecha_reserva, row.hora_inicio) : NaN;
      // Una reserva aprobada solo se libera antes de su inicio; no afecta clases semanales.
      if (sol.estado === 'aprobada' && (!row || !row.fecha_reserva || row.reservado_por !== actor.userId || row.estado !== 'separado' ||
          !Number.isFinite(start) || start <= Date.now())) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Solo puedes cancelar tus reservas por fecha antes de que comiencen.' }, { status: 409 });
      }
      if (row) detail = `Sala de cómputo · ${reservationDate(row.fecha_reserva)} · ${String(row.hora_inicio).slice(0, 5)}–${String(row.hora_fin).slice(0, 5)}`;
    }
    await client.query("UPDATE solicitudes SET estado = 'cancelada', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [sol.id]);
    if (sol.disponibilidad_id) {
      await client.query("UPDATE disponibilidad SET estado = 'disponible', reservado_por = NULL, motivo_reserva = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND reservado_por = $2 AND estado IN ('pendiente', 'separado')", [sol.disponibilidad_id, actor.userId]);
    }
    await notifyAdminsOfRequest(client, sol.id, actor.userId, 'cancelada', detail);
    await client.query('COMMIT');
    return NextResponse.json({ message: 'Solicitud cancelada' });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Error al cancelar solicitud:', error);
    return NextResponse.json({ error: 'No se pudo cancelar la solicitud. Inténtalo nuevamente.' }, { status: 500 });
  } finally {
    client?.release();
  }
}
