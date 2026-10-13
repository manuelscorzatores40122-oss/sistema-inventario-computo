import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

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
    const { template } = await request.json();
    if (!Array.isArray(template) || template.length === 0) {
      return NextResponse.json({ error: 'La plantilla debe contener al menos un turno' }, { status: 400 });
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
