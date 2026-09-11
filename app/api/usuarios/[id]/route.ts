import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/app/lib/auth';
import { query } from '@/app/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await query(
      'SELECT id, email, nombre, apellido, role, telefono, correo_personal, dni, area, activo, fecha_creacion, updated_at FROM usuarios WHERE id = $1',
      [params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ usuario: result.rows[0] });
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuario' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { email, nombre, apellido, password, role, telefono, correo_personal, activo } = await request.json();

    if (role && !['admin', 'profesor'].includes(role)) {
      return NextResponse.json(
        { error: 'Rol inválido' },
        { status: 400 }
      );
    }

    if (password && password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    const hashedPassword = password ? await hashPassword(password) : null;

    const result = await query(
      `UPDATE usuarios
       SET email = COALESCE($1, email),
           nombre = COALESCE($2, nombre),
           apellido = COALESCE($3, apellido),
           password = COALESCE($4, password),
           role = COALESCE($5, role),
           telefono = $6,
           activo = COALESCE($7, activo),
           correo_personal = COALESCE($8, correo_personal),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING id, email, nombre, apellido, role, telefono, correo_personal, activo, fecha_creacion, updated_at`,
      [email, nombre, apellido, hashedPassword, role, telefono ?? null, activo, correo_personal ?? null, params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Usuario actualizado',
      usuario: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error al actualizar usuario:', error);

    if (error?.code === '23505') {
      return NextResponse.json(
        { error: 'El email ya está registrado' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error al actualizar usuario' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const hard = new URL(request.url).searchParams.get('hard') === 'true';

    const result = hard
      ? await query('DELETE FROM usuarios WHERE id = $1 RETURNING id', [params.id])
      : await query(
          'UPDATE usuarios SET activo = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
          [params.id]
        );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: hard ? 'Usuario eliminado' : 'Usuario desactivado' });
  } catch (error: any) {
    console.error('Error al eliminar usuario:', error);

    if (error?.code === '23503') {
      return NextResponse.json(
        { error: 'No se puede eliminar porque tiene registros asociados. Se recomienda desactivarlo.' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Error al eliminar usuario' },
      { status: 500 }
    );
  }
}
