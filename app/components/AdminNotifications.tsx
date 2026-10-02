'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import AdminRequestAlert from './AdminRequestAlert';
import { FiBell, FiX, FiUserCheck, FiCheckCircle, FiXCircle } from 'react-icons/fi';

type Notification = { id: number; mensaje: string; tipo: string; referencia_id: number | null };
type DocentePendiente = { id: number; email: string; nombre: string; apellido: string; telefono: string | null; correo_personal: string | null; fecha_creacion?: string };

function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // Ignore audio policy errors
  }
}

export default function AdminNotifications() {
  const dismissed = useRef(new Set<number>());
  const dismissedDocentes = useRef(new Set<number>());
  const [queue, setQueue] = useState<Notification[]>([]);
  const [pendingDocentes, setPendingDocentes] = useState<DocentePendiente[]>([]);
  const [notice, setNotice] = useState<Notification | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [savingDocente, setSavingDocente] = useState<number | null>(null);

  useEffect(() => {
    let stopped = false;
    let pending = false;
    let timer: ReturnType<typeof setTimeout>;
    let previous: Set<number> | null = null;
    let pendingSignature: string | null = null;
    let pendingDocentesSignature: string | null = null;
    const controller = new AbortController();

    const poll = async () => {
      clearTimeout(timer);
      if (stopped || pending || document.visibilityState === 'hidden') return;
      pending = true;
      try {
        const [response, requestsResponse, docentesResponse] = await Promise.all([
          fetch('/api/notificaciones/whatsapp', { cache: 'no-store', signal: controller.signal }),
          fetch('/api/solicitudes?estado=pendiente', { cache: 'no-store', signal: controller.signal }),
          fetch('/api/usuarios?activo=false', { cache: 'no-store', signal: controller.signal }),
        ]);

        if (response.ok) {
          const data = await response.json();
          if (!stopped && Array.isArray(data.notificaciones)) {
            const notifications: Notification[] = data.notificaciones;
            window.dispatchEvent(new CustomEvent('admin-notifications', { detail: notifications }));
            if (previous) {
              const added = notifications.filter(item => !previous!.has(item.id));
              if (added.length) {
                playNotificationChime();
                const other = added.find(item => item.tipo !== 'solicitud_creada');
                if (other) setNotice(other);
                window.dispatchEvent(new Event('admin-requests-updated'));
              }
            }
            previous = new Set(notifications.map(item => item.id));
          }
        }

        if (requestsResponse.ok) {
          const requestData = await requestsResponse.json();
          if (!stopped && Array.isArray(requestData.solicitudes)) {
            const requests: { id: number; fecha_solicitud: string }[] = requestData.solicitudes;
            const signature = requests.map(item => item.id).join(',');
            if (pendingSignature !== null && signature !== pendingSignature) {
              playNotificationChime();
              window.dispatchEvent(new Event('admin-requests-updated'));
            }
            pendingSignature = signature;
            const pendingNotices = requests.filter(item => !dismissed.current.has(item.id)).map(item => (
              queue.find(notice => notice.tipo === 'solicitud_creada' && notice.referencia_id === item.id)
              || { id: -item.id, referencia_id: item.id, tipo: 'solicitud_creada', mensaje: 'Nueva solicitud de préstamo' }
            ));
            setQueue(current => {
              const active = pendingNotices.find(item => item.referencia_id === current[0]?.referencia_id);
              return active ? [active, ...pendingNotices.filter(item => item.referencia_id !== active.referencia_id)] : pendingNotices;
            });
          }
        }

        if (docentesResponse.ok) {
          const docentesData = await docentesResponse.json();
          if (!stopped && Array.isArray(docentesData.usuarios)) {
            const list: DocentePendiente[] = docentesData.usuarios;
            const signature = list.map(item => item.id).join(',');
            if (pendingDocentesSignature !== null && signature !== pendingDocentesSignature && list.length > 0) {
              playNotificationChime();
            }
            pendingDocentesSignature = signature;
            setPendingDocentes(list.filter(d => !dismissedDocentes.current.has(d.id)));
          }
        }
      } catch { /* Reintenta al recuperar la conexión */ }
      finally {
        pending = false;
        if (!stopped) timer = setTimeout(poll, 3000);
      }
    };

    void poll();
    document.addEventListener('visibilitychange', poll);
    window.addEventListener('online', poll);
    const handleUpdate = () => { void poll(); };
    window.addEventListener('admin-requests-updated', handleUpdate);
    window.addEventListener('admin-users-updated', handleUpdate);

    return () => {
      stopped = true;
      clearTimeout(timer);
      controller.abort();
      document.removeEventListener('visibilitychange', poll);
      window.removeEventListener('online', poll);
      window.removeEventListener('admin-requests-updated', handleUpdate);
      window.removeEventListener('admin-users-updated', handleUpdate);
    };
  }, []);

  const dismissRequest = () => {
    const current = queue[0];
    if (!current) return;
    if (current.referencia_id) dismissed.current.add(current.referencia_id);
    setQueue(items => items.filter(item => item.referencia_id !== current.referencia_id));
  };

  const resolverDocente = async (id: number, aprobar: boolean) => {
    setSavingDocente(id);
    try {
      if (aprobar) {
        const res = await fetch(`/api/usuarios/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activo: true }),
        });
        if (!res.ok) throw new Error('No se pudo aprobar el docente');
        setActionMessage('Cuenta de docente aprobada con éxito');
      } else {
        const res = await fetch(`/api/usuarios/${id}?hard=true`, { method: 'DELETE' });
        if (!res.ok) throw new Error('No se pudo rechazar el docente');
        setActionMessage('Solicitud de registro rechazada');
      }
      dismissedDocentes.current.add(id);
      setPendingDocentes(items => items.filter(d => d.id !== id));
      window.dispatchEvent(new Event('admin-users-updated'));
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Error al procesar usuario');
    } finally {
      setSavingDocente(null);
    }
  };

  if (queue[0]?.referencia_id) {
    return <AdminRequestAlert key={queue[0].referencia_id} requestId={queue[0].referencia_id} remaining={queue.length} onDone={dismissRequest} />;
  }

  const currentDocente = pendingDocentes[0];
  if (currentDocente) {
    return (
      <aside className="admin-request-alert animate__animated animate__fadeInRight" role="region" aria-label="Solicitud de registro de docente">
        <header>
          <span><FiUserCheck size={24} /></span>
          <div>
            <small style={{ color: '#d97706', fontWeight: 800 }}>REGISTRO DE DOCENTE PENDIENTE</small>
            <h2>Un profesor solicita acceso a la plataforma</h2>
          </div>
          <button type="button" className="admin-request-alert-close" aria-label="Cerrar aviso" onClick={() => {
            dismissedDocentes.current.add(currentDocente.id);
            setPendingDocentes(items => items.filter(d => d.id !== currentDocente.id));
          }}><FiX size={20} /></button>
        </header>

        <p className="admin-request-alert-teacher">{currentDocente.nombre} {currentDocente.apellido}</p>
        <div className="admin-request-alert-details">
          <p><strong>DNI / Usuario:</strong> {currentDocente.email}</p>
          {currentDocente.correo_personal && <p><strong>Correo Personal:</strong> {currentDocente.correo_personal}</p>}
          {currentDocente.telefono && <p><strong>Teléfono / WhatsApp:</strong> {currentDocente.telefono}</p>}
        </div>

        {actionMessage && <p className="alert alert-info py-1 px-2 text-xs mb-2">{actionMessage}</p>}

        <div className="admin-request-alert-actions">
          <button
            type="button"
            className="approve"
            disabled={savingDocente === currentDocente.id}
            onClick={() => resolverDocente(currentDocente.id, true)}
          >
            <FiCheckCircle />
            {savingDocente === currentDocente.id ? 'Aprobando...' : 'Aprobar Cuenta'}
          </button>
          <button
            type="button"
            className="reject"
            disabled={savingDocente === currentDocente.id}
            onClick={() => resolverDocente(currentDocente.id, false)}
          >
            <FiXCircle />
            {savingDocente === currentDocente.id ? 'Rechazando...' : 'Rechazar'}
          </button>
        </div>
        <Link href="/admin/profesores" className="admin-request-alert-later text-decoration-none text-center d-block">
          Ver panel completo de profesores ({pendingDocentes.length} pendiente{pendingDocentes.length > 1 ? 's' : ''})
        </Link>
      </aside>
    );
  }

  if (!notice) return null;

  return (
    <aside className="admin-live-notice" aria-label="Nueva notificación">
      <FiBell size={22} aria-hidden="true" />
      <div>
        <strong>Actividad en el sistema</strong>
        <p role="status">{notice.mensaje}</p>
        <Link href="/admin/solicitudes" onClick={() => setNotice(null)}>Ver solicitudes</Link>
      </div>
      <button type="button" aria-label="Cerrar aviso" onClick={() => setNotice(null)}><FiX size={19} /></button>
    </aside>
  );
}

