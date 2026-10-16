import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/app/lib/session';
import { query } from '@/app/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);
    if (session.response) return session.response;
    const result = await query('SELECT notification_key FROM notificaciones_lecturas WHERE usuario_id = $1 ORDER BY leida_at DESC LIMIT 1000', [session.user.id]);
    return NextResponse.json({ keys: result.rows.map(row => row.notification_key) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { console.error('Error al consultar lecturas:', error); return NextResponse.json({ error: 'No pudimos sincronizar tus lecturas.' }, { status: 500 }); }
}
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request);
    if (session.response) return session.response;
    const { keys } = await request.json();
    if (!Array.isArray(keys) || keys.length > 200 || keys.some(key => typeof key !== 'string' || !/^[a-z0-9-]{1,80}$/.test(key))) return NextResponse.json({ error: 'Avisos inválidos.' }, { status: 400 });
    await query(`INSERT INTO notificaciones_lecturas (usuario_id, notification_key)
      SELECT $1, unnest($2::text[]) ON CONFLICT (usuario_id, notification_key) DO NOTHING`, [session.user.id, Array.from(new Set(keys))]);
    return NextResponse.json({ message: 'Lectura guardada.' });
  } catch (error) { console.error('Error al guardar lectura:', error); return NextResponse.json({ error: 'No pudimos guardar la lectura.' }, { status: 500 }); }
}
