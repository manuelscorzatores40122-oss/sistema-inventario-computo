'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { FiCheckCircle, FiKey, FiLogOut, FiSave, FiShield, FiUser } from 'react-icons/fi';
import { logout } from '@/app/lib/logout';
import { useTeacher } from './TeacherContext';
import { DataBoundary, Notice, PageHeading } from './TeacherUi';
import s from './TeacherWorkspace.module.css';
import DeveloperContacts from '../DeveloperContacts';

export default function TeacherProfile() {
  const { data, refresh } = useTeacher();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; message: string; section: string } | null>(null);
  const lock = useRef(false);
  const user = data?.user;
  const userId = user?.id, userPhone = user?.telefono, userEmail = user?.correo_personal;
  useEffect(() => { if (userId) { setPhone(userPhone || ''); setEmail(userEmail || ''); } }, [userId, userPhone, userEmail]);
  async function save(event: FormEvent, section: 'contact' | 'password') {
    event.preventDefault();
    if (!user || lock.current) return;
    setNotice(null);
    if (section === 'password' && (password.length < 8 || password !== confirm)) { setNotice({ tone: 'error', message: password.length < 8 ? 'Usa al menos 8 caracteres para tu nueva contraseña.' : 'Las contraseñas nuevas no coinciden.', section }); return; }
    lock.current = true; setBusy(section);
    try {
      const payload = section === 'contact' ? { telefono: phone.trim(), correo_personal: email.trim() } : { password, current_password: currentPassword };
      const response = await fetch(`/api/usuarios/${user.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'No pudimos guardar los cambios.');
      setNotice({ tone: 'success', message: section === 'contact' ? 'Tus datos de contacto se actualizaron correctamente.' : 'Tu contraseña se cambió correctamente. Úsala en tu próximo ingreso.', section });
      if (section === 'password') { setPassword(''); setConfirm(''); setCurrentPassword(''); }
      await refresh();
    } catch (err) { setNotice({ tone: 'error', message: err instanceof Error ? err.message : 'No hay conexión. Intenta nuevamente.', section }); }
    finally { lock.current = false; setBusy(''); }
  }
  return <>
    <PageHeading eyebrow="MI CUENTA" title="Un espacio que es tuyo" description="Mantén tus datos al día y protege el acceso a tu cuenta." />
    <DataBoundary>
      <div className={s.profileLayout}>
        <section className={`${s.card} ${s.profileSummary}`}><span className={s.avatar}>{user?.nombre.charAt(0)}{user?.apellido.charAt(0)}</span><h2>{user?.nombre} {user?.apellido}</h2><p>{user?.area || 'Docente del colegio'}</p><span className={s.badge} data-tone="green"><FiCheckCircle size={12} />Cuenta activa</span><div className={s.divider} /><dl style={{ textAlign: 'left', margin: 0 }}><div className={s.field}><dt className={s.eyebrow}>DNI / Usuario</dt><dd style={{ margin: 0 }}>{user?.dni || user?.email}</dd></div><div className={s.field}><dt className={s.eyebrow}>Institución educativa</dt><dd style={{ margin: 0 }}>I.E. Manuel Scorza</dd></div></dl><button className={`${s.secondary} ${s.full}`} disabled={busy === 'logout'} onClick={() => { setBusy('logout'); void logout(); }}><FiLogOut size={15} />{busy === 'logout' ? 'Cerrando sesión…' : 'Cerrar sesión'}</button></section>
        <div className={s.stack}>
          <form className={s.card} onSubmit={event => void save(event, 'contact')}><div className={s.cardHead}><div><h2>Datos de contacto</h2><p>La información que usa el colegio para comunicarse contigo.</p></div><FiUser color="#698b79" size={19} /></div><div className={s.cardBody}>{notice?.section === 'contact' && <Notice tone={notice.tone}>{notice.message}</Notice>}<div className={s.formGrid}><div className={s.field}><label htmlFor="profile-first">Nombres</label><input id="profile-first" value={user?.nombre || ''} readOnly /></div><div className={s.field}><label htmlFor="profile-last">Apellidos</label><input id="profile-last" value={user?.apellido || ''} readOnly /></div></div><div className={s.formGrid}><div className={s.field}><label htmlFor="profile-phone">Teléfono de contacto</label><input id="profile-phone" type="tel" autoComplete="tel" placeholder="Ej. 987 654 321" maxLength={20} value={phone} onChange={event => setPhone(event.target.value)} /></div><div className={s.field}><label htmlFor="profile-email">Correo personal</label><input id="profile-email" type="email" autoComplete="email" placeholder="tu.correo@ejemplo.com" maxLength={255} value={email} onChange={event => setEmail(event.target.value)} /></div></div><p style={{ fontSize: 11, color: '#6e8186' }}>Para corregir tu nombre, DNI o área, comunícate con administración.</p><button className={s.button} type="submit" disabled={!!busy}><FiSave size={15} />{busy === 'contact' ? 'Guardando…' : 'Guardar datos'}</button></div></form>
          <form className={s.card} onSubmit={event => void save(event, 'password')}><div className={s.cardHead}><div><h2>Seguridad de la cuenta</h2><p>Elige una contraseña personal que puedas recordar.</p></div><FiShield color="#698b79" size={19} /></div><div className={s.cardBody}>{notice?.section === 'password' && <Notice tone={notice.tone}>{notice.message}</Notice>}<input autoComplete="username" value={user?.email || ''} readOnly className="visually-hidden" tabIndex={-1} aria-label="Usuario de la cuenta" /><div className={s.field}><label htmlFor="profile-current-password">Contraseña actual</label><input id="profile-current-password" type="password" autoComplete="current-password" required maxLength={128} value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} /></div><div className={s.formGrid}><div className={s.field}><label htmlFor="profile-new-password">Nueva contraseña</label><input id="profile-new-password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} /><small>Usa al menos 8 caracteres.</small></div><div className={s.field}><label htmlFor="profile-confirm-password">Repite la nueva contraseña</label><input id="profile-confirm-password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={confirm} onChange={event => setConfirm(event.target.value)} /></div></div><button type="submit" className={s.secondary} disabled={!!busy}><FiKey size={15} />{busy === 'password' ? 'Actualizando…' : 'Cambiar contraseña'}</button></div></form>
        </div>
      </div>
      <DeveloperContacts />
    </DataBoundary>
  </>;
}
