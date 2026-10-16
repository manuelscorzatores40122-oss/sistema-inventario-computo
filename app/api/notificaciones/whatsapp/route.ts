import { requireSession } from '@/app/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/auth';

// POST - Registrar notificación interna en el sistema
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request, true);
    if (session.response) return session.response;
    const { usuario_id, mensaje, tipo, referencia_id } = await request.json();

    if (!usuario_id || !mensaje) {
      return NextResponse.json(
        { error: 'usuario_id y mensaje requeridos' },
        { status: 400 }
      );
    }

    const result = await query(
      'INSERT INTO notificaciones_whatsapp (usuario_id, numero_telefono, mensaje, tipo, referencia_id, estado) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [usuario_id, '-', mensaje, tipo || 'aviso_sistema', referencia_id || null, 'entregada']
    );

    return NextResponse.json({
      message: 'Notificación interna registrada',
      notificacion: result.rows[0],
    });
  } catch (error) {
    console.error('Error al registrar notificación:', error);
    return NextResponse.json(
      { error: 'Error al registrar notificación' },
      { status: 500 }
    );
  }
}

// GET - Obtener notificaciones internas para el usuario
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);
    if (session.response) return session.response;
    const { searchParams } = new URL(request.url);

    const usuario_id = session.user.role === 'admin'
      ? searchParams.get('usuario_id') || String(session.user.id)
      : String(session.user.id);

    let sql = `
      SELECT nw.id, nw.usuario_id, nw.numero_telefono, nw.mensaje, nw.tipo, nw.referencia_id, nw.estado, nw.fecha_envio,
             u.nombre as usuario_nombre, u.apellido as usuario_apellido, u.email as usuario_email
      FROM notificaciones_whatsapp nw
      INNER JOIN usuarios u ON nw.usuario_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (usuario_id) {
      sql += ' AND nw.usuario_id = $' + (params.length + 1);
      params.push(usuario_id);
    }

    sql += ' ORDER BY nw.fecha_envio DESC LIMIT 50';

    const result = await query(sql, params);

    return NextResponse.json({
      notificaciones: result.rows,
      total: result.rows.length,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    return NextResponse.json(
      { error: 'Error al obtener notificaciones' },
      { status: 500 }
    );
  }
}
