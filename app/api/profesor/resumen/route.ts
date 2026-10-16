import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import { requireSession } from '@/app/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);
    if (session.response) return session.response;
    const id = session.user.id;
    const [inventory, requests, loans, schedule, template, notifications] = await Promise.all([
      query(`SELECT id, nombre, descripcion, categoria, cantidad_total, cantidad_disponible, estado,
                    imagen_url, marca, modelo, ubicacion, condicion FROM inventario WHERE situacion_administrativa = 'activo' ORDER BY nombre`),
      query(`SELECT s.*, COALESCE(i.nombre, 'Sala de cómputo') AS item_nombre,
                    d.fecha_reserva, d.hora_inicio, d.hora_fin
             FROM solicitudes s LEFT JOIN inventario i ON s.inventario_id = i.id
             LEFT JOIN disponibilidad d ON s.disponibilidad_id = d.id
             WHERE s.profesor_id = $1 ORDER BY s.fecha_solicitud DESC`, [id]),
      query(`SELECT p.*, i.nombre AS item_nombre, i.categoria FROM prestamos p
             JOIN inventario i ON p.inventario_id = i.id WHERE p.profesor_id = $1
             ORDER BY p.fecha_prestamo DESC`, [id]),
      query(`SELECT d.*, u.nombre AS reservado_por_nombre, u.apellido AS reservado_por_apellido
             FROM disponibilidad d LEFT JOIN usuarios u ON d.reservado_por = u.id
             WHERE d.fecha_reserva IS NULL OR d.fecha_reserva >= CURRENT_DATE - INTERVAL '90 days'
             ORDER BY d.hora_inicio`),
      query(`SELECT valor FROM configuracion WHERE clave = 'horario_template'`),
      query(`SELECT id, mensaje, tipo, referencia_id, fecha_envio FROM notificaciones_whatsapp
             WHERE usuario_id = $1 ORDER BY fecha_envio DESC LIMIT 40`, [id]),
    ]);
    let blocks = [];
    try { blocks = JSON.parse(template.rows[0]?.valor || '[]'); } catch { /* Se usa la plantilla predeterminada. */ }
    return NextResponse.json({ user: session.user, inventory: inventory.rows, requests: requests.rows,
      loans: loans.rows, schedule: schedule.rows, template: Array.isArray(blocks) ? blocks : [],
      notifications: notifications.rows, updatedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error al cargar el espacio docente:', error);
    return NextResponse.json({ error: 'No pudimos cargar tu información. Vuelve a intentarlo.' }, { status: 500 });
  }
}
