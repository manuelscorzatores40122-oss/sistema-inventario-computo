'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export interface Usuario {
  nombre?: string;
  [key: string]: unknown;
}

export function useProfesorHeader() {
  const pathname = usePathname() ?? '';
  const [user, setUser] = useState<Usuario | null>(null);

  /* Usuario guardado en el navegador */
  useEffect(() => {
    try {
      const data = localStorage.getItem('user');
      if (data) setUser(JSON.parse(data));
    } catch (error) {
      console.error('Error al leer usuario:', error);
    }
  }, []);

  const isActive = useCallback(
    (href: string) =>
      href === '/profesor/dashboard' ? pathname === href : pathname.startsWith(href),
    [pathname]
  );

  const cerrarSesion = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/auth/login';
  };

  const nombre = user?.nombre || 'Profesor';
  const primerNombre = nombre.split(' ')[0];
  const inicial = nombre.charAt(0).toUpperCase();

  return { nombre, primerNombre, inicial, isActive, cerrarSesion };
}