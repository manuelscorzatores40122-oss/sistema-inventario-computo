'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiShield, FiUser, FiLock, FiLogIn, FiAlertTriangle } from 'react-icons/fi';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Error al iniciar sesión');
        setLoading(false);
        return;
      }

      // Guardar token y usuario
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      document.cookie = `auth-token=${data.token}; path=/; max-age=86400; SameSite=Lax`;

      const targetPath = data.user.role === 'admin' ? '/admin/dashboard' : '/profesor/dashboard';
      window.location.href = targetPath;
    } catch (err) {
      setError('Error de conexión');
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light" style={{ backgroundColor: 'var(--color-slate-50) !important' }}>
      <div className="card shadow p-4 p-md-5 w-100" style={{ maxWidth: '420px', border: 'none', borderRadius: '1rem' }}>
        <div className="text-center mb-4">
          <div
            className="bg-primary rounded-3 d-inline-flex align-items-center justify-content-center text-white mb-3 mx-auto"
            style={{ width: '64px', height: '64px', boxShadow: '0 8px 16px rgba(37, 99, 235, 0.3)' }}
          >
            <FiShield size={32} />
          </div>

          <h1 className="h3 fw-bold text-dark mb-1">Colegio</h1>
          <p className="text-secondary mb-0">Sistema de Inventarios</p>
        </div>

        {error && (
          <div className="alert alert-danger d-flex align-items-center gap-2" role="alert">
            <FiAlertTriangle className="flex-shrink-0" size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label fw-bold">
              Usuario
            </label>
            <div className="input-group">
              <span className="input-group-text bg-white">
                <FiUser className="text-secondary" size={17} />
              </span>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-control"
                placeholder="Usuario"
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label fw-bold">
              Contraseña
            </label>
            <div className="input-group">
              <span className="input-group-text bg-white">
                <FiLock className="text-secondary" size={17} />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-control"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-100 fw-bold py-2 d-flex align-items-center justify-content-center gap-2"
            style={{ borderRadius: '0.5rem' }}
          >
            <FiLogIn size={18} />
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="text-center mt-4">
          <p className="small text-secondary mb-0">
            Sistema de gestión para colegios
          </p>
        </div>
      </div>
    </div>
  );
}