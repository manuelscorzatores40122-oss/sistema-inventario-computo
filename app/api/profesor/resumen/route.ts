import { NextRequest, NextResponse } from "next/server";
import { query } from "@/app/lib/db";
import { requireSession } from "@/app/lib/session";
import { parseSchoolSlots } from "@/app/lib/school-slots";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);
    if (session.response) return session.response;
    // Un viaje a Neon para los seis bloques; se conserva la restricción por docente.
    const result = await query(
      `SELECT
      COALESCE((SELECT json_agg(r ORDER BY r.nombre) FROM (
        SELECT id, nombre, descripcion, categoria, cantidad_total, cantidad_disponible, estado,
               imagen_url, marca, modelo, ubicacion, condicion FROM inventario
        WHERE situacion_administrativa = 'activo'
      ) r), '[]'::json) AS inventory,
      COALESCE((SELECT json_agg(r ORDER BY r.fecha_solicitud DESC) FROM (
        SELECT s.*, COALESCE(i.nombre, 'Sala de cómputo') AS item_nombre,
               d.fecha_reserva, d.hora_inicio, d.hora_fin
        FROM solicitudes s LEFT JOIN inventario i ON s.inventario_id = i.id
        LEFT JOIN disponibilidad d ON s.disponibilidad_id = d.id WHERE s.profesor_id = $1
      ) r), '[]'::json) AS requests,
      COALESCE((SELECT json_agg(r ORDER BY r.fecha_prestamo DESC) FROM (
        SELECT p.*, i.nombre AS item_nombre, i.categoria FROM prestamos p
        JOIN inventario i ON p.inventario_id = i.id WHERE p.profesor_id = $1
      ) r), '[]'::json) AS loans,
      COALESCE((SELECT json_agg(r ORDER BY r.hora_inicio) FROM (
        SELECT d.id, d.sala_nombre, d.dia_semana, d.hora_inicio, d.hora_fin, d.estado,
               d.reservado_por, d.motivo_reserva, d.fecha_reserva,
               u.nombre AS reservado_por_nombre, u.apellido AS reservado_por_apellido
        FROM disponibilidad d LEFT JOIN usuarios u ON d.reservado_por = u.id
        WHERE d.estado IN ('separado', 'pendiente')
          AND (d.fecha_reserva IS NULL OR d.fecha_reserva >= CURRENT_DATE - INTERVAL '90 days')
      ) r), '[]'::json) AS schedule,
      COALESCE((SELECT json_agg(r ORDER BY r.fecha_envio DESC) FROM (
        SELECT id, mensaje, tipo, referencia_id, fecha_envio FROM notificaciones_whatsapp
        WHERE usuario_id = $1 ORDER BY fecha_envio DESC LIMIT 40
      ) r), '[]'::json) AS notifications,
      (SELECT valor FROM configuracion WHERE clave = 'horario_template') AS template_value`,
      [session.user.id],
    );
    const { template_value, ...data } = result.rows[0];
    return NextResponse.json(
      {
        ...data,
        user: session.user,
        template: parseSchoolSlots(template_value),
        updatedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Error al cargar el espacio docente:", error);
    return NextResponse.json(
      { error: "No pudimos cargar tu información. Vuelve a intentarlo." },
      { status: 503 },
    );
  }
}
