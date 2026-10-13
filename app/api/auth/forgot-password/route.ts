import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/app/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Ingresa tu DNI o correo registrado' },
        { status: 400 }
      );
    }

    const user = await getUserByEmail(email);

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado en el sistema del colegio' },
        { status: 404 }
      );
    }

    // Por seguridad en el colegio, el administrador restablece las credenciales directamente desde su panel
    return NextResponse.json({
      message: 'Solicitud recibida. Por seguridad, comunícate con el administrador de cómputo para restablecer tu contraseña.',
      success: true
    });
  } catch (error) {
    console.error('Error en recuperación de contraseña:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
