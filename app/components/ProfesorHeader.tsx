'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  FiHome,
  FiFileText,
  FiUser,
  FiLogOut,
} from 'react-icons/fi';

const menuItems = [
  { href: '/profesor/dashboard', title: 'Dashboard', icon: FiHome },
  { href: '/profesor/solicitudes', title: 'Mis Solicitudes', icon: FiFileText },
  { href: '/profesor/perfil', title: 'Mi Perfil', icon: FiUser },
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
    <header className="profesor-header shadow-sm">
      <div className="container-xl py-3">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div className="d-flex align-items-center">
            <div
              className="d-flex align-items-center justify-content-center me-3"
              style={{ width: '40px', height: '40px' }}
            >
              <Image src="/logo.png" alt="Logo" width={40} height={40} style={{ objectFit: 'contain' }} />
            </div>
            <div>
              <div className="text-uppercase small fw-bold mb-1" style={{ color: 'var(--color-slate-400)' }}>
                Sistema de Inventario
              </div>

              <h1 className="h4 fw-bold mb-0">
                Panel del Profesor
              </h1>
            </div>
          </div>

          <nav className="d-flex flex-wrap align-items-center gap-1">
            {menuItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`header-nav-item ${active ? 'active' : ''}`}
                >
                  <Icon size={16} />
                  {item.title}
                </Link>
              );
            })}

            <div className="d-flex align-items-center gap-2 ms-2 border-start ps-3" style={{ borderColor: 'var(--color-slate-800)' }}>
              <div className="text-end d-none d-sm-block">
                <div className="fw-semibold small">
                  {user?.nombre || 'Profesor'}
                </div>

                <div className="small" style={{ color: 'var(--color-slate-400)' }}>
                  Profesor
                </div>
              </div>

              <div
                className="rounded-circle sidebar-brand-icon d-flex align-items-center justify-content-center fw-bold"
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

              <button
                className="header-btn"
                title="Cerrar sesión"
                onClick={() => {
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                  window.location.href = '/auth/login';
                }}
              >
                <FiLogOut size={18} />
              </button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}