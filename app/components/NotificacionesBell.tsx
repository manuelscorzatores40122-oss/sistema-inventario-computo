'use client';

import { useEffect, useState, useRef } from 'react';
import { FiBell, FiX } from 'react-icons/fi';

type Notificacion = {
  id: number;
  mensaje: string;
  fecha_envio: string;
  tipo: string;
};

export default function NotificacionesBell() {
  const [user, setUser] = useState<any>(null);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const data = localStorage.getItem('user');
    if (data) {
      try {
        const parsed = JSON.parse(data);
        setUser(parsed);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const fetchNotificaciones = async () => {
      try {
        const res = await fetch(`/api/notificaciones/whatsapp?usuario_id=${user.id}`);
        const data = await res.json();
        setNotificaciones(data.notificaciones || []);
      } catch (e) {
        console.error('Error fetching notifications:', e);
      }
    };
    fetchNotificaciones();
    // Poll every 30s
    const interval = setInterval(fetchNotificaciones, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <div className="position-relative d-inline-block" ref={ref}>
      <button 
        className="header-btn position-relative" 
        onClick={() => setOpen(!open)}
        title="Notificaciones"
        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '8px' }}
      >
        <FiBell size={18} className="text-slate-600" />
        {notificaciones.length > 0 && (
          <span 
            className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
            style={{ fontSize: '0.65rem', padding: '0.25em 0.5em' }}
          >
            {notificaciones.length > 9 ? '9+' : notificaciones.length}
          </span>
        )}
      </button>

      {open && (
        <div 
          className="position-absolute bg-white shadow-lg rounded-3 overflow-hidden animate__animated animate__fadeIn animate__faster"
          style={{ 
            top: '100%', 
            right: 0, 
            width: '320px', 
            zIndex: 1000, 
            border: '1px solid var(--color-slate-200)',
            marginTop: '8px'
          }}
        >
          <div className="d-flex justify-content-between align-items-center p-3 border-bottom bg-slate-50">
            <h6 className="mb-0 fw-bold text-slate-800">Notificaciones</h6>
            <button onClick={() => setOpen(false)} style={{ border: 'none', background: 'transparent' }}>
              <FiX size={16} className="text-slate-500" />
            </button>
          </div>
          <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
            {notificaciones.length === 0 ? (
              <div className="p-4 text-center text-slate-500 small">
                No tienes notificaciones
              </div>
            ) : (
              notificaciones.map((notif) => (
                <div key={notif.id} className="p-3 border-bottom d-flex gap-2 align-items-start" style={{ transition: 'background-color 0.2s' }}>
                  <div className="rounded-circle bg-blue-100 text-blue-600 d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '32px', height: '32px' }}>
                    <FiBell size={14} />
                  </div>
                  <div>
                    <div className="small fw-medium text-slate-800 mb-1" style={{ lineHeight: '1.4' }}>
                      {notif.mensaje}
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                      {new Date(notif.fecha_envio).toLocaleString('es-ES')}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
