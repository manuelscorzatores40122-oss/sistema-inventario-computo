import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/app/lib/session';
import { comparePassword } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { allowRecoveryAttempt, newRecoveryCode } from '@/app/lib/recovery';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);
    if (session.response) return session.response;
    const result = await query('SELECT codigo_recuperacion_hash IS NOT NULL AS configurado FROM usuarios WHERE id = $1', [session.user.id]);
    return NextResponse.json({ configurado: !!result.rows[0]?.configurado }, { headers });
  } catch {
    return NextResponse.json({ error: 'No se pudo consultar tu código de recuperación.' }, { status: 503, headers });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request);
    if (session.response) return session.response;
    if (!/^\d{8}$/.test(session.user.dni || session.user.email || '')) {
      return NextResponse.json({ error: 'Tu cuenta necesita un DNI de 8 dígitos registrado para usar esta recuperación.' }, { status: 400, headers });
    }
    const body = await request.json();
    if (typeof body?.current_password !== 'string' || !body.current_password || body.current_password.length > 128) {
      return NextResponse.json({ error: 'Confirma tu contraseña actual para generar el código.' }, { status: 400, headers });
    }
    if (!await allowRecoveryAttempt(`generate:${session.user.id}`)) {
      return NextResponse.json({ error: 'Demasiados intentos. Espera 15 minutos antes de volver a intentarlo.' }, { status: 429, headers: { ...headers, 'Retry-After': '900' } });
    }
    const result = await query('SELECT password FROM usuarios WHERE id = $1 AND activo = true', [session.user.id]);
    const password = result.rows[0]?.password;
    if (!password || !await comparePassword(body.current_password, password)) {
      return NextResponse.json({ error: 'La contraseña actual no es correcta.' }, { status: 400, headers });
    }
    const { code, hash } = newRecoveryCode();
    const updated = await query('UPDATE usuarios SET codigo_recuperacion_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND password = $3 AND activo = true RETURNING id', [hash, session.user.id, password]);
    if (!updated.rows.length) return NextResponse.json({ error: 'Tu cuenta cambió. Inicia sesión nuevamente.' }, { status: 409, headers });
    return NextResponse.json({ code, message: 'Guarda este código en un lugar privado. Solo se muestra ahora y reemplaza cualquier código anterior.' }, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof SyntaxError ? 'Revisa el formulario.' : 'No se pudo generar el código. Intenta nuevamente.' }, { status: error instanceof SyntaxError ? 400 : 503, headers });
  }
}
