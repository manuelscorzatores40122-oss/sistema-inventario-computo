'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiUser,
  FiMail,
  FiPhone,
  FiShield,
  FiKey,
  FiSave,
  FiCheckCircle,
  FiAlertCircle,
  FiArrowLeft,
  FiBriefcase,
  FiHash,
  FiRefreshCw,
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

export default function PerfilView() {
  const [user, setUser] = useState<UsuarioInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Credenciales
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    const payload: Record<string, string> = {
      email,
      telefono,
      correo_personal: correoPersonal,
    };
    if (password) {
      if (password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres');
        return;
      }
      payload.password = password;
    }

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

    setPassword('');
    setMessage('Perfil actualizado correctamente');
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
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto" style={{ maxWidth: '72rem' }}>

        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center border-b border-slate-200 pb-4 mb-4">
          <div>
            <h1 className="h3 fw-bold text-dark mb-1 d-flex align-items-center gap-2">
              <FiUser className="text-primary" size={26} />
              Mi Perfil
            </h1>
            <p className="text-secondary small mb-0">
              Consulta tu información personal y administra tus credenciales de acceso.
            </p>
          </div>

          <a
            href={isAdmin ? '/admin/dashboard' : '/profesor/dashboard'}
            className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-2 align-self-start mt-2 mt-sm-0"
          >
            <FiArrowLeft size={14} />
            Volver al panel
          </a>
        </div>

        {message && (
          <div className="alert alert-success d-flex align-items-center gap-2" role="alert">
            <FiCheckCircle size={18} />
            <span>{message}</span>
          </div>
        )}
        {error && (
          <div className="alert alert-danger d-flex align-items-center gap-2" role="alert">
            <FiAlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* TARJETA DE PERFIL */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-4 p-md-5">
            <div className="d-flex flex-column flex-md-row align-items-start gap-4">
              <div
                className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold"
                style={{ width: '80px', height: '80px', fontSize: '32px', flexShrink: 0 }}
              >
                {user.nombre.charAt(0).toUpperCase()}
              </div>

              <div className="w-100">
                <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                  <h2 className="h4 fw-bold text-dark mb-0">
                    {user.nombre} {user.apellido}
                  </h2>
                  <span className={`badge ${isAdmin ? 'bg-purple' : 'bg-success'}`}>
                    {isAdmin ? 'Administrador' : 'Profesor'}
                  </span>
                </div>
                <p className="text-secondary small mb-3">{user.email}</p>

                <div className="row g-3">
                  <div className="col-12 col-sm-6 col-lg-3">
                    <div className="d-flex align-items-center gap-2 rounded-3 border p-3 h-100">
                      <span className="rounded d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary" style={{ width: '36px', height: '36px', flexShrink: 0 }}>
                        <FiHash size={16} />
                      </span>
                      <div>
                        <div className="small text-secondary text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>DNI</div>
                        <div className="font-semibold text-dark small">{user.dni || user.email}</div>
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-sm-6 col-lg-3">
                    <div className="d-flex align-items-center gap-2 rounded-3 border p-3 h-100">
                      <span className="rounded d-flex align-items-center justify-content-center bg-success bg-opacity-10 text-success" style={{ width: '36px', height: '36px', flexShrink: 0 }}>
                        <FiBriefcase size={16} />
                      </span>
                      <div>
                        <div className="small text-secondary text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>Área</div>
                        <div className="font-semibold text-dark small">{user.area || '—'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-sm-6 col-lg-3">
                    <div className="d-flex align-items-center gap-2 rounded-3 border p-3 h-100">
                      <span className="rounded d-flex align-items-center justify-content-center bg-info bg-opacity-10 text-info" style={{ width: '36px', height: '36px', flexShrink: 0 }}>
                        <FiPhone size={16} />
                      </span>
                      <div>
                        <div className="small text-secondary text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>Teléfono</div>
                        <div className="font-semibold text-dark small">{user.telefono || '—'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-sm-6 col-lg-3">
                    <div className="d-flex align-items-center gap-2 rounded-3 border p-3 h-100">
                      <span className="rounded d-flex align-items-center justify-content-center bg-warning bg-opacity-10 text-warning" style={{ width: '36px', height: '36px', flexShrink: 0 }}>
                        <FiMail size={16} />
                      </span>
                      <div>
                        <div className="small text-secondary text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>Correo</div>
                        <div className="font-semibold text-dark small">{user.correo_personal || '—'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CREDENCIALES */}
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4 p-md-5">
            <h2 className="h5 fw-bold text-dark mb-1 d-flex align-items-center gap-2">
              <span className="rounded d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary" style={{ width: '34px', height: '34px' }}>
                <FiKey size={17} />
              </span>
              Credenciales de acceso
            </h2>
            <p className="text-secondary small mb-4">
              Actualiza tu usuario, contraseña o datos de contacto.
            </p>

            <form onSubmit={handleSave} className="row g-4">
              <div className="col-12 col-md-6">
                <label className="inventory-form-label">
                  <span className="d-inline-flex align-items-center gap-1"><FiUser size={12} /> Usuario (DNI)</span>
                </label>
                <input id="email" type="text" value={email} onChange={e => setEmail(e.target.value)} className="inventory-form-input" required />
              </div>

              <div className="col-12 col-md-6">
                <label className="inventory-form-label">
                  <span className="d-inline-flex align-items-center gap-1"><FiMail size={12} /> Correo personal</span>
                </label>
                <input id="correoPersonal" type="email" value={correoPersonal} onChange={e => setCorreoPersonal(e.target.value)} className="inventory-form-input" placeholder="contacto@email.com" />
              </div>

              <div className="col-12 col-md-6">
                <label className="inventory-form-label">
                  <span className="d-inline-flex align-items-center gap-1"><FiPhone size={12} /> Teléfono / WhatsApp</span>
                </label>
                <input id="telefono" type="text" value={telefono} onChange={e => setTelefono(e.target.value)} className="inventory-form-input" placeholder="+51999999999" />
              </div>

              <div className="col-12 col-md-6">
                <label className="inventory-form-label">
                  <span className="d-inline-flex align-items-center gap-1"><FiKey size={12} /> Nueva contraseña</span>
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="inventory-form-input"
                  placeholder="Dejar vacío para no cambiar"
                />
              </div>

              <div className="col-12">
                <button type="submit" className="btn-primary-custom d-inline-flex align-items-center gap-2">
                  <FiSave size={15} />
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
