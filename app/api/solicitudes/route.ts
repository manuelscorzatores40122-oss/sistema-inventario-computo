import { NextRequest, NextResponse } from 'next/server';
import { getClient, query } from '@/app/lib/db';
import { notifyAdminsOfRequest } from '@/app/lib/admin-notifications';

// GET - Listar solicitudes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');
    const profesor_id = searchParams.get('profesor_id');

    let sql = `SELECT s.*,
                      u.nombre as profesor_nombre,
                      u.apellido,
                      COALESCE(i.nombre, 'Aula de Cómputo (' || d.dia_semana || ' ' || TO_CHAR(d.fecha_reserva, 'DD/MM/YYYY') || ' ' || d.hora_inicio || '-' || d.hora_fin || ')') as item_nombre
               FROM solicitudes s
               JOIN usuarios u ON s.profesor_id = u.id
               LEFT JOIN inventario i ON s.inventario_id = i.id
               LEFT JOIN disponibilidad d ON s.disponibilidad_id = d.id
               WHERE 1=1`;
    const params: any[] = [];

    if (estado) {
      sql += ' AND s.estado = $' + (params.length + 1);
      params.push(estado);
    }

    if (profesor_id) {
      sql += ' AND s.profesor_id = $' + (params.length + 1);
      params.push(profesor_id);
    }

    sql += ' ORDER BY s.fecha_solicitud DESC';

    const result = await query(sql, params);

    return NextResponse.json({
      solicitudes: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    return NextResponse.json(
      { error: 'Error al obtener solicitudes' },
      { status: 500 }
    );
  }
}

// POST - Crear solicitud (profesor)
export async function POST(request: NextRequest) {
  try {
    const { profesor_id, inventario_id, cantidad_solicitada, motivo, tipo_solicitud, fecha_reserva, hora_inicio, hora_fin, seccion, numero_aula } = await request.json();
    const cantidad = inventario_id ? Number(cantidad_solicitada || 1) : 1;
    let seccionLimpia: string | null = null;
    let aulaLimpia: string | null = null;
    // La reserva ya identifica el ambiente; la ubicación solo corresponde a equipos.
    if (tipo_solicitud !== 'aula') {
      if ((seccion != null && typeof seccion !== 'string') || (numero_aula != null && typeof numero_aula !== 'string')) {
        return NextResponse.json({ error: 'La sección y el número de aula deben ser texto.' }, { status: 400 });
      }
      seccionLimpia = seccion?.trim() || null;
      aulaLimpia = numero_aula?.trim() || null;
      if (!seccionLimpia && !aulaLimpia) {
        return NextResponse.json({ error: 'Indica la sección o el número de aula donde lo usarás.' }, { status: 400 });
      }
      if ((seccionLimpia?.length || 0) > 60 || (aulaLimpia?.length || 0) > 30) {
        return NextResponse.json({ error: 'La sección admite hasta 60 caracteres y el aula hasta 30.' }, { status: 400 });
      }
    }


    if (!profesor_id) {
      return NextResponse.json({ error: 'Faltan parámetros de profesor' }, { status: 400 });
    }

    if (tipo_solicitud === 'aula' && (!fecha_reserva || !hora_inicio || !hora_fin)) {
      return NextResponse.json({ error: 'Para solicitar un aula debes especificar fecha y horas' }, { status: 400 });
    }

    if (tipo_solicitud === 'aula') {
      const validDate = typeof fecha_reserva === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha_reserva);
      const validTime = (value: unknown) => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
      const start = new Date(`${fecha_reserva}T${hora_inicio}:00-05:00`);
      if (!validDate || !validTime(hora_inicio) || !validTime(hora_fin) || !Number.isFinite(start.getTime()) || hora_inicio >= hora_fin) {
        return NextResponse.json({ error: 'Indica una fecha válida y una hora de fin posterior al inicio.' }, { status: 400 });
      }
      if (start <= new Date()) {
        return NextResponse.json({ error: 'La reserva debe comenzar en un horario futuro.' }, { status: 400 });
      }
    }

    if (tipo_solicitud !== 'aula' && (!inventario_id || !Number.isInteger(cantidad) || cantidad <= 0)) {
      return NextResponse.json({ error: 'Selecciona un artículo de inventario válido' }, { status: 400 });
    }

    const client = await getClient();

    try {
      await client.query('BEGIN');

      let itemNombre = '';
      let idDisponibilidad = null;

      if (tipo_solicitud === 'aula') {
        const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const dateObj = new Date(fecha_reserva + 'T12:00:00');
        const dia_semana = dias[dateObj.getDay()];

        // Serializar solicitudes para evitar reservas simultáneas superpuestas.
        await client.query('SELECT pg_advisory_xact_lock(3011, 1)');

        // Verificar si el aula ya está ocupada en ese horario
        const overlapCheck = await client.query(
          `SELECT id FROM disponibilidad 
           WHERE (
             (fecha_reserva IS NULL AND dia_semana = $1)
             OR (fecha_reserva::date = $2::date)
           )
           AND estado IN ('separado', 'pendiente')
           AND hora_inicio < $4
           AND hora_fin > $3
           LIMIT 1`,
          [dia_semana, fecha_reserva, hora_inicio, hora_fin]
        );

        if (overlapCheck.rows.length > 0) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: 'No se puede solicitar: el aula ya estará ocupada en ese horario.' }, { status: 400 });
        }

        const resultDisp = await client.query(
          `INSERT INTO disponibilidad (sala_nombre, dia_semana, hora_inicio, hora_fin, estado, reservado_por, motivo_reserva, fecha_reserva)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id`,
          ['Sala de Cómputo', dia_semana, hora_inicio, hora_fin, 'pendiente', profesor_id, motivo, fecha_reserva]
        );
        idDisponibilidad = resultDisp.rows[0].id;
        itemNombre = `Aula de Cómputo (${dia_semana} ${fecha_reserva.split('-').reverse().join('/')} ${hora_inicio}-${hora_fin})`;
      } else {
        const inventario = await client.query(
          'SELECT id, nombre, cantidad_disponible FROM inventario WHERE id = $1 AND estado = $2 FOR UPDATE',
          [inventario_id, 'disponible']
        );

        if (inventario.rows.length === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: 'Artículo no disponible' }, { status: 404 });
        }

        if (inventario.rows[0].cantidad_disponible < cantidad) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: 'No hay suficiente stock disponible' }, { status: 400 });
        }

        itemNombre = `${cantidad} ${inventario.rows[0].nombre}`;
      }

      const result = await client.query(
        'INSERT INTO solicitudes (profesor_id, inventario_id, disponibilidad_id, cantidad_solicitada, motivo, seccion, numero_aula) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [profesor_id, tipo_solicitud === 'aula' ? null : inventario_id, idDisponibilidad, cantidad, motivo, seccionLimpia, aulaLimpia]
      );

      await notifyAdminsOfRequest(client, result.rows[0].id, profesor_id, 'creada', itemNombre);

      await client.query('COMMIT');

      return NextResponse.json({
        message: 'Solicitud creada exitosamente',
        solicitud: result.rows[0],
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error al crear solicitud:', error);
    return NextResponse.json(
      { error: 'Error al crear solicitud: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
