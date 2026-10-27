'use client';

import { useEffect, useId, useRef } from 'react';
import Link from 'next/link';
import { FiArrowRight, FiCheckCircle } from 'react-icons/fi';
import type { InboxItem } from '@/app/lib/notification-presentation';
import s from './NotificationCenter.module.css';

export default function MobileApprovalNotice({ item, remaining, onAcknowledge }: {
  item: InboxItem; remaining: number; onAcknowledge: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const description = useId();
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    if (!element.open) element.showModal();
    document.body.style.overflow = 'hidden';
    return () => { element.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, [item.key]);
  return <dialog ref={dialog} className={s.approvalDialog} role="alertdialog" aria-labelledby={title} aria-describedby={description}
    onCancel={event => { event.preventDefault(); onAcknowledge(); }}>
    <div className={s.approvalIcon}><FiCheckCircle size={54} aria-hidden="true" /></div>
    <span className={s.approvalEyebrow}>RESPUESTA DE ADMINISTRACIÓN</span>
    <h2 id={title}>Tu solicitud fue aprobada</h2>
    <p id={description}>Administración aprobó tu solicitud. Revisa los detalles a continuación.</p>
    <div className={s.approvalMessage}>{item.message}</div>
    <button type="button" className={s.approvalAccept} autoFocus onClick={onAcknowledge}>Entendido</button>
    <Link className={s.approvalLink} href={item.href} onClick={onAcknowledge}>Ver mi solicitud <FiArrowRight size={18} /></Link>
    {remaining > 0 && <small>Tienes {remaining} aviso{remaining === 1 ? '' : 's'} más por revisar.</small>}
  </dialog>;
}
