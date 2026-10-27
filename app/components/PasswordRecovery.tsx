'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { FiAlertTriangle, FiEye, FiEyeOff, FiKey, FiLock, FiUser } from 'react-icons/fi';
import './Login.css';

export default function PasswordRecovery() {
  const [dni, setDni] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError('');
    if (password !== confirmation) { setError('Las contraseñas no coinciden.'); return; }
    setBusy(true);
    try {
      const response = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dni: dni.trim(), code, password, password_confirmation: confirmation }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'No se pudo recuperar el acceso.');
      setSuccess(body.message); setCode(''); setPassword(''); setConfirmation('');
      localStorage.removeItem('token'); localStorage.removeItem('user');
    } catch (error) { setError(error instanceof Error ? error.message : 'No hay conexión. Intenta nuevamente.'); }
    finally { setBusy(false); }
  }
  return <main className="login-container">
    <div className="login-image-section"><div className="login-background-image" style={{ backgroundImage: 'url("/fondo.jpeg")' }} /><div className="login-image-overlay"><span className="login-image-kicker">I.E. Manuel Scorza</span><h2>Recupera tu acceso</h2><p>Usa el código privado que generaste desde tu perfil para volver a ingresar.</p></div></div>
    <div className="login-form-section"><div className="login-form-wrapper">
      <header className="login-header"><p className="login-school">I.E. Manuel Scorza</p><h1 className="login-title">{success ? 'Contraseña actualizada' : 'Recuperar contraseña'}</h1><p className="login-subtitle">{success ? 'Ya puedes volver a ingresar.' : 'Ingresa tu DNI, tu código personal y la nueva contraseña.'}</p></header>
      {success ? <div className="login-success" role="status">{success}</div> : <>
        {error && <div className="login-alert" role="alert"><FiAlertTriangle className="alert-icon" /><span>{error}</span></div>}
        <form className="login-form" onSubmit={submit}>
          <fieldset disabled={busy} className="recovery-fields">
            <div className="form-group"><label htmlFor="recovery-dni">DNI</label><div className="input-with-icon"><FiUser className="input-icon" /><input id="recovery-dni" inputMode="numeric" autoComplete="username" pattern="[0-9]{8}" maxLength={8} required placeholder="Tus 8 dígitos" value={dni} onChange={event => setDni(event.target.value.replace(/\D/g, ''))} /></div></div>
            <div className="form-group"><label htmlFor="recovery-code">Código personal de recuperación</label><div className="input-with-icon"><FiKey className="input-icon" /><input id="recovery-code" type="password" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={80} required placeholder="El código que guardaste" value={code} onChange={event => setCode(event.target.value)} /></div><small className="login-field-help">Puedes pegarlo con o sin guiones. El DNI por sí solo no recupera una cuenta.</small></div>
            {[{ id: 'recovery-password', label: 'Nueva contraseña', value: password, setter: setPassword }, { id: 'recovery-confirmation', label: 'Repite la nueva contraseña', value: confirmation, setter: setConfirmation }].map(field => <div className="form-group" key={field.id}><label htmlFor={field.id}>{field.label}</label><div className="input-with-icon"><FiLock className="input-icon" /><input id={field.id} type={show ? 'text' : 'password'} autoComplete="new-password" required minLength={8} maxLength={128} placeholder="Al menos 8 caracteres" value={field.value} onChange={event => field.setter(event.target.value)} /><button type="button" className="login-password-toggle" aria-label={show ? `Ocultar: ${field.label}` : `Mostrar: ${field.label}`} aria-pressed={show} onClick={() => setShow(!show)}>{show ? <FiEyeOff /> : <FiEye />}</button></div></div>)}
            <button type="submit" className="login-submit-btn">{busy ? 'Actualizando…' : 'Cambiar contraseña'}</button>
          </fieldset>
        </form>
        <p className="login-field-help">¿Nunca generaste un código o también lo perdiste? Contacta a administración para restablecer el acceso. Después podrás generar uno desde tu perfil.</p>
      </>}
      <p className="login-register-link"><Link href="/auth/login">Volver a iniciar sesión</Link></p>
    </div></div>
  </main>;
}
