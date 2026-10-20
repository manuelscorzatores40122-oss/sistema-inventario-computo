import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/app/lib/session';
import { getClient, query } from '@/app/lib/db';
export const dynamic = 'force-dynamic';
const pageNumber = (value: string | null) => Math.max(1, Math.min(100000, Number.parseInt(value || '1', 10) || 1));

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession(request, true);
  if (session.response) return session.response;
  const id = Number(params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: 'Equipo inválido.' }, { status: 400 });
  try {
    const item = await query('SELECT i.*, i.fecha_ingreso::text AS fecha_ingreso, i.fecha_documento::text AS fecha_documento FROM inventario i WHERE id = $1', [id]);
    if (!item.rows.length) return NextResponse.json({ error: 'El equipo no existe.' }, { status: 404 });
    const search = request.nextUrl.searchParams;
    const loanPage = pageNumber(search.get('prestamos'));
    const eventPage = pageNumber(search.get('eventos'));
    const [loans, events, totals, active] = await Promise.all([
      query(`SELECT p.*, concat_ws(' ',u.nombre,u.apellido) AS profesor, u.telefono
        FROM prestamos p JOIN usuarios u ON u.id=p.profesor_id WHERE p.inventario_id=$1
        ORDER BY p.fecha_prestamo DESC,p.id DESC LIMIT 20 OFFSET $2`, [id, (loanPage - 1) * 20]),
      query(`SELECT m.*, concat_ws(' ',u.nombre,u.apellido) AS registrado_por
        FROM movimientos_inventario m LEFT JOIN usuarios u ON u.id=m.usuario_id WHERE m.inventario_id=$1
        ORDER BY m.fecha DESC,m.id DESC LIMIT 20 OFFSET $2`, [id, (eventPage - 1) * 20]),
      query(`SELECT (SELECT count(*)::int FROM prestamos WHERE inventario_id=$1) AS prestamos,
        (SELECT count(*)::int FROM movimientos_inventario WHERE inventario_id=$1) AS eventos`, [id]),
      query(`SELECT p.id,p.estado,p.cantidad,concat_ws(' ',u.nombre,u.apellido) AS profesor
        FROM prestamos p JOIN usuarios u ON u.id=p.profesor_id WHERE p.inventario_id=$1
        AND p.estado IN ('prestado','pendiente') ORDER BY p.fecha_prestamo`, [id]),
    ]);
    return NextResponse.json({ equipo: item.rows[0], prestamos: loans.rows, eventos: events.rows, activos: active.rows, totales: totals.rows[0] }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'No se pudo cargar el historial del equipo.' }, { status: 503 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession(request, true);
  if (session.response) return session.response;
  const id = Number(params.id);
  const body = await request.json().catch(() => null);
  if (!Number.isSafeInteger(id) || id <= 0 || !body || !['reparacion', 'observacion', 'ingreso'].includes(body.tipo) ||
    typeof body.descripcion !== 'string' || !body.descripcion.trim() || body.descripcion.trim().length > 1000) {
    return NextResponse.json({ error: 'Escribe una descripción de hasta 1000 caracteres.' }, { status: 400 });
  }
  const date = body.fecha_ingreso;
  if (body.tipo === 'ingreso' && (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(`${date}T12:00:00Z`)) || new Date(`${date}T12:00:00Z`).toISOString().slice(0,10) !== date ||
    date > new Intl.DateTimeFormat('en-CA', { timeZone:'America/Lima', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date()))) {
    return NextResponse.json({ error: 'Indica una fecha de ingreso válida, hasta hoy.' }, { status: 400 });
  }
  let client: Awaited<ReturnType<typeof getClient>> | undefined;
  try {
    client = await getClient();
    await client.query('BEGIN');
    const item = await client.query('SELECT id FROM inventario WHERE id=$1 FOR UPDATE', [id]);
    if (!item.rows.length) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'El equipo no existe.' }, { status: 404 });
    }
    if (body.tipo === 'ingreso') await client.query('UPDATE inventario SET fecha_ingreso=$2,updated_at=CURRENT_TIMESTAMP WHERE id=$1', [id, date]);
    await client.query(`INSERT INTO movimientos_inventario (inventario_id,tipo_movimiento,cantidad,usuario_id,descripcion)
      VALUES ($1,$2,0,$3,$4)`, [id, body.tipo, session.user.id,
      `${body.tipo === 'ingreso' ? `Fecha de ingreso: ${date}. ` : ''}${body.descripcion.trim()}`]);
    await client.query('COMMIT');
    return NextResponse.json({ message: 'Anotación registrada en el historial.' }, { status: 201 });
  } catch {
    if (client) await client.query('ROLLBACK');
    return NextResponse.json({ error: 'No se pudo guardar la anotación.' }, { status: 500 });
  } finally { client?.release(); }
}
