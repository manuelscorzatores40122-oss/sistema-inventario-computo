'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { FiArrowRight, FiBell, FiCheck, FiCheckCircle, FiClock, FiInbox, FiTrash2, FiX } from 'react-icons/fi';
import type { InboxItem } from '@/app/lib/notification-presentation';
import { activeInboxItem, newInboxItems } from '@/app/lib/notification-presentation';
import MobileApprovalNotice from './MobileApprovalNotice';
import { dateLabel } from '@/app/lib/teacher-utils';
import s from './NotificationCenter.module.css';

export default function NotificationCenter({ items, userId }: { items: InboxItem[]; userId: number }) {
  const [open, setOpen] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [read, setRead] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [position, setPosition] = useState({ top: 70, left: 12 });
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<{ userId: number; keys: string[] }>).detail;
      if (detail?.userId === userId) setRead(previous => Array.from(new Set([...previous, ...detail.keys])));
    };
    window.addEventListener('inbox-read', sync);
    return () => window.removeEventListener('inbox-read', sync);
  }, [userId]);
  useEffect(() => {
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<{ userId: number; key: string; dismissed?: boolean }>).detail;
      if (detail?.userId === userId) setDismissed(previous => detail.dismissed === false
        ? previous.filter(key => key !== detail.key)
        : previous.includes(detail.key) ? previous : [...previous, detail.key]);
    };
    window.addEventListener('inbox-dismissed', sync);
    return () => window.removeEventListener('inbox-dismissed', sync);
  }, [userId]);
  useEffect(() => {
    let saved: string[] = [];
    let savedDismissed: string[] = [];
    try { const value = JSON.parse(localStorage.getItem(`inbox:${userId}`) || '[]'); if (Array.isArray(value)) saved = value; } catch { /* Sigue funcionando sin almacenamiento local. */ }
    try { const value = JSON.parse(localStorage.getItem(`inbox-dismissed:${userId}`) || '[]'); if (Array.isArray(value)) savedDismissed = value; } catch { /* Se sincroniza con el servidor. */ }
    setRead(saved);
    setDismissed(savedDismissed);
    const controller = new AbortController();
    fetch('/api/notificaciones/lecturas', { cache: 'no-store', signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('No pudimos sincronizar los avisos leídos.');
      const body = await response.json();
      setRead(previous => Array.from(new Set([...previous, ...(body.keys || [])])));
      setDismissed(previous => Array.from(new Set([...previous, ...(body.dismissedKeys || [])])));
    }).catch(err => { if (!controller.signal.aborted) setError(err.message); });
    return () => controller.abort();
  }, [userId]);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: MouseEvent) => { if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('mousedown', dismiss); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', dismiss); document.removeEventListener('keydown', escape); };
  }, [open]);
  const activeItems = items.filter(item => !dismissed.includes(item.key));
  const unread = activeItems.filter(item => !read.includes(item.key));
  async function mark(keys: string[]) {
    const next = Array.from(new Set([...read, ...keys])); setRead(next);
    window.dispatchEvent(new CustomEvent('inbox-read', { detail: { userId, keys } }));
    try { localStorage.setItem(`inbox:${userId}`, JSON.stringify(next)); } catch { /* Se sincroniza en el servidor. */ }
    try {
      const response = await fetch('/api/notificaciones/lecturas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keys }) });
      if (!response.ok) throw new Error('No pudimos sincronizar la lectura. Se conserva en este navegador.');
      setError('');
    } catch (err) { setError(err instanceof Error ? err.message : 'No hay conexión. La lectura se conserva en este navegador.'); }
  }
  async function dismissAll() {
    const keys = activeItems.map(item => item.key);
    if (!keys.length) return;
    const next = Array.from(new Set([...dismissed, ...keys]));
    setDismissed(next);
    setError('');
    keys.forEach(key => window.dispatchEvent(new CustomEvent('inbox-dismissed', { detail: { userId, key, dismissed: true } })));
    try { localStorage.setItem(`inbox-dismissed:${userId}`, JSON.stringify(next)); } catch { /* Se sincroniza con el servidor. */ }
    try {
      const response = await fetch('/api/notificaciones/lecturas', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keys }) });
      if (!response.ok) throw new Error('No pudimos borrar las notificaciones. Intenta nuevamente.');
    } catch (err) {
      setDismissed(previous => previous.filter(value => !keys.includes(value)));
      keys.forEach(key => window.dispatchEvent(new CustomEvent('inbox-dismissed', { detail: { userId, key, dismissed: false } })));
      try { localStorage.setItem(`inbox-dismissed:${userId}`, JSON.stringify(dismissed)); } catch { /* La lista se actualiza al sincronizar. */ }
      setError(err instanceof Error ? err.message : 'No hay conexión. No se pudieron borrar las notificaciones.');
    }
  }
  const visible = unreadOnly ? unread : activeItems;
  return <>
    <button ref={trigger} className={s.trigger} aria-label={`Notificaciones${unread.length ? `, ${unread.length} sin leer` : ', al día'}`} aria-expanded={open} aria-controls={id} onClick={() => {
      const rect = trigger.current?.getBoundingClientRect();
      if (rect) setPosition({ top: Math.min(rect.bottom + 12, window.innerHeight - 200), left: Math.max(12, Math.min(rect.left, window.innerWidth - 402)) });
      setOpen(value => !value);
    }}><FiBell size={18} />{unread.length > 0 && <span className={s.count}>{unread.length > 99 ? '99+' : unread.length}</span>}</button>
    {open && createPortal(
      <section ref={panel} id={id} className={s.panel} style={position} aria-label="Centro de notificaciones">
        <header className={s.header}>
          <div>
            <h2>Notificaciones</h2>
            <p>{unread.length ? `${unread.length} novedades por revisar` : 'Estás al día con tu actividad'}</p>
          </div>
          <div className={s.headerActions}>
            {activeItems.length > 0 && <button className={s.clearButton} onClick={() => void dismissAll()}><FiTrash2 size={15} />Borrar todas</button>}
            <button className={s.close} aria-label="Cerrar notificaciones" onClick={() => { setOpen(false); trigger.current?.focus(); }}><FiX /></button>
          </div>
        </header>
        <div className={s.tools}>
          <div className={s.tabs}>
            <button aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)}>Todas</button>
            <button aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)}>Sin leer ({unread.length})</button>
          </div>
          {unread.length > 0 && <button className={s.readButton} onClick={() => void mark(unread.map(item => item.key))}><FiCheck size={13} />Marcar leídas</button>}
        </div>
        {error && <p role="status" className={s.error}>{error}</p>}
        {visible.length ? (
          <ul className={s.list}>
            {visible.map(item => (
              <li key={item.key} className={s.item} data-unread={!read.includes(item.key)}>
                <span className={s.icon} data-tone={item.tone}>
                  {item.tone === 'green' ? <FiCheckCircle size={17} /> : item.tone === 'amber' ? <FiClock size={17} /> : <FiInbox size={17} />}
                </span>
                <div className={s.copy}>
                  <h3>{item.title}{!read.includes(item.key) && <span className={s.dot} aria-label="Sin leer" />}</h3>
                  <p>{item.message}</p>
                  <time dateTime={item.date}>{dateLabel(item.date, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time>
                  <div className={s.actions}>
                    <Link href={item.href} onClick={() => { void mark([item.key]); setOpen(false); }}>{item.action}<FiArrowRight size={12} /></Link>
                    {!read.includes(item.key) && <button onClick={() => void mark([item.key])}><FiCheck size={13} />Marcar leída</button>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className={s.empty}>
            <FiCheckCircle size={32} />
            <h3>{unreadOnly ? 'No tienes avisos sin leer' : 'Todo en orden'}</h3>
            <p>Las respuestas y novedades del colegio aparecerán aquí.</p>
          </div>
        )}
      </section>,
      document.body,
    )}
  </>;
}

export function ActivityToast({ items, prominentApprovals = false, userId }: { items: InboxItem[]; prominentApprovals?: boolean; userId?: number }) {
  const seen = useRef<Set<string> | null>(null);
  const [queue, setQueue] = useState<InboxItem[]>([]);
  const current = activeInboxItem(queue, prominentApprovals);
  const prominent = prominentApprovals && current?.notificationType === 'solicitud_aprobada';
  useEffect(() => {
    if (seen.current === null) { seen.current = new Set(items.map(item => item.key)); return; }
    const fresh = newInboxItems(items, seen.current);
    if (fresh.length) setQueue(previous => [...previous, ...fresh]);
  }, [items]);
  useEffect(() => { if (!current || prominent) return; const timer = setTimeout(() => setQueue(previous => previous.filter(item => item.key !== current.key)), 12000); return () => clearTimeout(timer); }, [current, prominent]);
  const close = () => setQueue(previous => previous.filter(item => item.key !== current?.key));
  const acknowledge = () => {
    if (current && userId) {
      try {
        const stored = JSON.parse(localStorage.getItem(`inbox:${userId}`) || '[]');
        localStorage.setItem(`inbox:${userId}`, JSON.stringify(Array.from(new Set([...(Array.isArray(stored) ? stored : []), current.key]))));
      } catch { /* La lectura se sincroniza con el servidor. */ }
      window.dispatchEvent(new CustomEvent('inbox-read', { detail: { userId, keys: [current.key] } }));
      void fetch('/api/notificaciones/lecturas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keys: [current.key] }) }).catch(() => {});
    }
    close();
  };
  if (!current) return null;
  if (prominent) return createPortal(<MobileApprovalNotice item={current} remaining={queue.length - 1} onAcknowledge={acknowledge} />, document.body);
  return createPortal(<aside className={s.toast} role="status"><span className={s.icon} data-tone={current.tone}><FiBell size={17} /></span><div style={{ flex: 1 }}><strong>{current.title}</strong><p>{current.message}</p><Link href={current.href} onClick={close}>{current.action}<FiArrowRight size={13} /></Link></div><button className={s.close} aria-label="Cerrar aviso" onClick={close}><FiX size={15} /></button></aside>, document.body);
}
