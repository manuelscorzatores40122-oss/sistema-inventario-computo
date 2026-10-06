import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import cloudinary from '@/app/lib/cloudinary';

// GET - Listar inventario
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoria = searchParams.get('categoria');
    const estado = searchParams.get('estado');

    let sql = 'SELECT * FROM inventario WHERE 1=1';
    const params: any[] = [];

    if (categoria) {
      sql += ' AND categoria = $' + (params.length + 1);
      params.push(categoria);
    }

    if (estado && estado !== 'todos') {
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
  let uploadedPublicId: string | null = null;
  try {
    const { nombre, descripcion, categoria, cantidad_total, cantidad_disponible, ubicacion, estado = 'disponible', imagen_base64 } = await request.json();
    const total = Number(cantidad_total);
    const disponible = cantidad_disponible === undefined || cantidad_disponible === ''
      ? total
      : Number(cantidad_disponible);

    if (!nombre || !categoria || !Number.isInteger(total) || total < 0) {
      return NextResponse.json(
        { error: 'Campos requeridos: nombre, categoria y cantidad_total válida' },
        { status: 400 }
      );
    }

    if (!Number.isInteger(disponible) || disponible < 0 || disponible > total) {
      return NextResponse.json(
        { error: 'La cantidad disponible debe estar entre 0 y la cantidad total' },
        { status: 400 }
      );
    }

    let imagen_url = null;
    let imagen_public_id = null;

    if (imagen_base64) {
      try {
        const uploadResponse = await cloudinary.uploader.upload(imagen_base64, {
          folder: 'inventario'
        });
        imagen_url = uploadResponse.secure_url;
        imagen_public_id = uploadResponse.public_id;
        uploadedPublicId = imagen_public_id;
      } catch (uploadError) {
        console.error('Error Cloudinary upload:', uploadError);
        return NextResponse.json({ error: 'Error al subir la imagen' }, { status: 500 });
      }
    }

    let result;
    try {
      result = await query(
        'INSERT INTO inventario (nombre, descripcion, categoria, cantidad_total, cantidad_disponible, ubicacion, estado, imagen_url, imagen_public_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
        [nombre, descripcion, categoria, total, disponible, ubicacion, estado, imagen_url, imagen_public_id]
      );
    } catch (dbError) {
      if (uploadedPublicId) {
        await cloudinary.uploader.destroy(uploadedPublicId).catch(() => null);
      }
      throw dbError;
    }

    return NextResponse.json({
      message: 'Item creado exitosamente',
      item: result.rows[0],
    });
  } catch (error) {
    console.error('Error al crear item:', error);
    if (uploadedPublicId) {
      await cloudinary.uploader.destroy(uploadedPublicId).catch(() => null);
    }
    return NextResponse.json(
      { error: 'Error al crear item' },
      { status: 500 }
    );
  }
}
