
'use client';

import { useEffect, useState } from 'react';
import { FiUser, FiLock, FiLogIn, FiAlertTriangle, FiMessageSquare } from 'react-icons/fi';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const backgrounds = [
    '/fondo.jpeg',
    '/fondo2.jpg',
    '/fondo3.jpeg',
    '/fondo4.jpg',
  ];
  
  const [currentBackground, setCurrentBackground] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBackground((current) => (current + 1) % backgrounds.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [backgrounds.length]);

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

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      document.cookie = `auth-token=${data.token}; path=/; max-age=86400; SameSite=Lax`;

      const targetPath = data.user.role === 'admin' ? '/admin/dashboard' : '/profesor/dashboard';
      window.location.href = targetPath;
      
    } catch (err) {
      setError('Error de conexión con el servidor');
      setLoading(false);
    }
  };

  return (
    <main className="login-container">
      <div className="login-image-section">
        <div 
          className="login-background-image" 
          style={{ backgroundImage: `url("${backgrounds[currentBackground]}")` }}
        />
        <div className="login-image-overlay">
          <h2>I.E. Manuel Scorza</h2>
          <p>Sistema centralizado para la gestión del inventario y reservas del aula de cómputo.</p>
        </div>
      </div>

      <div className="login-form-section">
        <div className="login-form-wrapper">
          <div className="login-header">
            <div className="login-mark" aria-hidden="true"><FiMessageSquare /></div>
            <img src="/logo.png" alt="Insignia del colegio" className="login-logo" />
            <p className="login-school">I.E. Manuel Scorza</p>
            <h1 className="login-title">Bienvenido</h1>
            <p className="login-subtitle">Accede al sistema de inventario</p>
          </div>

          {error && (
            <div className="login-alert" role="alert">
              <FiAlertTriangle className="alert-icon" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Usuario</label>
              <div className="input-with-icon">
                <FiUser className="input-icon" />
                <input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ingresa tu DNI"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <div className="input-with-icon">
                <FiLock className="input-icon" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="login-submit-btn">
              <FiLogIn className="btn-icon" />
              {loading ? 'Verificando...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="login-footer">
            <a href="https://manuel-scorza-web-olive.vercel.app/" className="back-link">
              ← Volver al portal
            </a>
            <span className="footer-text">© {new Date().getFullYear()} I.E. Manuel Scorza</span>
          </div>
        </div>
      </div>
    </main>
  );
}
