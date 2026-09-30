'use client';

import { useEffect, useRef, useState } from 'react';
import { FiCheck, FiCheckCircle } from 'react-icons/fi';

export type TeacherNotification = {
  id: number;
  mensaje: string;
  fecha_envio: string;
  tipo: string;
};

// Un único observador en el layout, compartido por las vistas móvil y escritorio.
export default function SolicitudApprovalNotice() {
  const [queue, setQueue] = useState<TeacherNotification[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  const accepted = useRef(new Set<number>());
  const storageKey = useRef('');
  const current = queue[0];

  useEffect(() => {
    let user: { id: number; role: string };
    try { user = JSON.parse(localStorage.getItem('user') || 'null'); }
    catch { return; }
    if (!user?.id || user.role !== 'profesor') return;
    storageKey.current = `acceptedApprovals:${user.id}`;
    const readAccepted = () => {
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey.current) || '[]');
        if (Array.isArray(saved)) saved.filter(Number.isInteger).forEach(id => accepted.current.add(id));
      } catch { /* Conserva los avisos aceptados en memoria si el almacenamiento falla. */ }
    };
    readAccepted();
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let inFlight = false;
    let previousIds: string | null = null;
    const controller = new AbortController();

    const poll = async () => {
      clearTimeout(timer);
      if (stopped || inFlight) return;
      if (document.visibilityState === 'hidden') return;
      inFlight = true;
      try {
        const response = await fetch('/api/notificaciones/whatsapp', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json();
        if (stopped || !Array.isArray(data.notificaciones)) return;
        const notifications: TeacherNotification[] = data.notificaciones;
        readAccepted();
        setQueue(notifications.filter(n => n.tipo === 'solicitud_aprobada' && !accepted.current.has(n.id)).sort((a, b) => a.id - b.id));
        window.dispatchEvent(new CustomEvent('teacher-notifications', { detail: notifications }));
        const ids = notifications.map(n => n.id).join(',');
        if (previousIds !== null && ids !== previousIds) window.dispatchEvent(new Event('teacher-requests-updated'));
        previousIds = ids;
      } catch { /* Reintenta tras una desconexión sin interrumpir al docente. */ }
      finally {
        inFlight = false;
        if (!stopped) timer = setTimeout(poll, 3000);
      }
    };
    const syncAccepted = (event: StorageEvent) => {
      if (event.key !== storageKey.current) return;
      readAccepted();
      setQueue(items => items.filter(n => !accepted.current.has(n.id)));
    };
    void poll();
    document.addEventListener('visibilitychange', poll);
    window.addEventListener('online', poll);
    window.addEventListener('storage', syncAccepted);
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller.abort();
      document.removeEventListener('visibilitychange', poll);
      window.removeEventListener('online', poll);
      window.removeEventListener('storage', syncAccepted);
    };
  }, []);

  useEffect(() => {
    const element = dialog.current;
    if (!current || !element) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    element.showModal();
    return () => { element.close(); previousFocus?.focus(); };
  }, [current?.id]);

  const accept = () => {
    if (!current) return;
    accepted.current.add(current.id);
    try { localStorage.setItem(storageKey.current, JSON.stringify(Array.from(accepted.current))); }
    catch { /* El aviso no se repite durante esta sesión. */ }
    window.dispatchEvent(new CustomEvent('notifications-read', { detail: { key: storageKey.current, ids: Array.from(accepted.current) } }));
    setQueue(items => items.filter(n => n.id !== current.id));
  };

  if (!current) return null;
  return (
    <dialog ref={dialog} className="approval-notice" aria-labelledby="approval-title" aria-describedby="approval-description" onCancel={event => event.preventDefault()}>
      <div className="approval-notice-decoration" aria-hidden="true"><span /><span /><span /></div>
      <div className="approval-notice-icon"><FiCheck size={36} aria-hidden="true" /></div>
      <span className="approval-notice-eyebrow">¡TODO LISTO PARA TU CLASE!</span>
      <h2 id="approval-title">Tu solicitud fue procesada con éxito</h2>
      <p id="approval-description">La administración aprobó tu solicitud. Puedes revisar los detalles en tu historial.</p>
      <div className="approval-notice-detail"><FiCheckCircle size={20} aria-hidden="true" /><p>{current.mensaje}</p></div>
      <button type="button" onClick={accept} autoFocus>Aceptar <FiCheck size={18} aria-hidden="true" /></button>
      {queue.length > 1 && <small>Tienes {queue.length - 1} aprobación{queue.length > 2 ? 'es' : ''} más por revisar</small>}
    </dialog>
  );
}
