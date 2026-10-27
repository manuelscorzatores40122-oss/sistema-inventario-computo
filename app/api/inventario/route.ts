import { requireSession } from '@/app/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import cloudinary from '@/app/lib/cloudinary';

// GET - Listar inventario
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);
    if (session.response) return session.response;
    const { searchParams } = new URL(request.url);
    const categoria = searchParams.get('categoria');
    const estado = searchParams.get('estado');

    const simple = searchParams.get('simple') === 'true';
    const full = searchParams.get('full') === 'true';

    let sql = simple
      ? 'SELECT id, nombre, categoria, cantidad_disponible, estado FROM inventario WHERE 1=1'
      : full
        ? `SELECT id, nombre, descripcion, categoria, cantidad_total, cantidad_disponible,
                  ubicacion, estado, imagen_url, codigo_patrimonial, marca, modelo,
                  condicion, numero_serie, color, nivel, observaciones, procedencia_entidad,
                  documento_sustentatorio, fecha_documento, situacion_administrativa,
                  situacion_detalle, fecha_creacion, updated_at
           FROM inventario WHERE 1=1`
        : `SELECT id, nombre, descripcion, categoria, cantidad_total, cantidad_disponible,
                  ubicacion, estado, imagen_url, codigo_patrimonial, marca, modelo,
                  condicion, numero_serie, color, nivel, situacion_administrativa
           FROM inventario WHERE 1=1`;
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
    }, {
      headers: {
        'Cache-Control': 'private, no-cache, no-transform',
      }
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
    const session = await requireSession(request, true);
    if (session.response) return session.response;
    const {
      nombre,
      descripcion,
      categoria,
      cantidad_total,
      cantidad_disponible,
      ubicacion,
      estado = 'disponible',
      imagen_base64,
      codigo_patrimonial,
      marca,
      modelo,
      condicion = 'bueno',
      numero_serie,
      color,
      nivel,
      observaciones,
      procedencia_entidad,
      documento_sustentatorio,
      fecha_documento,
      situacion_administrativa = 'activo',
      situacion_detalle
    } = await request.json();

    const total = Number(cantidad_total);

    if (!nombre || !categoria || !Number.isInteger(total) || total < 0) {
      return NextResponse.json(
        { error: 'Campos requeridos: nombre, categoria y cantidad_total válida' },
        { status: 400 }
      );
    }

    const adminSituacion = situacion_administrativa || 'activo';
    const fisicaCondicion = condicion || 'bueno';
    let estadoFinal = estado || 'disponible';

    // Regla de integridad: si es baja, perdido, pendiente o malo -> nunca disponible
    if (fisicaCondicion === 'malo' && estadoFinal === 'disponible') {
      estadoFinal = 'mantenimiento';
    }
    if (['baja', 'perdido', 'pendiente_revision'].includes(adminSituacion) && estadoFinal === 'disponible') {
      estadoFinal = 'no_prestable';
    }

    let disponible = cantidad_disponible === undefined || cantidad_disponible === ''
      ? (estadoFinal === 'no_prestable' ? 0 : total)
      : Number(cantidad_disponible);

    if (estadoFinal === 'no_prestable') {
      disponible = 0;
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
    }

    let result;
    try {
      result = await query(
        `INSERT INTO inventario (
          nombre, descripcion, categoria, cantidad_total, cantidad_disponible,
          ubicacion, estado, imagen_url, imagen_public_id, codigo_patrimonial,
          marca, modelo, condicion, numero_serie, color, nivel,
          observaciones, procedencia_entidad, documento_sustentatorio, fecha_documento,
          situacion_administrativa, situacion_detalle
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22) RETURNING *`,
        [
          nombre,
          descripcion || null,
          categoria,
          total,
          disponible,
          ubicacion || null,
          estadoFinal,
          imagen_url,
          imagen_public_id,
          codigo_patrimonial || null,
          marca || null,
          modelo || null,
          fisicaCondicion,
          numero_serie || null,
          color || null,
          nivel || null,
          observaciones || null,
          procedencia_entidad || null,
          documento_sustentatorio || null,
          fecha_documento || null,
          adminSituacion,
          situacion_detalle || null
        ]
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
