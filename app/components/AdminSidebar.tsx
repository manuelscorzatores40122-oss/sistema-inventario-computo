'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  FiGrid,
  FiPackage,
  FiUsers,
  FiCalendar,
  FiInbox,
  FiUser,
  FiLogOut,
  FiShield,
} from 'react-icons/fi';

const menuItems = [
  { href: '/admin/dashboard', title: 'Dashboard', icon: FiGrid },
  { href: '/admin/inventario', title: 'Inventario', icon: FiPackage },
  { href: '/admin/profesores', title: 'Profesores', icon: FiUsers },
  { href: '/admin/horario', title: 'Horario', icon: FiCalendar },
  { href: '/admin/solicitudes', title: 'Solicitudes', icon: FiInbox },
  { href: '/admin/perfil', title: 'Perfil', icon: FiUser },
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
      className="position-fixed top-0 start-0 h-100 bg-dark text-white d-flex flex-column"
      style={{
        width: '260px',
        zIndex: 1000,
      }}
    >
      <div className="p-4 border-bottom border-secondary">
        <div className="d-flex align-items-center mb-2">
          <div
            className="rounded-3 bg-primary d-flex align-items-center justify-content-center me-3"
            style={{ width: '38px', height: '38px', flexShrink: 0 }}
          >
            <FiShield size={20} />
          </div>
          <h2 className="h6 fw-bold mb-0">Sistema de Inventario</h2>
        </div>

        <p className="text-secondary small mb-0 ps-1">
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
              flexShrink: 0,
            }}
          >
            {user?.nombre?.charAt(0)?.toUpperCase() || 'A'}
          </div>

          <div className="min-w-0">
            <div className="fw-semibold text-truncate">
              {user?.nombre || 'Administrador'}
            </div>

            <div className="text-secondary small">
              Administrador
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-grow-1 overflow-auto py-3">
        <div className="text-uppercase text-secondary small fw-bold px-4 mb-3">
          Menú Principal
        </div>

        {menuItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`d-flex align-items-center rounded-3 mx-3 px-3 py-2.5 mb-2 text-decoration-none small font-semibold ${
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
              <Icon
                className="me-3"
                size={17}
                style={{ flexShrink: 0 }}
              />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-top border-secondary">
        <button
          className="d-flex align-items-center w-100 bg-transparent border-0 text-white-50 small text-start px-3 py-2.5 rounded-3 text-decoration-none"
          style={{ transition: 'background-color 0.2s, color 0.2s' }}
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/auth/login';
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#343a40';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.55)';
          }}
        >
          <FiLogOut className="me-3" size={17} style={{ flexShrink: 0 }} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}