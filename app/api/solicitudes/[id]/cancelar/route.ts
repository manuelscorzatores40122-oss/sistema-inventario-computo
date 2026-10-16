import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/app/lib/session';
import { getClient } from '@/app/lib/db';
import { notifyAdminsOfRequest } from '@/app/lib/admin-notifications';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  let client;
  try {
    const session = await requireSession(request);
    if (session.response) return session.response;
    const actor = { userId: session.user.id };
    client = await getClient();
    await client.query('BEGIN');
    const result = await client.query('SELECT * FROM solicitudes WHERE id = $1 AND profesor_id = $2 FOR UPDATE', [params.id, actor.userId]);
    const sol = result.rows[0];
    if (!sol || sol.estado !== 'pendiente') {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: sol ? 'Esta solicitud ya no está pendiente. Actualiza la página.' : 'Solicitud no encontrada' }, { status: sol ? 409 : 404 });
    }
    await client.query("UPDATE solicitudes SET estado = 'cancelada', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [sol.id]);
    if (sol.disponibilidad_id) {
      await client.query("UPDATE disponibilidad SET estado = 'disponible', reservado_por = NULL, motivo_reserva = NULL WHERE id = $1 AND estado = 'pendiente'", [sol.disponibilidad_id]);
    }
    await notifyAdminsOfRequest(client, sol.id, actor.userId, 'cancelada');
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
