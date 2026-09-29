'use client';

import { useEffect, useRef, useState } from 'react';
import { FiMoreHorizontal, FiX, FiXCircle, FiEyeOff } from 'react-icons/fi';

export default function RequestActions({ id, name, onCancelled, onHide, children }: {
  id: number; name: string; onCancelled: () => void; onHide?: () => void; children: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const stop = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };
  useEffect(() => stop, []);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog.current?.showModal();
    document.body.style.overflow = 'hidden';
    return () => { dialog.current?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, [open]);
  const show = () => { setError(''); setOpen(true); };
  const cancel = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/solicitudes/${id}/cancelar`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo cancelar la solicitud');
      setOpen(false); onCancelled();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Comprueba tu conexión e inténtalo nuevamente.');
    } finally { setBusy(false); }
  };
  return (
    <div className="request-action-wrapper"
      onPointerDown={(event) => {
        if (event.button !== 0 || (event.target as HTMLElement).closest('button, dialog')) return;
        stop(); origin.current = { x: event.clientX, y: event.clientY };
        timer.current = setTimeout(show, 550);
      }}
      onPointerMove={(event) => { if (Math.hypot(event.clientX - origin.current.x, event.clientY - origin.current.y) > 10) stop(); }}
      onPointerUp={stop} onPointerCancel={stop} onPointerLeave={stop}
      onContextMenu={(event) => { if (!(event.target as HTMLElement).closest('dialog')) { event.preventDefault(); stop(); show(); } }}>
      {children}
      <button type="button" className="request-options-button" onClick={show} aria-label={`Opciones de ${name}`} aria-haspopup="dialog"><FiMoreHorizontal size={22} /></button>
      <dialog ref={dialog} className="request-actions-dialog" aria-labelledby={`request-actions-${id}`}
        onCancel={(event) => { event.preventDefault(); if (!busy) setOpen(false); }}>
        <header><h2 id={`request-actions-${id}`}>Opciones de solicitud</h2><button type="button" disabled={busy} onClick={() => setOpen(false)} aria-label="Cerrar opciones"><FiX size={22} /></button></header>
        <p className="request-actions-name">{name}</p>
        <p>{onHide ? 'Se ocultará de este panel. Seguirá disponible en tu historial.' : 'Si ya no la necesitas, puedes cancelar esta solicitud pendiente.'}</p>
        {error && <p className="alert alert-danger" role="alert">{error}</p>}
        {onHide ? (
          <button type="button" className="request-cancel-button" onClick={() => { setOpen(false); onHide(); }}><FiEyeOff size={18} />Ocultar de mi pantalla</button>
        ) : (
          <button type="button" className="request-cancel-button" disabled={busy} onClick={cancel}><FiXCircle size={18} />{busy ? 'Cancelando…' : 'Cancelar solicitud'}</button>
        )}
        <button type="button" className="request-keep-button" disabled={busy} onClick={() => setOpen(false)}>Mantener solicitud</button>
      </dialog>
    </div>
  );
}
