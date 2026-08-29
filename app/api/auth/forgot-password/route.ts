import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, generateToken } from '@/app/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email requerido' },
        { status: 400 }
      );
    }

    const user = await getUserByEmail(email);

    if (!user) {
      return NextResponse.json(
        { error: 'Email no encontrado' },
        { status: 404 }
      );
    }

    // Generar token de reset
    const resetToken = generateToken(user.id, 'reset');

    // TODO: Enviar email con link de reset
    // Por ahora solo retornamos el token para desarrollo
    // En producción: usar SendGrid, Resend, etc.

    return NextResponse.json({
      message: 'Token de reset generado',
      resetToken,
      // En producción no devolver el token, usar email
    });
  } catch (error) {
    console.error('Error en recuperación de contraseña:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
