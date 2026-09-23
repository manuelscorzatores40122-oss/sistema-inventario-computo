'use client';

import { useEffect, useState } from 'react';
import { FiLogOut, FiShield } from 'react-icons/fi';

export default function MobileTopBar() {
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
          <div className="mobile-top-bar-role">
            {user?.role === 'admin' ? 'Administración' : user?.nombre || 'Profesor'}
          </div>
        </div>
      </div>

      <div className="d-flex align-items-center gap-2 pe-3">
        <div className="mobile-top-bar-avatar">
          {user?.nombre ? user.nombre.charAt(0).toUpperCase() : 'U'}
        </div>
        <button
          onClick={handleLogout}
          className="mobile-top-bar-logout"
          title="Cerrar sesión"
        >
          <FiLogOut size={15} />
          Salir
        </button>
      </div>
    </header>
  );
}