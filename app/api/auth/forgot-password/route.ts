import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/app/lib/db';
import { hashPassword } from '@/app/lib/auth';
import { allowRecoveryAttempt, normalizeRecoveryCode, recoveryMatches, recoveryPasswordError } from '@/app/lib/recovery';

const headers = { 'Cache-Control': 'no-store' };
const invalid = 'No pudimos verificar el DNI y el código. Revisa ambos datos o contacta a administración.';

export async function POST(request: NextRequest) {
  let client;
  try {
    const body = await request.json();
    const code = normalizeRecoveryCode(body?.code);
    if (typeof body?.dni !== 'string' || !/^\d{8}$/.test(body.dni.trim()) || !code) {
      return NextResponse.json({ error: invalid }, { status: 400, headers });
    }
    const passwordError = recoveryPasswordError(body.password, body.password_confirmation);
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400, headers });
    const dni = body.dni.trim();
    if (!await allowRecoveryAttempt(`reset:${dni}`)) {
      return NextResponse.json({ error: 'Demasiados intentos. Espera 15 minutos antes de volver a intentarlo.' }, { status: 429, headers: { ...headers, 'Retry-After': '900' } });
    }
    client = await getClient();
    await client.query('BEGIN');
    const result = await client.query(`SELECT id, codigo_recuperacion_hash FROM usuarios
      WHERE (dni = $1 OR (dni IS NULL AND email = $1)) AND activo = true FOR UPDATE`, [dni]);
    const user = result.rows[0];
    if (!recoveryMatches(code, user?.codigo_recuperacion_hash)) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: invalid }, { status: 400, headers });
    }
    const password = await hashPassword(body.password);
    await client.query(`UPDATE usuarios SET password = $1, codigo_recuperacion_hash = NULL,
      session_version = session_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [password, user.id]);
    await client.query('COMMIT');
    const response = NextResponse.json({ message: 'Contraseña actualizada. Inicia sesión con tu nueva contraseña y genera otro código de recuperación desde tu perfil.' }, { headers });
    response.cookies.set({ name: 'auth-token', value: '', httpOnly: true, secure: process.env.VERCEL === '1', sameSite: 'lax', maxAge: 0, path: '/' });
    return response;
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => undefined);
    return NextResponse.json({ error: error instanceof SyntaxError ? 'Revisa el formulario.' : 'No se pudo recuperar el acceso. Intenta nuevamente.' }, { status: error instanceof SyntaxError ? 400 : 503, headers });
  } finally { client?.release(); }
}
