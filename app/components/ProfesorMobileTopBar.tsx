'use client';

import Link from 'next/link';
import NotificacionesBell from './NotificacionesBell';
import { useEffect, useState } from 'react';

export default function ProfesorMobileTopBar() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const data = localStorage.getItem('user');
    if (data) {
      try { setUser(JSON.parse(data)); } catch (e) {}
    }
  }, []);

  const initials = user?.nombre ? user.nombre.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'P';

  return (
    <header className="profesor-mobile-header-bar d-flex align-items-center justify-content-between px-3 py-2 w-100 position-sticky top-0 z-3 shadow-sm" style={{ background: '#028271', color: '#ffffff' }}>
      <div className="d-flex align-items-center gap-2">
        <div className="d-flex align-items-center justify-content-center bg-white rounded-circle shadow-sm" style={{ width: '34px', height: '34px' }}>
          <img src="/logo.png" alt="Logo" width={22} height={22} style={{ objectFit: 'contain' }} />
        </div>
        <div className="fw-bold" style={{ fontSize: '1.05rem', letterSpacing: '-0.3px' }}>Sistema de Inventario</div>
      </div>

      <div className="d-flex align-items-center gap-3">
        <NotificacionesBell />
        <Link href="/profesor/perfil" className="text-decoration-none">
          <div className="d-flex align-items-center justify-content-center rounded-circle border border-white border-opacity-25" style={{ width: '32px', height: '32px', backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>
            {initials}
          </div>
        </Link>
      </div>
    </header>
  );
}
