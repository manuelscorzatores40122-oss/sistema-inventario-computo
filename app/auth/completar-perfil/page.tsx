'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CompletarPerfil() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [correoPersonal, setCorreoPersonal] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      router.push('/auth/login');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (!correoPersonal) {
      setError('El correo personal es requerido');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/usuarios/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          correo_personal: correoPersonal
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Error al actualizar perfil');
        return;
      }

      // Actualizar el usuario en localStorage
      const updatedUser = { ...user, correo_personal: correoPersonal };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      // Redirigir según rol
      if (updatedUser.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/profesor/dashboard');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
      <div className="card shadow p-4 w-100" style={{ maxWidth: '450px' }}>
        <h1 className="h4 fw-bold text-dark text-center mb-2">Completar Perfil</h1>
        <p className="text-secondary text-center mb-4 text-sm">
          Por seguridad, necesitas cambiar tu contraseña inicial y proporcionar un correo de recuperación.
        </p>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label fw-bold">Nueva Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-control"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-bold">Confirmar Contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="form-control"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="mb-4">
            <label className="form-label fw-bold">Correo Personal</label>
            <input
              type="email"
              value={correoPersonal}
              onChange={(e) => setCorreoPersonal(e.target.value)}
              className="form-control"
              placeholder="tu@correo.real.com"
              required
            />
            <div className="form-text mt-1">Este correo se usará para contactarte. No se usará para iniciar sesión.</div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-100 fw-bold py-2"
          >
            {loading ? 'Guardando...' : 'Guardar y Continuar'}
          </button>
        </form>

        <div className="text-center mt-3">
          <button
            onClick={() => router.push(user.role === 'admin' ? '/admin/dashboard' : '/profesor/dashboard')}
            className="btn btn-link text-secondary text-decoration-none"
          >
            Omitir por ahora
          </button>
        </div>
      </div>
    </div>
  );
}
