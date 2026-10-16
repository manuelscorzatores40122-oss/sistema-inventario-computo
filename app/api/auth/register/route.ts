import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/app/lib/auth';
import { getClient } from '@/app/lib/db';
import { validateAccountInput } from '@/app/lib/account-validation';

export async function POST(request: NextRequest) {
  let client;
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Completa el formulario de registro.' }, { status: 400 });
    const error = validateAccountInput(body, true);
    if (error) return NextResponse.json({ error }, { status: 400 });
    const dni = (body.dni || body.email).trim();
    client = await getClient();
    await client.query('BEGIN');
    const existing = await client.query('SELECT id FROM usuarios WHERE dni = $1 OR LOWER(email) = LOWER($1)', [dni]);
    if (existing.rows.length) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Este DNI ya tiene una cuenta o una solicitud pendiente. Si no puedes ingresar, contacta a administración.' }, { status: 409 });
    }
    const user = await createUser(dni, body.nombre.trim(), body.apellido.trim(), body.password, 'profesor', body.telefono?.trim(), body.correo_personal?.trim(), false, dni, body.area?.trim(), client);
    await client.query(`INSERT INTO notificaciones_whatsapp (usuario_id, numero_telefono, mensaje, tipo, referencia_id, estado)
      SELECT id, COALESCE(NULLIF(telefono, ''), '-'), $1, 'registro_profesor', $2, 'pendiente'
      FROM usuarios WHERE role = 'admin' AND activo = true`,
      [`${body.nombre.trim()} ${body.apellido.trim()} solicita una cuenta docente. Revisa sus datos y habilita su acceso desde Profesores.`, user.id]);
    await client.query('COMMIT');
    return NextResponse.json({ message: 'Tu solicitud fue recibida. Administración revisará tus datos y habilitará tu acceso.', user }, { status: 201 });
  } catch (error: any) {
    if (client) await client.query('ROLLBACK');
    console.error('Error al registrar cuenta docente:', error);
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'El formulario no tiene un formato válido.' }, { status: 400 });
    if (error?.code === '23505') return NextResponse.json({ error: 'El DNI o usuario ya está registrado. Contacta a administración para recuperar tu acceso.' }, { status: 409 });
    if (error?.code === '22001') return NextResponse.json({ error: 'Uno de los datos es demasiado largo. Revisa el DNI, teléfono y correo.' }, { status: 400 });
    return NextResponse.json({ error: 'No pudimos conectar para registrar tu solicitud. Tus datos siguen en el formulario; vuelve a intentarlo.' }, { status: 503 });
  } finally { client?.release(); }
}
