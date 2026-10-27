import { NextRequest, NextResponse } from 'next/server';
import { getUserById, verifyToken } from './auth';

export async function requireSession(request: NextRequest, adminOnly = false) {
  const token = request.cookies.get('auth-token')?.value || request.headers?.get('authorization')?.replace(/^Bearer\s+/i, '');
  const claims = token ? verifyToken(token) : null;
  if (!claims || typeof claims === 'string' || !Number.isSafeInteger(claims.userId) || claims.userId <= 0 || !['admin', 'profesor'].includes(claims.role) || typeof claims.exp !== 'number' || claims.exp * 1000 <= Date.now()) {
    return { user: null, response: NextResponse.json({ error: 'Tu sesión venció. Inicia sesión nuevamente.' }, { status: 401 }) };
  }
  const user = await getUserById(claims.userId);
  if (user && (claims.sessionVersion ?? 0) !== (user.session_version ?? 0)) {
    return { user: null, response: NextResponse.json({ error: 'Tu sesión venció. Inicia sesión nuevamente.' }, { status: 401 }) };
  }
  if (!user || !user.activo || user.role !== claims.role || (adminOnly && user.role !== 'admin')) {
    return { user: null, response: NextResponse.json({ error: 'No tienes permiso para realizar esta operación.' }, { status: 403 }) };
  }
  return { user, response: null };
}
