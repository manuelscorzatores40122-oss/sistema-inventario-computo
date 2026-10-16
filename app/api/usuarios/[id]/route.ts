import { requireSession } from '@/app/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, comparePassword } from '@/app/lib/auth';
import { query } from '@/app/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession(request);
    if (session.response) return session.response;
    if (session.user.role !== 'admin' && String(session.user.id) !== params.id) return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
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
    const session = await requireSession(request);
    if (session.response) return session.response;
    if (session.user.role !== 'admin' && String(session.user.id) !== params.id) return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    const body = await request.json();
    const { email, nombre, apellido, password, role, telefono, correo_personal, activo, current_password, area } = body;
    if ([email, nombre, apellido].some(value => value !== undefined && (typeof value !== 'string' || !value.trim() || value.length > 255)) || (area !== undefined && (typeof area !== 'string' || area.length > 255))) return NextResponse.json({ error: 'Revisa los datos de identidad y el área del docente.' }, { status: 400 });
    if (session.user.role !== 'admin' && ['email', 'dni', 'nombre', 'apellido', 'role', 'activo', 'area', 'oculto'].some(key => key in body)) return NextResponse.json({ error: 'Los datos de identidad y permisos los gestiona administración.' }, { status: 403 });
    if ((telefono != null && (typeof telefono !== 'string' || telefono.length > 20)) || (correo_personal != null && (typeof correo_personal !== 'string' || correo_personal.length > 255 || (correo_personal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo_personal))))) return NextResponse.json({ error: 'Revisa el teléfono y el correo personal.' }, { status: 400 });
    if (password && (typeof password !== 'string' || password.length > 128)) return NextResponse.json({ error: 'Contraseña inválida.' }, { status: 400 });
    if (password && session.user.role !== 'admin') {
      if (password.length < 8 || typeof current_password !== 'string') return NextResponse.json({ error: 'Indica tu contraseña actual y una nueva de al menos 8 caracteres.' }, { status: 400 });
      const credentials = await query('SELECT password FROM usuarios WHERE id = $1', [session.user.id]);
      if (!credentials.rows[0] || !await comparePassword(current_password, credentials.rows[0].password)) return NextResponse.json({ error: 'La contraseña actual no es correcta.' }, { status: 400 });
    }

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
           telefono = CASE WHEN $10::boolean THEN $6 ELSE telefono END,
           activo = COALESCE($7, activo),
           correo_personal = COALESCE($8, correo_personal),
           dni = CASE WHEN $1::text IS NOT NULL AND $1::text ~ '^[0-9]{8}$' THEN $1 ELSE dni END,
           area = COALESCE($11, area),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
        RETURNING id, email, nombre, apellido, role, telefono, correo_personal, dni, area, activo, fecha_creacion, updated_at`,
      [email, nombre, apellido, hashedPassword, role, telefono ?? null, activo, correo_personal ?? null, params.id, Object.prototype.hasOwnProperty.call(body, 'telefono'), area ?? null]
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
    const session = await requireSession(request, true);
    if (session.response) return session.response;
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
