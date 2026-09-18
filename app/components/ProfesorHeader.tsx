'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const menuItems = [
  { href: '/profesor/dashboard', title: 'Dashboard' },
  { href: '/profesor/solicitudes', title: 'Mis Solicitudes' },
  { href: '/profesor/disponibilidad', title: 'Mi Disponibilidad' },
  { href: '/profesor/perfil', title: 'Mi Perfil' },
];

export default function ProfesorHeader() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const data = localStorage.getItem('user');
    if (data) {
      try {
        setUser(JSON.parse(data));
      } catch (error) {
        console.error('Error al leer usuario:', error);
      }
    }
  }, []);

  const isActive = (href: string) =>
    href === '/profesor/dashboard'
      ? pathname === href
      : pathname.startsWith(href);

  return (
    <header className="bg-dark text-white shadow-sm">
      <div className="container-xl py-3">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <div className="text-uppercase small text-secondary fw-bold mb-1">
              Sistema de Inventario
            </div>

            <h1 className="h4 fw-bold mb-0">
              Panel del Profesor
            </h1>
          </div>

          <nav className="d-flex flex-wrap align-items-center gap-1">
            {menuItems.map((item) => {
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-3 text-decoration-none small fw-semibold ${
                    active ? 'bg-primary text-white' : 'text-white-50'
                  }`}
                  style={{ transition: 'background-color 0.2s' }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = '#343a40';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {item.title}
                </Link>
              );
            })}

            <div className="d-flex align-items-center gap-2 ms-2">
              <div className="text-end d-none d-sm-block">
                <div className="fw-semibold small">
                  {user?.nombre || 'Profesor'}
                </div>

                <div className="small text-white-50">
                  Profesor
                </div>
              </div>

              <div
                className="rounded-circle bg-primary d-flex align-items-center justify-content-center fw-bold text-white"
                style={{
                  width: '42px',
                  height: '42px',
                  fontSize: '16px',
                }}
              >
                {user?.nombre
                  ? user.nombre.charAt(0).toUpperCase()
                  : 'P'}
              </div>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}