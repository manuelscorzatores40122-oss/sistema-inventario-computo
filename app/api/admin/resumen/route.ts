import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/app/lib/session";
import { query } from "@/app/lib/db";
import { DEFAULT_SCHOOL_SLOTS, parseSchoolSlots } from "@/app/lib/school-slots";
export const dynamic = "force-dynamic";

// Una consulta y solo los campos que necesita la bandeja; no descarga historiales completos.
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request, true);
    if (session.response) return session.response;
    const result = await query(`SELECT
      COALESCE((SELECT json_agg(r ORDER BY r.fecha_solicitud) FROM (
        SELECT s.id, s.profesor_id, s.inventario_id, s.disponibilidad_id, s.cantidad_solicitada,
               s.motivo, s.seccion, s.numero_aula, s.estado, s.fecha_solicitud,
               u.nombre AS profesor_nombre, u.apellido,
               COALESCE(i.nombre, 'Sala de cómputo') AS item_nombre
        FROM solicitudes s JOIN usuarios u ON s.profesor_id = u.id
        LEFT JOIN inventario i ON s.inventario_id = i.id
        WHERE s.estado = 'pendiente' OR (s.disponibilidad_id IS NOT NULL AND s.estado = 'aprobada')
      ) r), '[]'::json) AS requests,
      COALESCE((SELECT json_agg(r ORDER BY r.fecha_prestamo) FROM (
        SELECT p.id, p.cantidad, p.estado, p.fecha_prestamo, i.nombre AS item_nombre,
               u.nombre AS profesor_nombre, u.apellido AS profesor_apellido
        FROM prestamos p JOIN inventario i ON p.inventario_id = i.id JOIN usuarios u ON p.profesor_id = u.id
        WHERE p.estado IN ('pendiente', 'prestado')
      ) r), '[]'::json) AS loans,
      COALESCE((SELECT json_agg(r ORDER BY r.apellido, r.nombre) FROM (
        SELECT id, nombre, apellido, dni, area, activo, fecha_creacion FROM usuarios
        WHERE role = 'profesor' AND oculto = false
      ) r), '[]'::json) AS teachers,
      COALESCE((SELECT json_agg(r ORDER BY r.nombre) FROM (
        SELECT id, nombre, cantidad_total, cantidad_disponible, estado FROM inventario
        WHERE situacion_administrativa = 'activo'
      ) r), '[]'::json) AS items,
      COALESCE((SELECT json_agg(r ORDER BY r.hora_inicio) FROM (
        SELECT d.id, d.sala_nombre, d.dia_semana, d.hora_inicio, d.hora_fin, d.estado,
               d.reservado_por, d.motivo_reserva, d.fecha_reserva,
               u.nombre AS reservado_por_nombre, u.apellido AS reservado_por_apellido
        FROM disponibilidad d LEFT JOIN usuarios u ON d.reservado_por = u.id
        WHERE d.estado IN ('separado', 'pendiente')
      ) r), '[]'::json) AS schedule,
      (SELECT valor FROM configuracion WHERE clave = 'horario_template') AS template_value`);
    const { template_value, ...data } = result.rows[0];
    return NextResponse.json(
      {
        ...data,
        template: parseSchoolSlots(template_value, DEFAULT_SCHOOL_SLOTS),
      },
      {
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  } catch (error) {
    console.error("Error al cargar el resumen administrativo:", error);
    return NextResponse.json(
      { error: "No pudimos cargar el panel. Vuelve a intentarlo." },
      { status: 503 },
    );
  }
}
