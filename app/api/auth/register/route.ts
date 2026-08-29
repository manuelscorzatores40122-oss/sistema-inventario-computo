import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail } from '@/app/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, nombre, apellido, password, telefono } = await request.json();

    if (!email || !nombre || !apellido || !password) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    const existingUser = await getUserByEmail(email);

    if (existingUser) {
      return NextResponse.json(
        { error: 'El email ya está registrado' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    const user = await createUser(email, nombre, apellido, password, 'profesor', telefono);

    return NextResponse.json({
      message: 'Usuario registrado exitosamente',
      user,
    });
  } catch (error) {
    console.error('Error en registro:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
