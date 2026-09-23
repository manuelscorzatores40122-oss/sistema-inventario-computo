'use client';

import Link from 'next/link';
import Image from 'next/image';
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
} from 'react-icons/fi';

const menuItems = [
  { href: '/admin/dashboard', title: 'Dashboard', icon: FiGrid },
  { href: '/admin/inventario', title: 'Inventario', icon: FiPackage },
  { href: '/admin/prestamos', title: 'Préstamos', icon: FiInbox },
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
      className="position-fixed top-0 start-0 h-100 d-flex flex-column admin-sidebar"
      style={{
        width: '260px',
        zIndex: 1000,
      }}
    >
      <div className="sidebar-header">
        <div className="d-flex align-items-center mb-2">
          <div
            className="d-flex align-items-center justify-content-center me-3"
            style={{ width: '38px', height: '38px', flexShrink: 0 }}
          >
            <Image src="/logo.png" alt="Logo" width={38} height={38} style={{ objectFit: 'contain' }} />
          </div>
          <h2 className="h6 fw-bold mb-0">Sistema de Inventario</h2>
        </div>

        <p className="text-secondary small mb-0 ps-1" style={{ color: 'var(--color-slate-400)' }}>
          Panel de Administración
        </p>
      </div>

      <div className="p-4 border-bottom" style={{ borderColor: 'var(--color-slate-800)' }}>
        <div className="d-flex align-items-center">
          <div
            className="rounded-circle d-flex align-items-center justify-content-center fw-bold me-3 sidebar-brand-icon"
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

            <div className="small" style={{ color: 'var(--color-slate-400)' }}>
              Administrador
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-grow-1 overflow-auto py-3">
        <div className="text-uppercase small fw-bold px-4 mb-3" style={{ color: 'var(--color-slate-500)', letterSpacing: '0.05em' }}>
          Menú Principal
        </div>

        {menuItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-nav-item ${active ? 'active' : ''}`}
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

      <div className="p-3 border-top" style={{ borderColor: 'var(--color-slate-800)' }}>
        <button
          className="sidebar-footer-btn"
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/auth/login';
          }}
        >
          <FiLogOut className="me-3" size={17} style={{ flexShrink: 0 }} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}