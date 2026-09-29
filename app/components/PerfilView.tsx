'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiUser,
  FiMail,
  FiPhone,
  FiSettings,
  FiKey,
  FiSave,
  FiCheckCircle,
  FiAlertCircle,
  FiArrowLeft,
  FiRefreshCw,
  FiX,
} from 'react-icons/fi';
import './PerfilView.css';

type UsuarioInfo = {
  id: number;
  email: string;
  nombre: string;
  apellido: string;
  role: string;
  telefono: string | null;
  correo_personal: string | null;
  dni: string | null;
  area: string | null;
  activo: boolean;
};

export default function PerfilView() {
  const [user, setUser] = useState<UsuarioInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = editorRef.current;
    if (!editing || !dialog) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [editing]);

  // Credenciales
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!editing) {
      setChangingPassword(false);
      setPassword('');
    }
  }, [editing]);
  const [telefono, setTelefono] = useState('');
  const [correoPersonal, setCorreoPersonal] = useState('');

  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) {
      router.push('/auth/login');
      return;
    }

    const controller = new AbortController();

    const loadProfile = async () => {
      setLoading(true);
      setError('');

      try {
        const parsed = JSON.parse(stored);
        if (!parsed?.id) {
          router.push('/auth/login');
          return;
        }

        const response = await fetch(`/api/usuarios/${parsed.id}`, { signal: controller.signal });
        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.usuario) {
          throw new Error(data?.error || 'No se pudo obtener la información del perfil');
        }

        const u: UsuarioInfo = data.usuario;
        setUser(u);
        setEmail(u.email || '');
        setTelefono(u.telefono || '');
        setCorreoPersonal(u.correo_personal || '');
      } catch (loadError) {
        if ((loadError as Error).name === 'AbortError') return;
        console.error('Error al cargar perfil:', loadError);
        setUser(null);
        setError((loadError as Error).message || 'No se pudo cargar el perfil');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadProfile();
    return () => controller.abort();
  }, [router, reloadKey]);

  useEffect(() => {
    if (!message || !user) return;
    const timer = window.setTimeout(() => {
      router.push(user.role === 'admin' ? '/admin/dashboard' : '/profesor/dashboard');
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [message, user, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || message || !user) return;
    setMessage('');
    setError('');

    const payload: Record<string, string> = {
      email,
      telefono,
      correo_personal: correoPersonal,
    };
    if (changingPassword && password) {
      if (password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres');
        return;
      }
      payload.password = password;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/usuarios/${user?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al guardar');
        return;
      }

      localStorage.setItem('user', JSON.stringify({
        id: user?.id,
        email,
        nombre: user?.nombre,
        apellido: user?.apellido,
        role: user?.role,
        telefono,
        correo_personal: correoPersonal,
      }));

      setUser(current => current ? { ...current, email, telefono, correo_personal: correoPersonal } : current);
      setPassword('');
      setEditing(false);
      setMessage('Cambios guardados correctamente. Te llevamos al inicio…');
    } catch {
      setError('No se pudieron guardar los cambios. Comprueba tu conexión e inténtalo nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status" />
          <div className="text-secondary">Cargando perfil...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 d-flex align-items-center justify-content-center">
        <div className="text-center p-4">
          <FiAlertCircle className="text-danger mb-2" size={32} />
          <div className="fw-bold text-dark mb-1">No se pudo cargar el perfil</div>
          <p className="text-secondary small mb-3">{error || 'Comprueba la conexión e inténtalo nuevamente.'}</p>
          <button type="button" className="btn btn-primary d-inline-flex align-items-center gap-2" onClick={() => setReloadKey((key) => key + 1)}>
            <FiRefreshCw size={15} />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const isAdmin = user.role === 'admin';

  return (
    <div className="profile-page">
      <div className="profile-card">
        <header className="profile-toolbar">
          <h1>Perfil</h1>
          <button type="button" className="profile-settings" aria-label={editing ? 'Cerrar edición del perfil' : 'Editar perfil'} aria-expanded={editing} aria-controls="profile-editor" onClick={() => setEditing(!editing)}>
            <FiSettings size={20} />
          </button>
        </header>
        <section className="profile-identity" aria-label="Información del usuario">
          <div className="profile-avatar"><FiUser size={42} aria-hidden="true" /></div>
          <h2>{user.nombre} {user.apellido}</h2>
          <p>{isAdmin ? 'Administrador' : 'Profesor'}{user.area ? ` · ${user.area}` : ''}</p>
        </section>

        {message && (
          <div className="alert alert-success profile-save-notice d-flex align-items-center gap-2" role="status" aria-live="polite">
            <FiCheckCircle size={18} />
            <span>{message}</span>
          </div>
        )}
        {error && !editing && (
          <div className="alert alert-danger d-flex align-items-center gap-2" role="alert">
            <FiAlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className="profile-information">
          <dl className="profile-details">
            <div><dt>DNI</dt><dd>{user.dni || user.email}</dd></div>
            <div><dt>Correo</dt><dd>{user.correo_personal || 'Sin registrar'}</dd></div>
            <div><dt>Teléfono</dt><dd>{user.telefono || 'Sin registrar'}</dd></div>
            <div><dt>Área</dt><dd>{user.area || 'Sin asignar'}</dd></div>
          </dl>
          <button type="button" className="profile-edit-button" aria-expanded={editing} aria-controls="profile-editor" onClick={() => setEditing(!editing)}>
            {editing ? 'Cerrar edición' : 'Editar perfil'} <FiSettings size={15} />
          </button>
          <a href={isAdmin ? '/admin/dashboard' : '/profesor/dashboard'} className="profile-back-link"><FiArrowLeft size={14} /> Volver al panel</a>
        </div>

        {/* CREDENCIALES */}
        <dialog id="profile-editor" ref={editorRef} className="profile-editor profile-editor-dialog"
          aria-labelledby="profile-editor-heading" aria-describedby="profile-editor-description"
          onCancel={(event) => { event.preventDefault(); if (!saving) setEditing(false); }}>
          <header className="profile-editor-dialog-header">
            <h2 id="profile-editor-heading">Editar perfil</h2>
            <button type="button" className="profile-editor-close" onClick={() => setEditing(false)} disabled={saving} aria-label="Cerrar edición">
              <FiX size={20} strokeWidth={2} aria-hidden="true" />
            </button>
          </header>
          <div className="profile-editor-content">
            <h3 className="profile-editor-title">
              <span className="profile-editor-icon">
                <FiKey size={17} />
              </span>
              Tus datos y acceso
            </h3>
            <p id="profile-editor-description" className="profile-editor-description">
              Actualiza tu usuario, contraseña o datos de contacto.
            </p>

            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            <form onSubmit={handleSave}>
              <fieldset disabled={saving || !!message} className="row g-4">
              <div className="col-12">
                <label htmlFor="email" className="inventory-form-label">
                  <span className="d-inline-flex align-items-center gap-1"><FiUser size={12} /> Usuario (DNI)</span>
                </label>
                <input id="email" type="text" value={email} onChange={e => setEmail(e.target.value)} className="inventory-form-input" required />
              </div>

              <div className="col-12">
                <label htmlFor="correoPersonal" className="inventory-form-label">
                  <span className="d-inline-flex align-items-center gap-1"><FiMail size={12} /> Correo personal</span>
                </label>
                <input id="correoPersonal" type="email" value={correoPersonal} onChange={e => setCorreoPersonal(e.target.value)} className="inventory-form-input" placeholder="contacto@email.com" />
              </div>

              <div className="col-12">
                <label htmlFor="telefono" className="inventory-form-label">
                  <span className="d-inline-flex align-items-center gap-1"><FiPhone size={12} /> Teléfono / WhatsApp</span>
                </label>
                <input id="telefono" type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} className="inventory-form-input" placeholder="+51999999999" />
              </div>

              <div className="col-12">
                <button type="button" className="profile-password-toggle"
                  aria-expanded={changingPassword} aria-controls="profile-password-fields"
                  onClick={() => { setChangingPassword(!changingPassword); setPassword(''); }}>
                  <FiKey size={17} aria-hidden="true" />
                  {changingPassword ? 'Cancelar cambio de contraseña' : 'Cambiar contraseña'}
                </button>
                <div id="profile-password-fields" hidden={!changingPassword}>
                  {changingPassword && (
                    <div className="mt-3">
                      <label htmlFor="password" className="inventory-form-label">Nueva contraseña</label>
                      <input id="password" type="password" autoComplete="new-password"
                        value={password} onChange={e => setPassword(e.target.value)}
                        className="inventory-form-input" minLength={6} required
                        aria-describedby="profile-password-help" />
                      <p id="profile-password-help" className="profile-password-help">Usa al menos 6 caracteres.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="col-12">
                <button type="submit" className="profile-edit-button">
                  <FiSave size={15} />
                  {saving ? 'Guardando…' : message ? 'Guardado correctamente' : 'Guardar cambios'}
                </button>
              </div>
              </fieldset>
            </form>
          </div>
        </dialog>

      </div>
    </div>
  );
}
