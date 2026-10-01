'use client';

import { useEffect, useRef, useState } from 'react';
import { FiInbox, FiCheckCircle, FiXCircle, FiX } from 'react-icons/fi';
import { formatRequestLocation } from './RequestLocationFields';

type RequestDetail = {
  id: number; estado: string; profesor_nombre: string; apellido: string;
  item_nombre: string | null; cantidad_solicitada: number; motivo: string | null;
  seccion: string | null; numero_aula: string | null;
};

export default function AdminRequestAlert({ requestId, remaining, onDone }: {
  requestId: number; remaining: number; onDone: () => void;
}) {
  const lock = useRef(false);
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<'aprobada' | 'rechazada' | null>(null);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetch(`/api/solicitudes/${requestId}`, { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'No se pudo cargar la solicitud.');
        setRequest(data.solicitud);
      })
      .catch(error => { if (!controller.signal.aborted) setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [requestId, retry]);

  const resolve = async (estado: 'aprobada' | 'rechazada') => {
    if (lock.current || request?.estado !== 'pendiente') return;
    lock.current = true;
    setSaving(estado);
    setError('');
    try {
      const response = await fetch(`/api/solicitudes/${requestId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado, comentarios: comment.trim() || undefined }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 409) {
          setRequest(previous => previous ? { ...previous, estado: 'procesada' } : previous);
          window.dispatchEvent(new Event('admin-requests-updated'));
        }
        throw new Error(data.error || 'No se pudo procesar la solicitud.');
      }
      window.dispatchEvent(new Event('admin-requests-updated'));
      onDone();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo conectar. Inténtalo otra vez.');
    } finally { lock.current = false; setSaving(null); }
  };

  return (
    <section className="admin-request-alert" role="region" aria-labelledby="admin-request-alert-title" onKeyDown={event => {
      if (event.key === 'Escape' && !lock.current) { event.stopPropagation(); onDone(); }
    }}>
      <header><span><FiInbox size={24} /></span><div><small>NUEVA SOLICITUD</small><h2 id="admin-request-alert-title">Un docente necesita tu respuesta</h2></div><button type="button" className="admin-request-alert-close" aria-label="Cerrar aviso sin responder la solicitud" disabled={!!saving} onClick={onDone}><FiX size={20} /></button></header>
      {loading ? <p role="status">Cargando los detalles…</p> : request && <>
        <p className="admin-request-alert-teacher" role="status">{request.profesor_nombre} {request.apellido}</p>
        <div className="admin-request-alert-details"><strong>{request.item_nombre || 'Aula de Cómputo'}</strong>
          <p>Cantidad: {request.cantidad_solicitada}</p>
          {formatRequestLocation(request) && <p>{formatRequestLocation(request)}</p>}
          <p><b>Motivo:</b> {request.motivo || 'Sin motivo especificado'}</p>
        </div>
        {request.estado === 'pendiente' ? <label className="admin-request-alert-comment">Comentario para el docente (opcional)
          <textarea rows={2} maxLength={1000} value={comment} disabled={!!saving} onChange={event => setComment(event.target.value)} placeholder="Escribe una indicación o el motivo del rechazo" />
        </label> : <p role="status">Esta solicitud ya fue {request.estado}. Puedes continuar con la siguiente.</p>}
      </>}
      {error && <p className="alert alert-danger small" role="alert">{error}</p>}
      {!loading && !request && <button type="button" className="btn-secondary-custom" onClick={() => setRetry(value => value + 1)}>Reintentar</button>}
      <div className="admin-request-alert-actions">
        <button type="button" className="approve" disabled={loading || !!saving || request?.estado !== 'pendiente'} onClick={() => resolve('aprobada')}><FiCheckCircle />{saving === 'aprobada' ? 'Aceptando…' : 'Aceptar'}</button>
        <button type="button" className="reject" disabled={loading || !!saving || request?.estado !== 'pendiente'} onClick={() => resolve('rechazada')}><FiXCircle />{saving === 'rechazada' ? 'Rechazando…' : 'Rechazar'}</button>
      </div>
      <button type="button" className="admin-request-alert-later" disabled={!!saving} onClick={onDone}>{request && request.estado !== 'pendiente' ? 'Continuar' : 'Revisar después'}</button>
      {remaining > 1 && <small className="d-block text-center text-secondary">{remaining - 1} solicitud{remaining > 2 ? 'es' : ''} más por revisar</small>}
    </section>
  );
}
