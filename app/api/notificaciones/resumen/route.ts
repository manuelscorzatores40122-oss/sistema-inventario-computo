import { requireSession } from '@/app/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);
    if (session.response) return session.response;


    const userId = Number(session.user.id);
    const isAdmin = session.user.role === 'admin';

    let sql = '';
    const params: any[] = [userId];

    if (isAdmin) {
      // Admin: consulta consolidada usando INNER JOINs y agregación JSON en un solo round-trip
      sql = `
        WITH
          solicitudes_pendientes AS (
            SELECT json_agg(row_to_json(s_row)) as list FROM (
              SELECT s.id, s.profesor_id, s.inventario_id, s.disponibilidad_id, s.cantidad_solicitada,
                     s.motivo, s.seccion, s.numero_aula, s.estado, s.fecha_solicitud,
                     u.nombre as profesor_nombre, u.apellido,
                     COALESCE(i.nombre, 'Aula de Cómputo (' || d.dia_semana || ' ' || TO_CHAR(d.fecha_reserva, 'DD/MM/YYYY') || ' ' || d.hora_inicio || '-' || d.hora_fin || ')') as item_nombre
              FROM solicitudes s
              INNER JOIN usuarios u ON s.profesor_id = u.id
              LEFT JOIN inventario i ON s.inventario_id = i.id
              LEFT JOIN disponibilidad d ON s.disponibilidad_id = d.id
              WHERE s.estado = 'pendiente'
              ORDER BY s.fecha_solicitud DESC
              LIMIT 50
            ) s_row
          ),
          usuarios_inactivos AS (
            SELECT json_agg(row_to_json(u_row)) as list FROM (
              SELECT id, email, nombre, apellido, role, telefono, correo_personal, activo, dni, area, fecha_creacion
              FROM usuarios
              WHERE estado_registro = 'pendiente' AND activo = false AND oculto = false
              ORDER BY fecha_creacion DESC
              LIMIT 50
            ) u_row
          ),
          prestamos_activos AS (
            SELECT json_agg(row_to_json(p_row)) as list FROM (
              SELECT p.id, p.inventario_id, p.profesor_id, p.cantidad, p.detalle, p.estado, p.fecha_prestamo,
                     i.nombre as item_nombre, i.categoria,
                     u.nombre as profesor_nombre, u.apellido
              FROM prestamos p
              INNER JOIN inventario i ON p.inventario_id = i.id
              INNER JOIN usuarios u ON p.profesor_id = u.id
              WHERE p.estado = 'prestado'
              ORDER BY p.fecha_prestamo DESC
              LIMIT 50
            ) p_row
          ),
          notificaciones_recientes AS (
            SELECT json_agg(row_to_json(n_row)) as list FROM (
              SELECT nw.id, nw.usuario_id, nw.numero_telefono, nw.mensaje, nw.tipo, nw.referencia_id, nw.estado, nw.fecha_envio,
                     u.nombre as usuario_nombre, u.apellido as usuario_apellido
              FROM notificaciones_whatsapp nw
              INNER JOIN usuarios u ON nw.usuario_id = u.id
              WHERE nw.usuario_id = $1
              ORDER BY nw.fecha_envio DESC
              LIMIT 40
            ) n_row
          )
        SELECT
          COALESCE((SELECT list FROM solicitudes_pendientes), '[]'::json) as solicitudes,
          COALESCE((SELECT list FROM usuarios_inactivos), '[]'::json) as usuarios,
          COALESCE((SELECT list FROM prestamos_activos), '[]'::json) as prestamos,
          COALESCE((SELECT list FROM notificaciones_recientes), '[]'::json) as notificaciones;
      `;
    } else {
      // Profesor: consulta consolidada usando INNER JOINs para sus solicitudes y préstamos
      sql = `
        WITH
          solicitudes_profesor AS (
            SELECT json_agg(row_to_json(s_row)) as list FROM (
              SELECT s.id, s.profesor_id, s.inventario_id, s.disponibilidad_id, s.cantidad_solicitada,
                     s.motivo, s.seccion, s.numero_aula, s.estado, s.fecha_solicitud,
                     u.nombre as profesor_nombre, u.apellido,
                     COALESCE(i.nombre, 'Aula de Cómputo (' || d.dia_semana || ' ' || TO_CHAR(d.fecha_reserva, 'DD/MM/YYYY') || ' ' || d.hora_inicio || '-' || d.hora_fin || ')') as item_nombre
              FROM solicitudes s
              INNER JOIN usuarios u ON s.profesor_id = u.id
              LEFT JOIN inventario i ON s.inventario_id = i.id
              LEFT JOIN disponibilidad d ON s.disponibilidad_id = d.id
              WHERE s.profesor_id = $1
              ORDER BY s.fecha_solicitud DESC
              LIMIT 50
            ) s_row
          ),
          prestamos_profesor AS (
            SELECT json_agg(row_to_json(p_row)) as list FROM (
              SELECT p.id, p.inventario_id, p.profesor_id, p.cantidad, p.detalle, p.estado, p.fecha_prestamo,
                     i.nombre as item_nombre, i.categoria,
                     u.nombre as profesor_nombre, u.apellido
              FROM prestamos p
              INNER JOIN inventario i ON p.inventario_id = i.id
              INNER JOIN usuarios u ON p.profesor_id = u.id
              WHERE p.profesor_id = $1 AND p.estado = 'prestado'
              ORDER BY p.fecha_prestamo DESC
              LIMIT 50
            ) p_row
          ),
          notificaciones_profesor AS (
            SELECT json_agg(row_to_json(n_row)) as list FROM (
              SELECT nw.id, nw.usuario_id, nw.numero_telefono, nw.mensaje, nw.tipo, nw.referencia_id, nw.estado, nw.fecha_envio,
                     u.nombre as usuario_nombre, u.apellido as usuario_apellido
              FROM notificaciones_whatsapp nw
              INNER JOIN usuarios u ON nw.usuario_id = u.id
              WHERE nw.usuario_id = $1
              ORDER BY nw.fecha_envio DESC
              LIMIT 40
            ) n_row
          )
        SELECT
          COALESCE((SELECT list FROM solicitudes_profesor), '[]'::json) as solicitudes,
          '[]'::json as usuarios,
          COALESCE((SELECT list FROM prestamos_profesor), '[]'::json) as prestamos,
          COALESCE((SELECT list FROM notificaciones_profesor), '[]'::json) as notificaciones;
      `;
    }

    const result = await query(sql, params);
    const row = result.rows[0] || {
      solicitudes: [],
      usuarios: [],
      prestamos: [],
      notificaciones: [],
    };

    return NextResponse.json(
      {
        solicitudes: row.solicitudes || [],
        usuarios: row.usuarios || [],
        prestamos: row.prestamos || [],
        notificaciones: row.notificaciones || [],
        timestamp: Date.now(),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Error en /api/notificaciones/resumen:', error);
    return NextResponse.json(
      { error: 'Error al obtener resumen de notificaciones' },
      { status: 500 }
    );
  }
}
