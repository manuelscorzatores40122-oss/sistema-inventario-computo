'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const menuItems = [
  { href: '/admin/dashboard', title: 'Dashboard', icon: '⌂' },
  { href: '/admin/inventario', title: 'Inventario', icon: '▣' },
  { href: '/admin/profesores', title: 'Profesores', icon: '♙' },
  { href: '/admin/disponibilidad', title: 'Disponibilidad', icon: '◷' },
  { href: '/admin/horario', title: 'Horario', icon: '▦' },
  { href: '/admin/solicitudes', title: 'Solicitudes', icon: '✓' },
  { href: '/admin/perfil', title: 'Perfil', icon: '●' },
];

export default function AdminSidebar() {
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
    href === '/admin/dashboard'
      ? pathname === href
      : pathname.startsWith(href);

  return (
    <aside
      className="position-fixed top-0 start-0 h-100 bg-dark text-white"
      style={{
        width: '260px',
        zIndex: 1000,
      }}
    >
      <div className="p-4 border-bottom border-secondary">
        <h2 className="h5 fw-bold mb-1">
          Sistema de Inventario
        </h2>

        <p className="text-secondary small mb-0">
          Panel de Administración
        </p>
      </div>

      <div className="p-4 border-bottom border-secondary">
        <div className="d-flex align-items-center">
          <div
            className="rounded-circle bg-primary d-flex align-items-center justify-content-center fw-bold me-3"
            style={{
              width: '42px',
              height: '42px',
            }}
          >
            {user?.nombre?.charAt(0)?.toUpperCase() || 'A'}
          </div>

          <div>
            <div className="fw-semibold">
              {user?.nombre || 'Administrador'}
            </div>

            <div className="text-secondary small">
              Administrador
            </div>
          </div>
        </div>
      </div>

      <nav className="p-3">
        <div className="text-uppercase text-secondary small fw-bold px-3 mb-2">
          Menú principal
        </div>

        {menuItems.map((item) => {
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`d-flex align-items-center rounded px-3 py-3 mb-1 text-decoration-none ${
                active ? 'text-white' : 'text-light'
              }`}
              style={
                active
                  ? { backgroundColor: '#0d6efd' }
                  : { transition: 'background-color 0.2s' }
              }
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
              <span
                className="me-3 d-flex align-items-center justify-content-center"
                style={{
                  width: '24px',
                }}
              >
                {item.icon}
              </span>

              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="position-absolute bottom-0 start-0 end-0 p-3 border-top border-secondary">
        <div className="small text-secondary px-2">
          Sistema de Gestión
        </div>

        <div className="small text-secondary px-2">
          Administración
        </div>
      </div>
    </aside>
  );
}