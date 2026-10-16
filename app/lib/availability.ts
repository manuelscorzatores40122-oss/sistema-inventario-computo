import { NextRequest, NextResponse } from 'next/server';
import { getClient } from './db';
import { requireSession } from './session';
import { WEEKDAYS } from './teacher-utils';

export async function saveAvailability(request: NextRequest, id?: string) {
  let client;
  try {
    const auth = await requireSession(request, true);
    if (auth.response) return auth.response;
    const body = await request.json();
    client = await getClient();
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(3011, 1)');
    let current: Record<string, any> = {};
    if (id) {
      const result = await client.query('SELECT * FROM disponibilidad WHERE id = $1 FOR UPDATE', [id]);
      if (!result.rows.length) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Turno no encontrado.' }, { status: 404 }); }
      current = result.rows[0];
    }
    const row = { sala_nombre: 'Horario de Clases', estado: 'disponible', reservado_por: null, motivo_reserva: null, fecha_reserva: null, ...current, ...body };
    if (body.reservado_por && !body.estado) row.estado = 'separado';
    if (!['disponible', 'separado'].includes(row.estado) || !WEEKDAYS.includes(row.dia_semana) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(row.hora_inicio) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(row.hora_fin) || row.hora_inicio >= row.hora_fin ||
        typeof row.sala_nombre !== 'string' || !row.sala_nombre.trim() || row.sala_nombre.length > 255 ||
        (row.motivo_reserva != null && (typeof row.motivo_reserva !== 'string' || row.motivo_reserva.length > 255))) {
      await client.query('ROLLBACK'); return NextResponse.json({ error: 'Revisa el día, las horas y el motivo del turno.' }, { status: 400 });
    }
    const recurrent = body.es_recurrente ?? (row.sala_nombre === 'Horario de Clases' && !body.fecha_reserva);
    let date = recurrent ? null : row.fecha_reserva;
    if (date instanceof Date) date = date.toISOString().slice(0, 10);
    if (typeof date === 'string') date = date.slice(0, 10);
    if (!recurrent && (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) {
      await client.query('ROLLBACK'); return NextResponse.json({ error: 'Indica una fecha válida para la reserva puntual.' }, { status: 400 });
    }
    if (date) row.dia_semana = WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()];
    if (row.estado === 'disponible') { row.reservado_por = null; row.motivo_reserva = null; }
    if (row.estado === 'separado') {
      const teacher = await client.query("SELECT id FROM usuarios WHERE id = $1 AND role = 'profesor' AND activo = true", [row.reservado_por]);
      if (!teacher.rows.length) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Selecciona un docente activo.' }, { status: 400 }); }
      const overlap = await client.query(`SELECT id FROM disponibilidad WHERE id <> COALESCE($1::int, 0)
        AND estado IN ('separado', 'pendiente') AND dia_semana = $2
        AND (fecha_reserva IS NULL OR ($3::date IS NOT NULL AND fecha_reserva::date = $3::date)
             OR ($3::date IS NULL AND fecha_reserva::date >= CURRENT_DATE))
        AND hora_inicio < $5 AND hora_fin > $4 LIMIT 1`, [id || null, row.dia_semana, date, row.hora_inicio, row.hora_fin]);
      if (overlap.rows.length) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Este turno se cruza con otra clase o reserva. Selecciona otro horario.' }, { status: 409 }); }
    }
    const params = [row.sala_nombre.trim(), row.dia_semana, row.hora_inicio, row.hora_fin, row.estado, row.reservado_por, row.motivo_reserva, date, recurrent];
    const result = id ? await client.query(`UPDATE disponibilidad SET sala_nombre=$1, dia_semana=$2, hora_inicio=$3, hora_fin=$4,
      estado=$5, reservado_por=$6, motivo_reserva=$7, fecha_reserva=$8, es_recurrente=$9, updated_at=CURRENT_TIMESTAMP WHERE id=$10 RETURNING *`, [...params, id])
      : await client.query(`INSERT INTO disponibilidad (sala_nombre,dia_semana,hora_inicio,hora_fin,estado,reservado_por,motivo_reserva,fecha_reserva,es_recurrente)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, params);
    await client.query('COMMIT');
    return NextResponse.json({ message: 'Turno guardado correctamente.', disponibilidad: result.rows[0] });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Error al guardar el horario:', error);
    return NextResponse.json({ error: 'No pudimos guardar el turno. Revisa los datos e intenta nuevamente.' }, { status: 500 });
  } finally { client?.release(); }
}
