import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/app/lib/session';
import { query } from '@/app/lib/db';
import { loanDeadline } from '@/app/lib/loan-deadline';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await requireSession(request, true);
  if (session.response) return session.response;
  try {
    const result = await query(`SELECT p.id, p.inventario_id, p.cantidad, p.fecha_prestamo,
      i.nombre AS equipo, concat_ws(' ', u.nombre, u.apellido) AS profesor, u.telefono,
      (SELECT valor FROM configuracion WHERE clave = 'horario_template') AS template
      FROM prestamos p JOIN inventario i ON i.id = p.inventario_id
      JOIN usuarios u ON u.id = p.profesor_id WHERE p.estado = 'prestado'
      ORDER BY p.fecha_prestamo`);
    const now = Date.now();
    const loans = result.rows.map(({ template, ...row }) => ({
      ...row, vence: loanDeadline(row.fecha_prestamo, template),
    })).filter(row => row.vence && Date.parse(row.vence) <= now);
    return NextResponse.json({ prestamos: loans, actualizado: new Date(now).toISOString() }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'No se pudieron consultar los préstamos vencidos.' }, { status: 503 });
  }
}
