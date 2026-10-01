'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import AdminRequestAlert from './AdminRequestAlert';
import { FiBell, FiX } from 'react-icons/fi';

type Notification = { id: number; mensaje: string; tipo: string; referencia_id: number | null };

export default function AdminNotifications() {
  const dismissed = useRef(new Set<number>());
  const [queue, setQueue] = useState<Notification[]>([]);
  const [notice, setNotice] = useState<Notification | null>(null);
  useEffect(() => {
    let stopped = false;
    let pending = false;
    let timer: ReturnType<typeof setTimeout>;
    let previous: Set<number> | null = null;
    let pendingSignature: string | null = null;
    const controller = new AbortController();
    const poll = async () => {
      clearTimeout(timer);
      if (stopped || pending || document.visibilityState === 'hidden') return;
      pending = true;
      try {
        const [response, requestsResponse] = await Promise.all([
          fetch('/api/notificaciones/whatsapp', { cache: 'no-store', signal: controller.signal }),
          fetch('/api/solicitudes?estado=pendiente', { cache: 'no-store', signal: controller.signal }),
        ]);
        if (!response.ok) return;
        const data = await response.json();
        if (stopped || !Array.isArray(data.notificaciones)) return;
        const notifications: Notification[] = data.notificaciones;
        window.dispatchEvent(new CustomEvent('admin-notifications', { detail: notifications }));
        if (previous) {
          const added = notifications.filter(item => !previous!.has(item.id));
          if (added.length) {
            const other = added.find(item => item.tipo !== 'solicitud_creada');
            if (other) setNotice(other);
            window.dispatchEvent(new Event('admin-requests-updated'));
          }
        }
        previous = new Set(notifications.map(item => item.id));
        if (requestsResponse.ok) {
          const requestData = await requestsResponse.json();
          if (stopped || !Array.isArray(requestData.solicitudes)) return;
          const requests: { id: number; fecha_solicitud: string }[] = requestData.solicitudes;
          const signature = requests.map(item => item.id).join(',');
          if (pendingSignature !== null && signature !== pendingSignature) window.dispatchEvent(new Event('admin-requests-updated'));
          pendingSignature = signature;
          const pendingNotices = requests.filter(item => !dismissed.current.has(item.id)).map(item => (
            notifications.find(notice => notice.tipo === 'solicitud_creada' && notice.referencia_id === item.id)
            || { id: -item.id, referencia_id: item.id, tipo: 'solicitud_creada', mensaje: 'Nueva solicitud' }
          ));
          setQueue(current => {
            // Conserva la petición que se está revisando cuando llegan otras.
            const active = pendingNotices.find(item => item.referencia_id === current[0]?.referencia_id);
            return active ? [active, ...pendingNotices.filter(item => item.referencia_id !== active.referencia_id)] : pendingNotices;
          });
        }
      } catch { /* Reintenta al recuperar la conexión. */ }
      finally {
        pending = false;
        if (!stopped) timer = setTimeout(poll, 3000);
      }
    };
    void poll();
    document.addEventListener('visibilitychange', poll);
    window.addEventListener('online', poll);
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller.abort();
      document.removeEventListener('visibilitychange', poll);
      window.removeEventListener('online', poll);
    };
  }, []);

  const dismissRequest = () => {
    const current = queue[0];
    if (!current) return;
    if (current.referencia_id) dismissed.current.add(current.referencia_id);
    try {
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      if (user?.id && current.id > 0) {
        const key = `readNotifications:${user.id}`;
        const saved = JSON.parse(localStorage.getItem(key) || '[]');
        const ids = Array.from(new Set([...(Array.isArray(saved) ? saved : []), current.id]));
        localStorage.setItem(key, JSON.stringify(ids));
        window.dispatchEvent(new CustomEvent('notifications-read', { detail: { key, ids } }));
      }
    } catch { /* La resolución funciona aunque no haya almacenamiento local. */ }
    setQueue(items => items.filter(item => item.referencia_id !== current.referencia_id));
  };

  if (queue[0]?.referencia_id) return <AdminRequestAlert key={queue[0].referencia_id} requestId={queue[0].referencia_id} remaining={queue.length} onDone={dismissRequest} />;
  if (!notice) return null;
  return (
    <aside className="admin-live-notice" aria-label="Nueva notificación">
      <FiBell size={22} aria-hidden="true" />
      <div><strong>Actividad del docente</strong><p role="status">{notice.mensaje}</p><Link href="/admin/solicitudes" onClick={() => setNotice(null)}>Ver solicitudes</Link></div>
      <button type="button" aria-label="Cerrar aviso" onClick={() => setNotice(null)}><FiX size={19} /></button>
    </aside>
  );
}
