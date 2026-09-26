'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import NotificacionesBell from './NotificacionesBell';
import {
  FiHome,
  FiFileText,
  FiUser,
  FiLogOut,
} from 'react-icons/fi';

const menuItems = [
  { href: '/profesor/dashboard', title: 'Inicio', icon: FiHome },
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
    <aside className="profesor-header">
      <div className="profesor-sidebar-brand">
        <Image src="/logo.png" alt="Logo" width={48} height={48} style={{ objectFit: 'contain' }} />
        <div>
          <div className="profesor-sidebar-kicker">I.E. Manuel Scorza</div>
          <div className="profesor-sidebar-title">Panel docente</div>
        </div>
      </div>

      <nav className="profesor-sidebar-nav" aria-label="Navegación del profesor">
        {menuItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`header-nav-item ${active ? 'active' : ''}`}
            >
              <Icon size={19} />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="profesor-sidebar-user">
        <div className="profesor-sidebar-user-row">
          <div className="profesor-sidebar-avatar">{user?.nombre ? user.nombre.charAt(0).toUpperCase() : 'P'}</div>
          <div className="profesor-sidebar-user-copy">
            <strong>{user?.nombre || 'Profesor'}</strong>
            <span>Docente</span>
          </div>
          <NotificacionesBell />
        </div>

        <button
          className="profesor-sidebar-logout"
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/auth/login';
          }}
        >
          <FiLogOut size={18} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
