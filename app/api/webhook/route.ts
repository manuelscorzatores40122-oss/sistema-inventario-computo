import { NextResponse } from 'next/server';

// Webhook externo desactivado: las notificaciones son 100% internas del sistema
export async function GET() {
  return NextResponse.json({ message: 'Notificaciones internas activas en el sistema' }, { status: 200 });
}

export async function POST() {
  return NextResponse.json({ message: 'Notificaciones internas activas en el sistema' }, { status: 200 });
}
