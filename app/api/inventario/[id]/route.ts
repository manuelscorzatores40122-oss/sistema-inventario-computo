import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import cloudinary from '@/app/lib/cloudinary';

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
  let uploadedPublicId: string | null = null;
  try {
    const { nombre, descripcion, categoria, cantidad_total, cantidad_disponible, ubicacion, estado, imagen_base64, remove_imagen } = await request.json();
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

    // Obtener public ID anterior por si se reemplaza o elimina
    const prevResult = await query('SELECT imagen_public_id FROM inventario WHERE id = $1', [params.id]);
    const prevPublicId = prevResult.rows[0]?.imagen_public_id;

    let imagen_url = undefined;
    let imagen_public_id = undefined;

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
    } else if (remove_imagen) {
      imagen_url = null;
      imagen_public_id = null;
    }

    let updateQuery = `
       UPDATE inventario
       SET nombre = COALESCE($1, nombre),
           descripcion = COALESCE($2, descripcion),
           categoria = COALESCE($3, categoria),
           cantidad_total = COALESCE($4, cantidad_total),
           cantidad_disponible = COALESCE($5, cantidad_disponible),
           ubicacion = COALESCE($6, ubicacion),
           estado = COALESCE($7, estado),
           updated_at = CURRENT_TIMESTAMP`;
    
    const queryParams: any[] = [nombre, descripcion, categoria, total, disponible, ubicacion, estado, params.id];
    let queryIndex = 9;

    if (imagen_url !== undefined) {
       updateQuery += `, imagen_url = $${queryIndex++}, imagen_public_id = $${queryIndex++}`;
       queryParams.push(imagen_url, imagen_public_id);
    }
    
    updateQuery += ` WHERE id = $8 AND COALESCE($5, cantidad_disponible) <= COALESCE($4, cantidad_total) RETURNING *`;

    let result;
    try {
      result = await query(updateQuery, queryParams);
    } catch (dbError) {
      if (uploadedPublicId) await cloudinary.uploader.destroy(uploadedPublicId).catch(() => null);
      throw dbError;
    }

    if (result.rows.length === 0) {
      if (uploadedPublicId) await cloudinary.uploader.destroy(uploadedPublicId).catch(() => null);
      return NextResponse.json(
        { error: 'Item no encontrado o cantidades inválidas' },
        { status: 404 }
      );
    }

    // Borrar imagen anterior si se subió una nueva o se eliminó intencionalmente
    if ((uploadedPublicId || remove_imagen) && prevPublicId) {
      await cloudinary.uploader.destroy(prevPublicId).catch(() => null);
    }

    return NextResponse.json({
      message: 'Item actualizado',
      item: result.rows[0],
    });
  } catch (error) {
    console.error('Error al actualizar item:', error);
    if (uploadedPublicId) {
      await cloudinary.uploader.destroy(uploadedPublicId).catch(() => null);
    }
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
    const prevResult = await query('SELECT imagen_public_id FROM inventario WHERE id = $1', [params.id]);
    const prevPublicId = prevResult.rows[0]?.imagen_public_id;

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

    // Eliminar imagen de Cloudinary si existía
    if (prevPublicId) {
      await cloudinary.uploader.destroy(prevPublicId).catch(() => null);
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
