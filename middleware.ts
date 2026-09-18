import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtDecode } from 'jwt-decode';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Solo interceptamos rutas de admin y profesor
  if (!pathname.startsWith('/admin') && !pathname.startsWith('/profesor')) {
    return NextResponse.next();
  }

  // Obtenemos el token de las cookies
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  try {
    // Decodificamos el JWT para validar el rol y la expiración
    const decoded = jwtDecode<{ role: string, exp: number }>(token);
    
    // Verificamos si expiró
    const isExpired = decoded.exp * 1000 < Date.now();
    if (isExpired) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    // Verificamos permisos según la ruta
    if (pathname.startsWith('/admin') && decoded.role !== 'admin') {
      return NextResponse.redirect(new URL('/profesor/dashboard', request.url));
    }

    if (pathname.startsWith('/profesor') && decoded.role !== 'profesor') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }

    // El token es válido y tiene el rol correcto para la ruta
    return NextResponse.next();
  } catch (error) {
    // Si el token es inválido (mal formado, etc.)
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
}

export const config = {
  matcher: ['/admin/:path*', '/profesor/:path*'],
};
