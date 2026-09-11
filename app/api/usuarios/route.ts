import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail } from '@/app/lib/auth';
import { query } from '@/app/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const activo = searchParams.get('activo');
    const incluirOcultos = searchParams.get('incluirOcultos') === 'true';

    let sql = 'SELECT id, email, nombre, apellido, role, telefono, correo_personal, activo, fecha_creacion, updated_at FROM usuarios WHERE 1=1';
    const params: string[] = [];

    if (!incluirOcultos) {
      sql += ' AND oculto = false';
    }

    if (role) {
      params.push(role);
      sql += ` AND role = $${params.length}`;
    }

    if (activo === 'true' || activo === 'false') {
      params.push(activo);
      sql += ` AND activo = $${params.length}`;
    }

    sql += ' ORDER BY apellido, nombre';

    const result = await query(sql, params);

    return NextResponse.json({
      usuarios: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, nombre, apellido, password, role = 'profesor', telefono, correo_personal } = await request.json();

    const finalPassword = password || email;

    if (!email || !nombre || !apellido || !finalPassword) {
      return NextResponse.json(
        { error: 'Campos requeridos: email (DNI), nombre, apellido' },
        { status: 400 }
      );
    }

    if (!['admin', 'profesor'].includes(role)) {
      return NextResponse.json(
        { error: 'Rol inválido' },
        { status: 400 }
      );
    }

    if (finalPassword.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
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

    const user = await createUser(email, nombre, apellido, finalPassword, role, telefono, correo_personal);

    return NextResponse.json({
      message: 'Usuario creado exitosamente',
      usuario: user,
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    return NextResponse.json(
      { error: 'Error al crear usuario' },
      { status: 500 }
    );
  }
}
