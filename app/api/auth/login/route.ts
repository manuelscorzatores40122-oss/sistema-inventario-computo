import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, comparePassword, generateToken } from '@/app/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body || {};

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password || email.length > 255 || password.length > 128) {
      return NextResponse.json(
        { error: 'Email y contraseña requeridos' },
        { status: 400 }
      );
    }

    const user = await getUserByEmail(email);

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario o contraseña inválidos' },
        { status: 401 }
      );
    }

    if (!user.activo) {
      return NextResponse.json(
        { error: 'Tu cuenta está pendiente de aprobación por el administrador del colegio.' },
        { status: 401 }
      );
    }

    const isValidPassword = await comparePassword(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Usuario o contraseña inválidos' },
        { status: 401 }
      );
    }

    const token = generateToken(user.id, user.role);

    const response = NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        role: user.role,
        dni: user.dni,
        area: user.area,
        telefono: user.telefono,
        correo_personal: user.correo_personal,
      },
    });

    response.cookies.set({
      name: 'auth-token',
      value: token,
      httpOnly: true,
      secure: process.env.VERCEL === '1',
      sameSite: 'lax',
      maxAge: 86400,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Error en login:', error);
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Revisa los datos del formulario.' }, { status: 400 });
    if (error?.message === 'JWT_SECRET debe estar configurada') return NextResponse.json({ error: 'El acceso está temporalmente sin configurar en este servidor. Avisa a administración.', code: 'AUTH_CONFIGURATION' }, { status: 503 });
    return NextResponse.json(
      { error: 'No pudimos conectar para iniciar sesión. Tus datos no se han borrado; vuelve a intentarlo.', code: 'AUTH_UNAVAILABLE' },
      { status: 503 }
    );
  }
}
