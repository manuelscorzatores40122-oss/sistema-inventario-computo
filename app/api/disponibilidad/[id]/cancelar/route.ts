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
    client = await getClient();
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(3011, 1)');
    const requests = await client.query("SELECT id, profesor_id FROM solicitudes WHERE disponibilidad_id = $1 AND estado IN ('pendiente', 'aprobada') ORDER BY id FOR UPDATE", [params.id]);
    const result = await client.query('SELECT * FROM disponibilidad WHERE id = $1 FOR UPDATE', [params.id]);
    const row = result.rows[0];
    if (!row || row.reservado_por !== session.user.id) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Reserva no encontrada en tu cuenta.' }, { status: 404 });
    }
    const start = reservationStart(row.fecha_reserva, row.hora_inicio);
    if (!row.fecha_reserva || !['pendiente', 'separado'].includes(row.estado) || !Number.isFinite(start) || start <= Date.now() || requests.rows.some(item => item.profesor_id !== session.user.id)) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Solo puedes cancelar tus reservas por fecha antes de que comiencen. Las clases semanales las gestiona administración.' }, { status: 409 });
    }
    await client.query("UPDATE solicitudes SET estado = 'cancelada', updated_at = CURRENT_TIMESTAMP WHERE disponibilidad_id = $1 AND profesor_id = $2 AND estado IN ('pendiente', 'aprobada')", [row.id, session.user.id]);
    await client.query("UPDATE disponibilidad SET estado = 'disponible', reservado_por = NULL, motivo_reserva = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1", [row.id]);
    const detail = `Sala de cómputo · ${reservationDate(row.fecha_reserva)} · ${row.hora_inicio.slice(0, 5)}–${row.hora_fin.slice(0, 5)}${row.motivo_reserva ? ` · ${row.motivo_reserva}` : ''}`;
    if (requests.rows.length) {
      for (const linked of requests.rows) await notifyAdminsOfRequest(client, linked.id, session.user.id, 'cancelada', detail);
    } else {
      const teacher = `${session.user.nombre} ${session.user.apellido}`.trim();
      await client.query(`INSERT INTO notificaciones_whatsapp (usuario_id, numero_telefono, mensaje, tipo, referencia_id, estado)
        SELECT id, COALESCE(NULLIF(telefono, ''), '-'), $1, 'reserva_cancelada', $2, 'pendiente'
        FROM usuarios WHERE role = 'admin' AND activo = true`, [`${teacher} canceló su reserva: ${detail}`, row.id]);
    }
    await client.query('COMMIT');
    return NextResponse.json({ message: 'Reserva cancelada. Se liberó el turno y se notificó a administración.' });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Error al cancelar reserva:', error);
    return NextResponse.json({ error: 'No se pudo cancelar la reserva. Inténtalo nuevamente.' }, { status: 500 });
  } finally { client?.release(); }
}
