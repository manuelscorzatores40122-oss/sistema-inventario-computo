'use client';

import { useEffect, useId, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FiCheck, FiClock, FiHome } from 'react-icons/fi';

export default function RequestSubmittedNotice({ onAccept }: { onAccept: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const id = useId();

  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    element?.showModal();
    return () => { element?.close(); previousFocus?.focus(); };
  }, []);

  return (
    <dialog ref={dialog} className="approval-notice" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
      onCancel={event => event.preventDefault()}>
      <div className="approval-notice-decoration" aria-hidden="true"><span /><span /><span /></div>
      <div className="approval-notice-icon"><FiCheck size={36} aria-hidden="true" /></div>
      <span className="approval-notice-eyebrow">¡RECIBIMOS TU SOLICITUD!</span>
      <h2 id={`${id}-title`}>Solicitud registrada con éxito</h2>
      <p id={`${id}-description`}>La administración la revisará pronto. Te avisaremos cuando sea aprobada.</p>
      <div className="approval-notice-detail"><FiClock size={20} aria-hidden="true" /><p><strong>Pendiente de revisión</strong><br />Puedes seguir su estado desde el inicio.</p></div>
      <button type="button" autoFocus onClick={() => {
        onAccept();
        router.push('/profesor/dashboard');
      }}>Aceptar e ir al inicio <FiHome size={18} aria-hidden="true" /></button>
    </dialog>
  );
}
