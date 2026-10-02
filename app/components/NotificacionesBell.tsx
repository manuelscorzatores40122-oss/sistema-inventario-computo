'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { FiBell, FiX, FiCheckCircle, FiAlertTriangle, FiInbox, FiUserCheck, FiClock, FiCheck } from 'react-icons/fi';
import Link from 'next/link';

type NotificacionItem = {
  id: string;
  dbId?: number;
  titulo: string;
  mensaje: string;
  fecha: string;
  tipo: 'vencido' | 'solicitud' | 'registro' | 'aprobada' | 'rechazada' | 'general';
  link: string;
};

export function isLoanOverdue(fechaPrestamo: string | Date, estado: string): boolean {
  if (estado !== 'prestado') return false;
  const loanDate = new Date(fechaPrestamo);
  const now = new Date();
  const diffHours = (now.getTime() - loanDate.getTime()) / (1000 * 60 * 60);
  return diffHours >= 24 || (now.getDate() !== loanDate.getDate() && diffHours >= 12);
}

export function getDaysOverdue(fechaPrestamo: string | Date): number {
  const loanDate = new Date(fechaPrestamo);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - loanDate.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

export default function NotificacionesBell() {
  const [user, setUser] = useState<any>(null);
  const [dbNotifs, setDbNotifs] = useState<any[]>([]);
  const [overdueLoans, setOverdueLoans] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const data = localStorage.getItem('user');
    if (data) {
      try {
        setUser(JSON.parse(data));
      } catch (e) {}
    }
  }, []);

  // Cargar IDs leídos de localStorage
  useEffect(() => {
    if (!user?.id) return;
    const key = `readNotifCenter:${user.id}`;
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '[]');
      if (Array.isArray(saved)) setReadIds(new Set(saved));
    } catch {}
  }, [user?.id]);

  // Polling de datos
  useEffect(() => {
    if (!user?.id) return;

    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      clearTimeout(timer);
      try {
        if (user.role === 'admin') {
          const [nRes, rRes, uRes, pRes] = await Promise.all([
            fetch('/api/notificaciones/whatsapp', { cache: 'no-store', signal: controller.signal }),
            fetch('/api/solicitudes?estado=pendiente', { cache: 'no-store', signal: controller.signal }),
            fetch('/api/usuarios?activo=false', { cache: 'no-store', signal: controller.signal }),
            fetch('/api/prestamos?estado=prestado', { cache: 'no-store', signal: controller.signal }),
          ]);
          if (nRes.ok) { const d = await nRes.json(); setDbNotifs(d.notificaciones || []); }
          if (rRes.ok) { const d = await rRes.json(); setPendingRequests(d.solicitudes || []); }
          if (uRes.ok) { const d = await uRes.json(); setPendingUsers(d.usuarios || []); }
          if (pRes.ok) {
            const d = await pRes.json();
            setOverdueLoans((d.prestamos || []).filter((p: any) => isLoanOverdue(p.fecha_prestamo, p.estado)));
          }
        } else {
          // Profesor
          const [nRes, sRes, pRes] = await Promise.all([
            fetch('/api/notificaciones/whatsapp', { cache: 'no-store', signal: controller.signal }),
            fetch(`/api/solicitudes?profesor_id=${user.id}`, { cache: 'no-store', signal: controller.signal }),
            fetch(`/api/prestamos?profesor_id=${user.id}&estado=prestado`, { cache: 'no-store', signal: controller.signal }),
          ]);
          if (nRes.ok) { const d = await nRes.json(); setDbNotifs(d.notificaciones || []); }
          if (sRes.ok) { const d = await sRes.json(); setPendingRequests(d.solicitudes || []); }
          if (pRes.ok) {
            const d = await pRes.json();
            setOverdueLoans((d.prestamos || []).filter((p: any) => isLoanOverdue(p.fecha_prestamo, p.estado)));
          }
        }
      } catch {}
      finally {
        timer = setTimeout(poll, 4000);
      }
    };

    void poll();
    const handleUpdate = () => { void poll(); };
    window.addEventListener('admin-requests-updated', handleUpdate);
    window.addEventListener('admin-users-updated', handleUpdate);
    window.addEventListener('teacher-requests-updated', handleUpdate);

    return () => {
      clearTimeout(timer);
      controller.abort();
      window.removeEventListener('admin-requests-updated', handleUpdate);
      window.removeEventListener('admin-users-updated', handleUpdate);
      window.removeEventListener('teacher-requests-updated', handleUpdate);
    };
  }, [user]);

  // Cerrar al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Construir lista unificada de notificaciones
  const allNotifications = useMemo<NotificacionItem[]>(() => {
    const list: NotificacionItem[] = [];

    // 1. Préstamos vencidos
    overdueLoans.forEach((loan) => {
      const days = getDaysOverdue(loan.fecha_prestamo);
      list.push({
        id: `overdue-${loan.id}`,
        titulo: user?.role === 'admin' ? `⚠️ Préstamo Vencido (#PR-${String(loan.id).padStart(3, '0')})` : `⚠️ Devolución Pendiente`,
        mensaje: user?.role === 'admin'
          ? `Profesor(a) ${loan.profesor_nombre} ${loan.apellido} tiene ${loan.item_nombre} sin devolver desde hace ${days} día${days > 1 ? 's' : ''}.`
          : `Tienes el equipo "${loan.item_nombre}" pendiente de devolución desde el ${new Date(loan.fecha_prestamo).toLocaleDateString()}. Por favor devuélvelo en la oficina de cómputo.`,
        fecha: loan.fecha_prestamo,
        tipo: 'vencido',
        link: user?.role === 'admin' ? '/admin/prestamos' : '/profesor/solicitudes',
      });
    });

    // 2. Registros pendientes de usuarios (solo admin)
    if (user?.role === 'admin') {
      pendingUsers.forEach((u) => {
        list.push({
          id: `user-${u.id}`,
          titulo: `👤 Nuevo docente solicita cuenta`,
          mensaje: `Profesor(a) ${u.nombre} ${u.apellido} (DNI: ${u.email}) ha solicitado crear una cuenta.`,
          fecha: u.fecha_creacion || new Date().toISOString(),
          tipo: 'registro',
          link: '/admin/profesores',
        });
      });
    }

    // 3. Solicitudes pendientes / cambios de estado
    if (user?.role === 'admin') {
      pendingRequests.forEach((req) => {
        list.push({
          id: `req-${req.id}`,
          titulo: `📩 Nueva solicitud de préstamo`,
          mensaje: `${req.profesor_nombre} ${req.apellido} solicitó ${req.item_nombre || 'Aula de cómputo'} (${req.cantidad_solicitada} unid.).`,
          fecha: req.fecha_solicitud,
          tipo: 'solicitud',
          link: '/admin/solicitudes',
        });
      });
    } else {
      // Para profesores: respuestas a sus solicitudes
      pendingRequests.forEach((req) => {
        if (req.estado === 'aprobada' || req.estado === 'rechazada') {
          list.push({
            id: `req-res-${req.id}-${req.estado}`,
            titulo: req.estado === 'aprobada' ? `✅ Solicitud Aprobada` : `❌ Solicitud Rechazada`,
            mensaje: `Tu solicitud de "${req.item_nombre || 'Aula de cómputo'}" fue marcada como ${req.estado}. ${req.comentarios ? `Nota: ${req.comentarios}` : ''}`,
            fecha: req.fecha_solicitud,
            tipo: req.estado === 'aprobada' ? 'aprobada' : 'rechazada',
            link: '/profesor/solicitudes',
          });
        }
      });
    }

    // 4. Notificaciones generales de BD
    dbNotifs.forEach((n) => {
      list.push({
        id: `db-${n.id}`,
        dbId: n.id,
        titulo: '📢 Notificación del sistema',
        mensaje: n.mensaje,
        fecha: n.fecha_envio || new Date().toISOString(),
        tipo: 'general',
        link: user?.role === 'admin' ? '/admin/solicitudes' : '/profesor/solicitudes',
      });
    });

    // Ordenar por más reciente
    return list.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [overdueLoans, pendingUsers, pendingRequests, dbNotifs, user?.role]);

  const unreadCount = useMemo(() => {
    return allNotifications.filter((n) => !readIds.has(n.id)).length;
  }, [allNotifications, readIds]);

  const markAllRead = () => {
    const allIds = allNotifications.map((n) => n.id);
    const newSet = new Set([...Array.from(readIds), ...allIds]);
    setReadIds(newSet);
    if (user?.id) {
      try {
        localStorage.setItem(`readNotifCenter:${user.id}`, JSON.stringify(Array.from(newSet)));
      } catch {}
    }
  };

  const markSingleRead = (id: string) => {
    const newSet = new Set(readIds);
    newSet.add(id);
    setReadIds(newSet);
    if (user?.id) {
      try {
        localStorage.setItem(`readNotifCenter:${user.id}`, JSON.stringify(Array.from(newSet)));
      } catch {}
    }
  };

  if (!user) return null;

  return (
    <div className="position-relative d-inline-block" ref={ref}>
      <button
        className="header-btn position-relative"
        onClick={() => setOpen(!open)}
        title="Centro de Notificaciones"
        aria-label={unreadCount ? `Notificaciones: ${unreadCount} sin leer` : 'Notificaciones: al día'}
        aria-expanded={open}
        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '8px' }}
      >
        <FiBell size={20} className={unreadCount > 0 ? 'text-primary' : 'text-slate-600'} />
        {unreadCount > 0 && (
          <span
            className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger shadow-sm"
            style={{ fontSize: '0.65rem', padding: '0.25em 0.5em', border: '2px solid white' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="notifications-dropdown position-absolute bg-white shadow-lg rounded-4 overflow-hidden animate__animated animate__fadeIn animate__faster"
          style={{
            top: '105%',
            right: 0,
            width: 'min(360px, calc(100vw - 32px))',
            zIndex: 9999,
            border: '1px solid var(--color-slate-200)',
          }}
        >
          {/* Cabecera del Centro de Notificaciones */}
          <div className="d-flex justify-content-between align-items-center p-3 border-bottom bg-slate-50">
            <div className="d-flex align-items-center gap-2">
              <span className="rounded-circle d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary" style={{ width: '28px', height: '28px' }}>
                <FiBell size={14} />
              </span>
              <div>
                <h6 className="mb-0 fw-bold text-slate-900 text-sm">Centro de Notificaciones</h6>
                <small className="text-slate-500" style={{ fontSize: '0.72rem' }}>
                  {unreadCount ? `${unreadCount} sin leer` : 'Todas leídas'}
                </small>
              </div>
            </div>

            <div className="d-flex align-items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="btn btn-link btn-sm text-primary text-decoration-none p-0 me-2"
                  style={{ fontSize: '0.75rem', fontWeight: 600 }}
                  onClick={markAllRead}
                  title="Marcar todas como leídas"
                >
                  <FiCheck className="me-1" size={13} /> Leídas
                </button>
              )}
              <button onClick={() => setOpen(false)} className="btn btn-sm btn-light p-1 rounded-circle border-0">
                <FiX size={16} className="text-slate-500" />
              </button>
            </div>
          </div>

          {/* Lista de Notificaciones */}
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {allNotifications.length === 0 ? (
              <div className="p-4 text-center text-slate-500">
                <FiCheckCircle size={32} className="mx-auto mb-2 text-success opacity-75" />
                <p className="small mb-0 font-semibold">¡Todo al día!</p>
                <small className="text-slate-400">No tienes notificaciones ni alertas pendientes.</small>
              </div>
            ) : (
              allNotifications.map((notif) => {
                const isRead = readIds.has(notif.id);
                const isOverdue = notif.tipo === 'vencido';

                const iconBg = isOverdue
                  ? 'bg-danger bg-opacity-10 text-danger'
                  : notif.tipo === 'registro'
                  ? 'bg-purple-100 text-purple-700'
                  : notif.tipo === 'aprobada'
                  ? 'bg-success bg-opacity-10 text-success'
                  : notif.tipo === 'rechazada'
                  ? 'bg-danger bg-opacity-10 text-danger'
                  : 'bg-blue-100 text-blue-600';

                const Icon = isOverdue
                  ? FiAlertTriangle
                  : notif.tipo === 'registro'
                  ? FiUserCheck
                  : notif.tipo === 'aprobada'
                  ? FiCheckCircle
                  : notif.tipo === 'solicitud'
                  ? FiInbox
                  : FiBell;

                return (
                  <Link
                    key={notif.id}
                    href={notif.link}
                    className={`d-block p-3 border-bottom text-decoration-none transition-colors ${isRead ? 'bg-white' : 'bg-blue-50 bg-opacity-40'}`}
                    onClick={() => {
                      markSingleRead(notif.id);
                      setOpen(false);
                    }}
                    style={{ transition: 'background-color 0.2s' }}
                  >
                    <div className="d-flex gap-2.5 align-items-start">
                      <div className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${iconBg}`} style={{ width: '34px', height: '34px' }}>
                        <Icon size={16} />
                      </div>
                      <div className="flex-grow-1 min-w-0">
                        <div className="d-flex justify-content-between align-items-baseline mb-0.5">
                          <strong className={`small text-truncate ${isOverdue ? 'text-danger font-bold' : 'text-slate-900 font-semibold'}`} style={{ fontSize: '0.82rem' }}>
                            {notif.titulo}
                          </strong>
                          {!isRead && <span className="badge rounded-circle bg-primary p-1 ms-1" style={{ width: '6px', height: '6px' }} />}
                        </div>
                        <p className="small text-slate-600 mb-1" style={{ fontSize: '0.78rem', lineHeight: '1.35' }}>
                          {notif.mensaje}
                        </p>
                        <span className="text-slate-400 d-inline-flex align-items-center gap-1" style={{ fontSize: '0.68rem' }}>
                          <FiClock size={11} />
                          {new Date(notif.fecha).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          {/* Pie de Dropdown */}
          <div className="p-2 bg-slate-50 border-top text-center">
            <Link
              href={user.role === 'admin' ? '/admin/solicitudes' : '/profesor/solicitudes'}
              className="small text-primary font-semibold text-decoration-none"
              onClick={() => setOpen(false)}
            >
              Ver todas las solicitudes →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

