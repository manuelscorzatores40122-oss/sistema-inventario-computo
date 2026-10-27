import { requireSession } from '@/app/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import cloudinary from '@/app/lib/cloudinary';

// GET - Obtener item específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession(request);
    if (session.response) return session.response;
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
    const session = await requireSession(request, true);
    if (session.response) return session.response;
    const {
      nombre,
      descripcion,
      categoria,
      cantidad_total,
      cantidad_disponible,
      ubicacion,
      estado,
      imagen_base64,
      remove_imagen,
      codigo_patrimonial,
      marca,
      modelo,
      condicion,
      numero_serie,
      color,
      nivel,
      observaciones,
      procedencia_entidad,
      documento_sustentatorio,
      fecha_documento,
      situacion_administrativa,
      situacion_detalle
    } = await request.json();

    const total = cantidad_total === undefined || cantidad_total === '' ? undefined : Number(cantidad_total);
    let disponible = cantidad_disponible === undefined || cantidad_disponible === '' ? undefined : Number(cantidad_disponible);

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

    // Obtener item actual para resolver coherencia de estado y fotos
    const prevResult = await query('SELECT * FROM inventario WHERE id = $1', [params.id]);
    if (prevResult.rows.length === 0) {
      return NextResponse.json({ error: 'Item no encontrado' }, { status: 404 });
    }
    const currentItem = prevResult.rows[0];
    const prevPublicId = currentItem.imagen_public_id;

    const finalAdmin = situacion_administrativa !== undefined ? situacion_administrativa : currentItem.situacion_administrativa;
    const finalCondicion = condicion !== undefined ? condicion : currentItem.condicion;
    let finalEstado = estado !== undefined ? estado : currentItem.estado;

    // Reglas de integridad
    if (finalCondicion === 'malo' && finalEstado === 'disponible') {
      finalEstado = 'mantenimiento';
    }
    if (['baja', 'perdido', 'pendiente_revision'].includes(finalAdmin) && finalEstado === 'disponible') {
      finalEstado = 'no_prestable';
    }
    if (finalEstado === 'no_prestable') {
      disponible = 0;
    }

    const effectiveTotal = total !== undefined ? total : currentItem.cantidad_total;
    const effectiveDisp = disponible !== undefined ? disponible : currentItem.cantidad_disponible;

    if (effectiveDisp > effectiveTotal) {
      return NextResponse.json(
        { error: 'La cantidad disponible no puede exceder la cantidad total' },
        { status: 400 }
      );
    }

    let imagen_url = undefined;
    let imagen_public_id = undefined;

    if (imagen_base64) {
      if (typeof imagen_base64 !== 'string' || imagen_base64.length > 2 * 1024 * 1024 || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(imagen_base64)) {
        return NextResponse.json({ error: 'La foto no tiene un formato valido o supera el limite. Vuelve a seleccionarla.' }, { status: 400 });
      }
      const imageConfig = cloudinary.config();
      if (!imageConfig.cloud_name || !imageConfig.api_key || !imageConfig.api_secret) {
        return NextResponse.json({ error: 'La carga de fotos no esta configurada en este servidor. Administracion debe configurar Cloudinary; puedes quitar la foto para guardar el articulo.' }, { status: 503 });
      }
      try {
        const uploadResponse = await cloudinary.uploader.upload(imagen_base64, {
          folder: 'inventario'
        });
        imagen_url = uploadResponse.secure_url;
        imagen_public_id = uploadResponse.public_id;
        uploadedPublicId = imagen_public_id;
      } catch (uploadError) {
        console.error('Error Cloudinary upload:', uploadError);
        return NextResponse.json({ error: 'No se pudo subir la foto. Tus datos siguen en el formulario: reintenta o quita la imagen para guardar el articulo.' }, { status: 503 });
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
           codigo_patrimonial = COALESCE($8, codigo_patrimonial),
           marca = COALESCE($9, marca),
           modelo = COALESCE($10, modelo),
           condicion = COALESCE($11, condicion),
           numero_serie = COALESCE($12, numero_serie),
           color = COALESCE($13, color),
           nivel = COALESCE($14, nivel),
           observaciones = COALESCE($15, observaciones),
           procedencia_entidad = COALESCE($16, procedencia_entidad),
           documento_sustentatorio = COALESCE($17, documento_sustentatorio),
           fecha_documento = COALESCE($18, fecha_documento),
           situacion_administrativa = COALESCE($19, situacion_administrativa),
           situacion_detalle = COALESCE($20, situacion_detalle),
           updated_at = CURRENT_TIMESTAMP`;
    
    const queryParams: any[] = [
      nombre !== undefined ? nombre : null,
      descripcion !== undefined ? descripcion : null,
      categoria !== undefined ? categoria : null,
      total !== undefined ? total : null,
      disponible !== undefined ? disponible : null,
      ubicacion !== undefined ? ubicacion : null,
      finalEstado !== undefined ? finalEstado : null,
      codigo_patrimonial !== undefined ? codigo_patrimonial : null,
      marca !== undefined ? marca : null,
      modelo !== undefined ? modelo : null,
      finalCondicion !== undefined ? finalCondicion : null,
      numero_serie !== undefined ? numero_serie : null,
      color !== undefined ? color : null,
      nivel !== undefined ? nivel : null,
      observaciones !== undefined ? observaciones : null,
      procedencia_entidad !== undefined ? procedencia_entidad : null,
      documento_sustentatorio !== undefined ? documento_sustentatorio : null,
      fecha_documento !== undefined ? fecha_documento : null,
      finalAdmin !== undefined ? finalAdmin : null,
      situacion_detalle !== undefined ? situacion_detalle : null,
      params.id
    ];
    let queryIndex = 22;

    if (imagen_url !== undefined) {
       updateQuery += `, imagen_url = $${queryIndex++}, imagen_public_id = $${queryIndex++}`;
       queryParams.push(imagen_url, imagen_public_id);
    }
    
    updateQuery += ` WHERE id = $21 RETURNING *`;

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
    const session = await requireSession(request, true);
    if (session.response) return session.response;
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
