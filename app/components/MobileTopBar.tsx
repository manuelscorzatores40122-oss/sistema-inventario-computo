'use client';

import { FiLogOut } from 'react-icons/fi';
import NotificacionesBell from './NotificacionesBell';

export default function MobileTopBar() {
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/auth/login';
  };

  return (
    <header className="mobile-top-bar">
      <div className="mobile-top-bar-brand">
        <div className="mobile-top-bar-logo" style={{ background: 'transparent' }}>
          <img src="/logo.png" alt="Logo" width={28} height={28} style={{ objectFit: 'contain' }} />
        </div>
        <div>
          <div className="mobile-top-bar-title">Sistema de Inventario</div>
        </div>
      </div>

      <div className="mobile-top-bar-actions">
        <NotificacionesBell />
        <button
          onClick={handleLogout}
          className="mobile-top-bar-logout"
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
        >
          <FiLogOut size={18} />
        </button>
      </div>
    </header>
  );
}
