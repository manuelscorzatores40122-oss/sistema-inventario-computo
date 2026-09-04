import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

// GET - Obtener item específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await query(
      'SELECT * FROM inventario WHERE id = $1',
      [params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Item no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener item:', error);
    return NextResponse.json(
      { error: 'Error al obtener item' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar item (solo admin)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { nombre, descripcion, categoria, cantidad_total, cantidad_disponible, ubicacion, estado } = await request.json();
    const total = cantidad_total === undefined || cantidad_total === '' ? undefined : Number(cantidad_total);
    const disponible = cantidad_disponible === undefined || cantidad_disponible === '' ? undefined : Number(cantidad_disponible);

    if (total !== undefined && (!Number.isInteger(total) || total < 0)) {
      return NextResponse.json(
        { error: 'Cantidad total inválida' },
        { status: 400 }
      );
    }

    if (disponible !== undefined && (!Number.isInteger(disponible) || disponible < 0)) {
      return NextResponse.json(
        { error: 'Cantidad disponible inválida' },
        { status: 400 }
      );
    }

    const result = await query(
      `UPDATE inventario
       SET nombre = COALESCE($1, nombre),
           descripcion = COALESCE($2, descripcion),
           categoria = COALESCE($3, categoria),
           cantidad_total = COALESCE($4, cantidad_total),
           cantidad_disponible = COALESCE($5, cantidad_disponible),
           ubicacion = COALESCE($6, ubicacion),
           estado = COALESCE($7, estado),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
         AND COALESCE($5, cantidad_disponible) <= COALESCE($4, cantidad_total)
       RETURNING *`,
      [nombre, descripcion, categoria, total, disponible, ubicacion, estado, params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Item no encontrado o cantidades inválidas' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Item actualizado',
      item: result.rows[0],
    });
  } catch (error) {
    console.error('Error al actualizar item:', error);
    return NextResponse.json(
      { error: 'Error al actualizar item' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar item (solo admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await query(
      'DELETE FROM inventario WHERE id = $1 RETURNING id',
      [params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Item no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Item eliminado' });
  } catch (error) {
    console.error('Error al eliminar item:', error);
    return NextResponse.json(
      { error: 'Error al eliminar item' },
      { status: 500 }
    );
  }
}
