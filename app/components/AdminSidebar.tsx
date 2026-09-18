'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const menuItems = [
  { href: '/admin/dashboard', title: 'Dashboard' },
  { href: '/admin/inventario', title: 'Inventario' },
  { href: '/admin/profesores', title: 'Profesores' },
  { href: '/admin/disponibilidad', title: 'Disponibilidad' },
  { href: '/admin/horario', title: 'Horario' },
  { href: '/admin/solicitudes', title: 'Solicitudes' },
  { href: '/admin/perfil', title: 'Perfil' },
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
            className="rounded-circle bg-primary d-flex align-items-center justify-content-center fw-bold me-3 text-white"
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
          Menú Principal
        </div>

        {menuItems.map((item) => {
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`d-flex align-items-center rounded-3 px-3 py-2.5 mb-1 text-decoration-none small font-semibold ${
                active ? 'text-white bg-primary' : 'text-white-50'
              }`}
              style={{ transition: 'background-color 0.2s, color 0.2s' }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = '#343a40';
                  e.currentTarget.style.color = '#ffffff';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.55)';
                }
              }}
            >
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