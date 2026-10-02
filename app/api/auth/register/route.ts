import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail } from '@/app/lib/auth';
import { query } from '@/app/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { email, dni, nombre, apellido, password, telefono, correo_personal, area } = await request.json();

    const userDni = (dni || email || '').trim();

    if (!userDni || !nombre || !apellido || !password) {
      return NextResponse.json(
        { error: 'Campos requeridos: DNI, nombre, apellido y contraseña' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    const existingUser = await getUserByEmail(userDni);
    if (existingUser) {
      return NextResponse.json(
        { error: 'El DNI o usuario ya está registrado en el sistema' },
        { status: 400 }
      );
    }

    // Se crea con activo = false para requerir aprobación explícita del Administrador
    const user = await createUser(
      userDni,
      nombre.trim(),
      apellido.trim(),
      password,
      'profesor',
      telefono ? telefono.trim() : undefined,
      correo_personal ? correo_personal.trim() : undefined,
      false,
      userDni,
      area ? area.trim() : undefined
    );

    // Notificar a administración sobre la nueva solicitud de registro
    try {
      await query(
        `INSERT INTO notificaciones_whatsapp (usuario_id, numero_telefono, mensaje, tipo, referencia_id, estado)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          user.id,
          telefono || '-',
          `Nueva solicitud de cuenta de docente: ${nombre} ${apellido} (DNI: ${userDni}). Requiere aprobación.`,
          'registro_profesor',
          user.id,
          'pendiente'
        ]
      );
    } catch (e) {
      console.error('Error al registrar notificación de registro:', e);
    }

    return NextResponse.json({
      message: 'Solicitud de registro enviada. El administrador deberá revisar y aprobar tu cuenta para habilitar tu ingreso.',
      user,
    });
  } catch (error: any) {
    console.error('Error en registro:', error);
    if (error?.code === '23505') {
      return NextResponse.json(
        { error: 'El DNI o correo ya está registrado' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Error interno al procesar la solicitud de registro' },
      { status: 500 }
    );
  }
}
