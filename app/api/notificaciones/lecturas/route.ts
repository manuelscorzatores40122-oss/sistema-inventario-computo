import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/app/lib/session';
import { query } from '@/app/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);
    if (session.response) return session.response;
    const result = await query('SELECT notification_key FROM notificaciones_lecturas WHERE usuario_id = $1 ORDER BY leida_at DESC LIMIT 2000', [session.user.id]);
    const storedKeys = result.rows.map(row => row.notification_key as string);
    return NextResponse.json({
      keys: storedKeys.filter(key => !key.startsWith('dismissed-')),
      dismissedKeys: storedKeys.filter(key => key.startsWith('dismissed-')).map(key => key.slice('dismissed-'.length)),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { console.error('Error al consultar lecturas:', error); return NextResponse.json({ error: 'No pudimos sincronizar tus lecturas.' }, { status: 500 }); }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireSession(request);
    if (session.response) return session.response;
    const body = await request.json().catch(() => null);
    const requestedKeys = Array.isArray(body?.keys) ? body.keys : [body?.key];
    const keys = Array.from(new Set(requestedKeys));
    if (!keys.length || keys.length > 200 || keys.some(key => typeof key !== 'string' || !/^[a-z0-9-]{1,70}$/.test(key))) {
      return NextResponse.json({ error: 'Notificación inválida.' }, { status: 400 });
    }
    await query(`INSERT INTO notificaciones_lecturas (usuario_id, notification_key)
      SELECT $1, 'dismissed-' || notification_key FROM unnest($2::text[]) AS keys(notification_key)
      ON CONFLICT (usuario_id, notification_key) DO NOTHING`, [session.user.id, keys]);
    return NextResponse.json({ message: 'Notificaciones borradas.' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error al borrar notificación:', error);
    return NextResponse.json({ error: 'No pudimos borrar la notificación.' }, { status: 500 });
  }
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
