import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

// GET - Listar inventario
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoria = searchParams.get('categoria');
    const estado = searchParams.get('estado') || 'disponible';

    let sql = 'SELECT * FROM inventario WHERE 1=1';
    const params: any[] = [];

    if (categoria) {
      sql += ' AND categoria = $' + (params.length + 1);
      params.push(categoria);
    }

    if (estado) {
      sql += ' AND estado = $' + (params.length + 1);
      params.push(estado);
    }

    sql += ' ORDER BY nombre';

    const result = await query(sql, params);

    return NextResponse.json({
      items: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('Error al obtener inventario:', error);
    return NextResponse.json(
      { error: 'Error al obtener inventario' },
      { status: 500 }
    );
  }
}

// POST - Crear item de inventario (solo admin)
export async function POST(request: NextRequest) {
  try {
    const { nombre, descripcion, categoria, cantidad_total, ubicacion } = await request.json();

    if (!nombre || !categoria || !cantidad_total) {
      return NextResponse.json(
        { error: 'Campos requeridos: nombre, categoria, cantidad_total' },
        { status: 400 }
      );
    }

    const result = await query(
      'INSERT INTO inventario (nombre, descripcion, categoria, cantidad_total, cantidad_disponible, ubicacion) VALUES ($1, $2, $3, $4, $4, $5) RETURNING *',
      [nombre, descripcion, categoria, cantidad_total, ubicacion]
    );

    return NextResponse.json({
      message: 'Item creado exitosamente',
      item: result.rows[0],
    });
  } catch (error) {
    console.error('Error al crear item:', error);
    return NextResponse.json(
      { error: 'Error al crear item' },
      { status: 500 }
    );
  }
}
