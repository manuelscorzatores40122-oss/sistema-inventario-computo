import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, comparePassword, generateToken } from '@/app/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña requeridos' },
        { status: 400 }
      );
    }

    const user = await getUserByEmail(email);

    if (!user || !user.activo) {
      return NextResponse.json(
        { error: 'Usuario o contraseña inválidos' },
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

    const requirePasswordChange = password === email || !user.correo_personal;

    return NextResponse.json({
      token,
      requirePasswordChange,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        role: user.role,
        telefono: user.telefono,
        correo_personal: user.correo_personal,
      },
    });
  } catch (error) {
    console.error('Error en login:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
