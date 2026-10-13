'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FiUser,
  FiMail,
  FiPhone,
  FiKey,
  FiSave,
  FiCheckCircle,
  FiAlertCircle,
  FiArrowLeft,
  FiRefreshCw,
  FiX,
  FiCamera,
  FiLock,
  FiLogOut,
  FiChevronRight,
  FiEdit2,
  FiBriefcase
} from 'react-icons/fi';

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

export default function ProfesorPerfilView() {
  const [user, setUser] = useState<UsuarioInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Credenciales
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [telefono, setTelefono] = useState('');
  const [correoPersonal, setCorreoPersonal] = useState('');

  const router = useRouter();

  useEffect(() => {
    if (!editing) {
      setChangingPassword(false);
      setPassword('');
      setMessage('');
      setError('');
    }
  }, [editing]);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || !user) return;
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
      setMessage('Tus datos se actualizaron correctamente.');
      
      setTimeout(() => {
        setEditing(false);
      }, 1500);
      
    } catch {
      setError('No se pudieron guardar los cambios. Inténtalo nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    router.push('/auth/login');
  };

  if (loading) {
    return (
      <div className="min-vh-100 bg-slate-50 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" style={{ color: '#028271' }} role="status" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-vh-100 bg-slate-50 d-flex flex-column align-items-center justify-content-center p-4">
        <FiAlertCircle className="text-danger mb-3" size={40} />
        <h4 className="fw-bold mb-2">Error al cargar</h4>
        <p className="text-slate-500 mb-4 text-center">{error}</p>
        <button onClick={() => setReloadKey(k => k + 1)} className="btn btn-primary d-flex align-items-center gap-2" style={{ backgroundColor: '#028271', borderColor: '#028271' }}>
          <FiRefreshCw /> Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-slate-50 d-flex flex-column">
      
      {/* HEADER CURVO */}
      <div className="text-white position-relative" style={{ background: '#028271', paddingBottom: '40px', borderBottomLeftRadius: '35px', borderBottomRightRadius: '35px' }}>
        <div className="d-flex align-items-center p-3 pt-4">
          <Link href="/profesor/dashboard" className="btn text-dark bg-white border-0 rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: '40px', height: '40px' }} aria-label="Volver">
            <FiArrowLeft size={22} />
          </Link>
          <h1 className="h5 fw-bold m-0 ms-3 text-white">Perfil</h1>
        </div>

        <div className="d-flex flex-column align-items-center mt-2 mb-2">
          <div className="position-relative mb-3">
             <div className="rounded-circle d-flex align-items-center justify-content-center bg-white text-slate-400 fw-bold shadow" style={{ width: '96px', height: '96px', fontSize: '2rem', border: '3px solid rgba(255,255,255,0.7)', color: '#64748b' }}>
               {user.nombre ? user.nombre.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'JP'}
             </div>
             <button className="btn rounded-circle bg-white text-slate-600 shadow position-absolute d-flex align-items-center justify-content-center border-0" style={{ width: '32px', height: '32px', bottom: 0, right: 0, padding: 0 }}>
               <FiCamera size={16} />
             </button>
          </div>
          <h2 className="h4 fw-bold m-0 text-white">Prof. {user.nombre} {user.apellido}</h2>
          <p className="text-white-50 m-0 mt-1 mb-2">Profesor</p>
          <div className="rounded-pill px-3 py-1 fw-medium" style={{ backgroundColor: 'rgba(255,255,255,0.2)', fontSize: '0.85rem' }}>
            Área: {user.area || 'Sin asignar'}
          </div>
        </div>
      </div>

      <div className="container-fluid px-3 position-relative" style={{ marginTop: '-20px', zIndex: 10, paddingBottom: '90px' }}>
        
        {/* INFORMACIÓN PERSONAL */}
        <div className="card border-0 shadow-sm rounded-4 mb-3 p-4">
          <h3 className="h6 fw-bold text-dark d-flex align-items-center gap-2 mb-4" style={{ color: '#0f172a' }}>
            <FiUser className="text-primary" size={18} style={{ color: '#028271' }} /> Información personal
          </h3>
          
          <div className="d-flex flex-column gap-4 mb-4">
             <div className="d-flex gap-3 align-items-start">
               <div className="text-slate-400"><div style={{ width: '24px', height: '24px', border: '2px solid currentColor', borderRadius: '4px', position: 'relative' }}><div style={{ position: 'absolute', top: '4px', left: '4px', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'currentColor' }}></div><div style={{ position: 'absolute', top: '13px', left: '4px', width: '12px', height: '2px', backgroundColor: 'currentColor' }}></div></div></div>
               <div>
                 <div className="small text-slate-400 fw-medium" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>DNI</div>
                 <div className="fw-semibold text-dark" style={{ color: '#1e293b' }}>{user.dni || user.email}</div>
               </div>
             </div>
             
             <div className="d-flex gap-3 align-items-start">
               <div className="text-slate-400"><FiMail size={22} /></div>
               <div>
                 <div className="small text-slate-400 fw-medium" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>Correo</div>
                 <div className="fw-semibold text-dark text-break" style={{ color: '#1e293b' }}>{user.correo_personal || 'Sin registrar'}</div>
               </div>
             </div>
             
             <div className="d-flex gap-3 align-items-start">
               <div className="text-slate-400"><FiPhone size={22} /></div>
               <div>
                 <div className="small text-slate-400 fw-medium" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>Teléfono</div>
                 <div className="fw-semibold text-dark" style={{ color: '#1e293b' }}>{user.telefono || 'Sin registrar'}</div>
               </div>
             </div>
             
             <div className="d-flex gap-3 align-items-start">
               <div className="text-slate-400"><FiBriefcase size={22} /></div>
               <div>
                 <div className="small text-slate-400 fw-medium" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>Área</div>
                 <div className="fw-semibold text-dark" style={{ color: '#1e293b' }}>{user.area || 'Sin asignar'}</div>
               </div>
             </div>
          </div>
          
          <button onClick={() => { setEditing(true); setChangingPassword(false); }} className="btn w-100 rounded-3 py-2 fw-bold d-flex justify-content-center align-items-center gap-2 mt-2" style={{ backgroundColor: '#ffedd5', color: '#ea580c', border: 'none' }}>
            <FiEdit2 size={16} /> Editar perfil
          </button>
        </div>

        {/* SEGURIDAD */}
        <div className="card border-0 shadow-sm rounded-4 mb-4 p-3">
          <h3 className="h6 fw-bold text-dark d-flex align-items-center gap-2 mb-3" style={{ color: '#0f172a' }}>
            <FiLock size={18} style={{ color: '#0ea5e9' }} /> Seguridad
          </h3>
          <button onClick={() => { setEditing(true); setChangingPassword(true); }} className="btn bg-transparent text-start w-100 rounded-3 py-2 px-3 d-flex justify-content-between align-items-center border" style={{ borderColor: '#e2e8f0', color: '#0f172a' }}>
            <span className="d-flex align-items-center gap-2 fw-semibold" style={{ fontSize: '0.9rem' }}><FiKey size={16} className="text-slate-400" /> Cambiar contraseña</span>
            <FiChevronRight className="text-slate-400" />
          </button>
        </div>

        {/* CERRAR SESIÓN */}
        <div className="card border-0 shadow-sm rounded-4 mb-4 p-1">
           <button onClick={handleLogout} className="btn text-start w-100 rounded-3 py-3 px-3 d-flex align-items-center gap-3 bg-transparent border-0 fw-bold" style={{ color: '#0f172a', fontSize: '0.95rem' }}>
             <FiLogOut className="text-danger" size={20} /> Cerrar sesión
           </button>
        </div>

      </div>

      {/* DIÁLOGO DE EDICIÓN */}
      {editing && (
        <div className="request-modal-layer d-flex align-items-end justify-content-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)', position: 'fixed', inset: 0, zIndex: 1050, padding: 0 }} role="presentation" onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEditing(false);
          }}>
          <div className="card border-0 overflow-hidden shadow-lg w-100 mx-auto animate__animated animate__slideInUp animate__faster" style={{ maxWidth: '450px', maxHeight: '90vh', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, display: 'flex', flexDirection: 'column' }}>
            <header className="px-4 pt-4 pb-3 d-flex align-items-center justify-content-between bg-white border-bottom border-slate-100">
              <h2 className="m-0 fw-bold text-dark h5">{changingPassword ? 'Cambiar contraseña' : 'Editar perfil'}</h2>
              <button type="button" onClick={() => setEditing(false)} className="btn text-slate-400 p-1 border-0 bg-transparent rounded-circle"><FiX size={24} /></button>
            </header>
            
            <div className="bg-white p-4 overflow-auto flex-grow-1">
              {error && <div className="alert alert-danger p-2 mb-3 small" role="alert"><FiAlertCircle className="me-1" /> {error}</div>}
              {message && <div className="alert alert-success p-2 mb-3 small" role="alert"><FiCheckCircle className="me-1" /> {message}</div>}
              
              <form onSubmit={handleSave} className="d-flex flex-column gap-3">
                {!changingPassword ? (
                  <>
                    <div>
                      <label className="form-label text-slate-500 fw-medium small mb-1">Usuario (DNI)</label>
                      <input type="text" value={email} onChange={e => setEmail(e.target.value)} className="form-control rounded-3 border-slate-300 py-2" required />
                    </div>
                    <div>
                      <label className="form-label text-slate-500 fw-medium small mb-1">Correo personal</label>
                      <input type="email" value={correoPersonal} onChange={e => setCorreoPersonal(e.target.value)} className="form-control rounded-3 border-slate-300 py-2" placeholder="ejemplo@correo.com" />
                    </div>
                    <div>
                      <label className="form-label text-slate-500 fw-medium small mb-1">Teléfono</label>
                      <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} className="form-control rounded-3 border-slate-300 py-2" placeholder="999888777" />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="form-label text-slate-500 fw-medium small mb-1">Nueva contraseña</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="form-control rounded-3 border-slate-300 py-2" minLength={6} placeholder="Mínimo 6 caracteres" required />
                  </div>
                )}
                
                <button type="submit" disabled={saving} className="btn w-100 py-3 rounded-pill fw-bold text-white shadow-sm d-flex justify-content-center align-items-center gap-2 mt-4" style={{ backgroundColor: '#ea580c', border: 'none' }}>
                  {saving ? 'Guardando...' : (
                    <>
                      <FiSave size={18} /> Guardar cambios
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
