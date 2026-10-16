import { NextResponse } from 'next/server';
export async function POST() {
  return NextResponse.json({ message: 'Para recuperar tu acceso, solicita a la administración del colegio que restablezca tu contraseña.' });
}
