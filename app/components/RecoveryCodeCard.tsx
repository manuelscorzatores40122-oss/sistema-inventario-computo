'use client';

import { useEffect, useId, useState, type FormEvent } from 'react';
import { FiKey } from 'react-icons/fi';
import s from './RecoveryCodeCard.module.css';

export default function RecoveryCodeCard() {
  const id = useId();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/auth/recovery-code', { cache: 'no-store', signal: controller.signal })
      .then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error || 'No se pudo consultar la recuperación.'); setConfigured(!!body.configurado); })
      .catch(error => { if (!controller.signal.aborted) setError(error.message || 'Revisa tu conexión.'); });
    return () => controller.abort();
  }, []);
  async function generate(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(''); setMessage(''); setCode('');
    try {
      const response = await fetch('/api/auth/recovery-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ current_password: password }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'No se pudo generar el código.');
      setCode(body.code); setConfigured(true); setPassword('');
    } catch (error) { setError(error instanceof Error ? error.message : 'No hay conexión. Intenta nuevamente.'); }
    finally { setBusy(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(code); setMessage('Código copiado. Guárdalo en un lugar privado.'); }
    catch { setMessage('Selecciona el código y cópialo manualmente.'); }
  }
  return <section className={s.card} aria-labelledby={`${id}-title`}>
    <header className={s.header}><FiKey size={22} /><div><h2 id={`${id}-title`}>Código de recuperación</h2><p>Recupera tu cuenta con tu DNI y este código si olvidas la contraseña, sin correo ni aprobación del administrador.</p></div></header>
    {error && <div className={s.notice} data-error role="alert">{error}</div>}
    {message && <div className={s.notice} role="status">{message}</div>}
    {code ? <>
      <div className={s.notice}>Solo se muestra ahora. Guárdalo fuera del sistema y no lo compartas. Permite cambiar tu contraseña y sirve una sola vez.</div>
      <code className={s.code} aria-label="Tu código personal de recuperación">{code}</code>
      <div className={s.codeActions}><button type="button" onClick={() => void copy()}>Copiar código</button><button type="button" onClick={() => { setCode(''); setMessage('Código ocultado. Puedes generar otro si no lo guardaste.'); }}>Ya lo guardé, ocultar</button></div>
    </> : <form onSubmit={generate}>
      <p>{configured === null ? 'Confirma tu contraseña para generar un código.' : configured ? 'Ya tienes un código activo. Generar otro invalida el anterior.' : 'Todavía no tienes un código. Genera uno y guárdalo antes de necesitar recuperar tu cuenta.'}</p>
      <label htmlFor={`${id}-password`}>Contraseña actual<input id={`${id}-password`} type="password" autoComplete="current-password" maxLength={128} required disabled={busy} value={password} onChange={event => setPassword(event.target.value)} /></label>
      <button type="submit" disabled={busy}>{busy ? 'Generando…' : configured ? 'Generar otro código' : 'Generar código personal'}</button>
    </form>}
  </section>;
}
