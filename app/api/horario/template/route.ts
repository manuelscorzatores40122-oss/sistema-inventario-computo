import { requireSession } from '@/app/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
export const dynamic = 'force-dynamic';

const FORMATO_DEFECTO = [
  { hora_inicio: '08:00', hora_fin: '08:45' },
  { hora_inicio: '08:45', hora_fin: '09:30' },
  { hora_inicio: '09:45', hora_fin: '10:30' },
  { hora_inicio: '10:30', hora_fin: '11:15' },
  { hora_inicio: '11:30', hora_fin: '12:15' },
  { hora_inicio: '12:15', hora_fin: '13:00' },
];

export async function GET() {
  try {
    const res = await query("SELECT valor FROM configuracion WHERE clave = 'horario_template' LIMIT 1");
    if (res.rows.length > 0 && res.rows[0].valor) {
      try {
        const parsed = JSON.parse(res.rows[0].valor);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return NextResponse.json({ template: parsed });
        }
      } catch (e) {
        console.error('Error al parsear template de BD:', e);
      }
    }
    return NextResponse.json({ template: FORMATO_DEFECTO });
  } catch (error) {
    console.error('Error al obtener plantilla de horario:', error);
    return NextResponse.json({ template: FORMATO_DEFECTO });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request, true);
    if (session.response) return session.response;
    const { template } = await request.json();
    if (!Array.isArray(template) || template.length === 0 || template.length > 30 || template.some((row: any) => !row || typeof row.hora_inicio !== 'string' || typeof row.hora_fin !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(row.hora_inicio) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(row.hora_fin) || row.hora_inicio >= row.hora_fin) || template.some((row: any, index: number) => template.some((other: any, otherIndex: number) => index !== otherIndex && row.hora_inicio < other.hora_fin && row.hora_fin > other.hora_inicio))) {
      return NextResponse.json({ error: 'La plantilla debe tener turnos válidos, sin cruces de horas' }, { status: 400 });
    }

    const valor = JSON.stringify(template);
    await query(`
      INSERT INTO configuracion (clave, valor, updated_at)
      VALUES ('horario_template', $1, CURRENT_TIMESTAMP)
      ON CONFLICT (clave) DO UPDATE
      SET valor = EXCLUDED.valor, updated_at = CURRENT_TIMESTAMP
    `, [valor]);

    return NextResponse.json({ message: 'Plantilla de horario guardada exitosamente en la base de datos', template });
  } catch (error) {
    console.error('Error al guardar plantilla de horario:', error);
    return NextResponse.json({ error: 'Error interno al guardar horario' }, { status: 500 });
  }
}
