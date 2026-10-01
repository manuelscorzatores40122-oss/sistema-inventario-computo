import type { PoolClient } from 'pg';

// Avisos internos: no requieren teléfono ni envío por WhatsApp.
export async function notifyAdminsOfRequest(client: PoolClient, requestId: number, teacherId: number, action: 'creada' | 'cancelada', detail = '') {
  const teacher = await client.query('SELECT nombre, apellido FROM usuarios WHERE id = $1', [teacherId]);
  const name = teacher.rows[0] ? `${teacher.rows[0].nombre} ${teacher.rows[0].apellido}`.trim() : 'Un docente';
  const message = `${name} ${action === 'creada' ? 'envió' : 'canceló'} la solicitud #${requestId}${detail ? `: ${detail}` : ''}`;
  await client.query(
    `INSERT INTO notificaciones_whatsapp (usuario_id, numero_telefono, mensaje, tipo, referencia_id, estado)
     SELECT id, COALESCE(NULLIF(telefono, ''), '-'), $1, $2, $3, 'pendiente'
     FROM usuarios WHERE role = 'admin' AND activo = true`,
    [message, `solicitud_${action}`, requestId]
  );
}
