import { NextResponse, type NextRequest } from 'next/server';

async function readSession(token: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const bytes = (value: string) => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0));
  const header = JSON.parse(new TextDecoder().decode(bytes(parts[0])));
  if (header.alg !== 'HS256') return null;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  if (!await crypto.subtle.verify('HMAC', key, bytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`))) return null;
  const payload = JSON.parse(new TextDecoder().decode(bytes(parts[1])));
  if (!Number.isSafeInteger(payload.userId) || payload.userId <= 0 || !['admin', 'profesor'].includes(payload.role) ||
      typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now() ||
      (typeof payload.nbf === 'number' && payload.nbf * 1000 > Date.now())) return null;
  return payload as { userId: number; role: 'admin' | 'profesor' };
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const api = path.startsWith('/api/');
  if (api && ['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password', '/api/auth/logout', '/api/webhook'].includes(path)) return NextResponse.next();
  let session = null;
  try { session = await readSession(request.cookies.get('auth-token')?.value || (api ? request.headers?.get('authorization')?.replace(/^Bearer\s+/i, '') : '') || ''); } catch { /* Rechazar tokens mal formados. */ }
  if (!session) {
    if (api) return NextResponse.json({ error: 'Inicia sesión para continuar.' }, { status: 401 });
    const login = new URL('/auth/login', request.url);
    if (/^\/admin\/equipos\/[1-9]\d*$/.test(path)) login.searchParams.set('equipo', path.split('/').at(-1)!);
    return NextResponse.redirect(login);
  }
  if (!api) {
    if (path.startsWith('/admin') && session.role !== 'admin') return NextResponse.redirect(new URL('/profesor/dashboard', request.url));
    if (path.startsWith('/profesor') && session.role !== 'profesor') return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    return NextResponse.next();
  }
  if (session.role === 'profesor') {
    const read = request.method === 'GET';
    const ownUser = path === `/api/usuarios/${session.userId}`;
    const allowed = (read && /^(\/api\/(inventario(?:\/\d+)?|disponibilidad(?:\/\d+)?|solicitudes(?:\/\d+)?|prestamos|horario\/template|notificaciones(?:\/whatsapp|\/resumen)?|profesor\/resumen))$/.test(path)) ||
      (ownUser && ['GET', 'PUT'].includes(request.method)) ||
      (path === '/api/notificaciones/lecturas' && ['GET', 'POST'].includes(request.method)) ||
      (path === '/api/solicitudes' && request.method === 'POST') ||
      (/^\/api\/(solicitudes|disponibilidad)\/\d+\/cancelar$/.test(path) && request.method === 'POST');
    if (!allowed) return NextResponse.json({ error: 'Esta acción requiere permisos de administración.' }, { status: 403 });
  }
  return NextResponse.next();
}
export const config = { matcher: ['/admin/:path*', '/profesor/:path*', '/api/:path*'] };
