'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { FiAlertCircle, FiInbox, FiRefreshCw, FiX } from 'react-icons/fi';
import { useTeacher } from './TeacherContext';
import s from './TeacherWorkspace.module.css';

const labels: Record<string, [string, string]> = {
  pendiente: ['En revisión', 'amber'], aprobada: ['Aprobada', 'green'], rechazada: ['No aprobada', 'red'],
  cancelada: ['Cancelada', 'gray'], prestado: ['En uso', 'blue'], devuelto: ['Devuelto', 'green'], cancelado: ['Cancelado', 'gray'],
};
export function Status({ value, loan = false }: { value: string; loan?: boolean }) {
  const [label, tone] = loan && value === 'pendiente' ? ['Listo para recoger', 'green'] : labels[value] || [value, 'gray'];
  return <span className={s.badge} data-tone={tone}><span aria-hidden="true">●</span>{label}</span>;
}
export function PageHeading({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: ReactNode }) {
  return <header className={s.pageHeading}><div><span className={s.eyebrow}>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{actions && <div className={s.headingActions}>{actions}</div>}</header>;
}
export function RefreshButton() {
  const { refreshing, refresh } = useTeacher();
  return <button className={s.secondary} disabled={refreshing} onClick={() => void refresh()}><FiRefreshCw size={14} />{refreshing ? 'Actualizando…' : 'Actualizar'}</button>;
}
export function EmptyState({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <div className={s.empty}><FiInbox size={30} /><h3>{title}</h3><p>{description}</p>{children}</div>;
}
export function DataBoundary({ children }: { children: ReactNode }) {
  const { data, loading, error, refresh } = useTeacher();
  if (loading) return <div role="status" aria-label="Cargando tu espacio docente"><div className={s.stats}>{[1, 2, 3, 4].map(n => <div key={n} className={s.skeleton} />)}</div><div className={s.skeleton} style={{ minHeight: 340 }} /><span className="visually-hidden">Cargando información…</span></div>;
  if (!data) return <EmptyState title="No pudimos cargar tu espacio" description={error || 'Comprueba tu conexión e intenta nuevamente.'}><button className={s.button} onClick={() => void refresh()}><FiRefreshCw />Volver a intentar</button></EmptyState>;
  return <>{children}</>;
}
export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'error' | 'success' | 'warning' }) {
  return <div className={`${s.info} ${tone !== 'info' ? s[tone] : ''}`} role={tone === 'error' ? 'alert' : 'status'}><FiAlertCircle size={18} /><div>{children}</div></div>;
}
export function Modal({ title, children, onClose, busy = false }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    if (dialog && !dialog.open) dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => { dialog?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <dialog ref={ref} className={s.dialog} aria-labelledby={id} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className={s.dialogHead}><h2 id={id}>{title}</h2><button type="button" className={s.iconButton} disabled={busy} aria-label="Cerrar ventana" onClick={onClose}><FiX size={18} /></button></div><div className={s.dialogBody}>{children}</div>
  </dialog>;
}
export function Pagination({ page, total, size = 8, onChange }: { page: number; total: number; size?: number; onChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (total <= size) return null;
  return <nav className={s.pagination} aria-label="Paginación"><span>{(page - 1) * size + 1}–{Math.min(page * size, total)} de {total}</span><div><button className={s.secondary} disabled={page <= 1} onClick={() => onChange(page - 1)}>Anterior</button><button className={s.secondary} disabled={page >= pages} onClick={() => onChange(page + 1)}>Siguiente</button></div></nav>;
}
