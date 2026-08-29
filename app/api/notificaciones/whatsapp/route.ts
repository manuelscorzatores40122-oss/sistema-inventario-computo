import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

// POST - Enviar notificación WhatsApp
export async function POST(request: NextRequest) {
  try {
    const { usuario_id, mensaje, tipo, referencia_id } = await request.json();

    if (!usuario_id || !mensaje) {
      return NextResponse.json(
        { error: 'usuario_id y mensaje requeridos' },
        { status: 400 }
      );
    }

    // Obtener el usuario con teléfono
    const usuarioResult = await query(
      'SELECT id, telefono FROM usuarios WHERE id = $1',
      [usuario_id]
    );

    if (usuarioResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const usuario = usuarioResult.rows[0];

    if (!usuario.telefono) {
      return NextResponse.json(
        { error: 'Usuario no tiene teléfono registrado' },
        { status: 400 }
      );
    }

    // TODO: Integrar con Twilio para enviar WhatsApp
    // const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    // await client.messages.create({
    //   from: TWILIO_WHATSAPP_NUMBER,
    //   to: `whatsapp:${usuario.telefono}`,
    //   body: mensaje,
    // });

    // Por ahora, solo registrar en la base de datos
    const result = await query(
      'INSERT INTO notificaciones_whatsapp (usuario_id, numero_telefono, mensaje, tipo, referencia_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [usuario_id, usuario.telefono, mensaje, tipo, referencia_id]
    );

    return NextResponse.json({
      message: 'Notificación registrada',
      notificacion: result.rows[0],
    });
  } catch (error) {
    console.error('Error al enviar notificación:', error);
    return NextResponse.json(
      { error: 'Error al enviar notificación' },
      { status: 500 }
    );
  }
}

// GET - Obtener notificaciones
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const usuario_id = searchParams.get('usuario_id');

    let sql = 'SELECT * FROM notificaciones_whatsapp WHERE 1=1';
    const params: any[] = [];

    if (usuario_id) {
      sql += ' AND usuario_id = $' + (params.length + 1);
      params.push(usuario_id);
    }

    sql += ' ORDER BY fecha_envio DESC';

    const result = await query(sql, params);

    return NextResponse.json({
      notificaciones: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    return NextResponse.json(
      { error: 'Error al obtener notificaciones' },
      { status: 500 }
    );
  }
}
