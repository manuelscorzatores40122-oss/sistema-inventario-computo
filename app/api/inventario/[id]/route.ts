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
    const { nombre, descripcion, categoria, cantidad_total, ubicacion, estado } = await request.json();

    const result = await query(
      'UPDATE inventario SET nombre = COALESCE($1, nombre), descripcion = COALESCE($2, descripcion), categoria = COALESCE($3, categoria), cantidad_total = COALESCE($4, cantidad_total), ubicacion = COALESCE($5, ubicacion), estado = COALESCE($6, estado), updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *',
      [nombre, descripcion, categoria, cantidad_total, ubicacion, estado, params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Item no encontrado' },
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
