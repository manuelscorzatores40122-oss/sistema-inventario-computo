import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ message: 'Sesión cerrada exitosamente' });
  
  response.cookies.set({
    name: 'auth-token',
    value: '',
    httpOnly: true,
    secure: process.env.VERCEL === '1',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
    expires: new Date(0),
  });

  return response;
}
