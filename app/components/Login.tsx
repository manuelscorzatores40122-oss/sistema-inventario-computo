
'use client';

import { useEffect, useState } from 'react';
import {
  FiUser,
  FiLock,
  FiLogIn,
  FiAlertTriangle,
} from 'react-icons/fi';

import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /*
   * ==========================================
   * FONDOS
   * ==========================================
   *
   * Coloca las imágenes dentro de:
   *
   * public/
   * ├── logo.png
   * ├── fondo1.jpg
   * ├── fondo2.jpg
   * ├── fondo3.jpg
   * └── fondo4.jpg
   *
   * Puedes agregar más imágenes aquí.
   */

  const backgrounds = [
    '/fondo.jpeg',
    '/fondo2.jpg',
    '/fondo3.jpeg',
    '/fondo4.jpg',
  ];

  const [currentBackground, setCurrentBackground] = useState(0);
  const [previousBackground, setPreviousBackground] = useState<number | null>(
    null
  );

  /*
   * ==========================================
   * CAMBIO AUTOMÁTICO DE FONDO
   * ==========================================
   *
   * Cambia cada 2 segundos.
   */

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBackground((current) => {
        const next = (current + 1) % backgrounds.length;

        setPreviousBackground(current);

        return next;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [backgrounds.length]);

  /*
   * ==========================================
   * LOGIN
   * ==========================================
   */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error || 'Error al iniciar sesión'
        );

        setLoading(false);

        return;
      }

      /*
       * Guardar sesión
       */

      localStorage.setItem(
        'token',
        data.token
      );

      localStorage.setItem(
        'user',
        JSON.stringify(data.user)
      );

      document.cookie =
        `auth-token=${data.token}; ` +
        `path=/; ` +
        `max-age=86400; ` +
        `SameSite=Lax`;

      /*
       * Redirección según el rol
       */

      const targetPath =
        data.user.role === 'admin'
          ? '/admin/dashboard'
          : '/profesor/dashboard';

      window.location.href = targetPath;

    } catch (err) {
      console.error(err);

      setError('Error de conexión');

      setLoading(false);
    }
  };

  return (
    <main className="login-background">

      {/* =====================================
          FONDO ACTUAL
      ====================================== */}

      <div
        key={`current-${currentBackground}`}
        className="background-image background-current"
        style={{
          backgroundImage: `url("${backgrounds[currentBackground]}")`,
        }}
      />

      {/* =====================================
          FONDO ANTERIOR
      ====================================== */}

      {previousBackground !== null && (
        <div
          key={`previous-${previousBackground}`}
          className="background-image background-previous"
          style={{
            backgroundImage: `url("${backgrounds[previousBackground]}")`,
          }}
        />
      )}

      {/* =====================================
          CAPA SUAVE
      ====================================== */}

      <div className="login-overlay" />

      {/* =====================================
          INDICADORES
      ====================================== */}

      <div className="background-indicators">

        {backgrounds.map((_, index) => (
          <span
            key={index}
            className={
              index === currentBackground
                ? 'indicator active'
                : 'indicator'
            }
          />
        ))}

      </div>

      {/* =====================================
          TARJETA
      ====================================== */}

      <section className="login-card">

        {/* ===================================
            LOGO
        ==================================== */}

        <div className="text-center mb-4">

          <div className="logo-container">

            <img
              src="/logo.png"
              alt="Insignia del colegio"
              className="school-logo"
            />

          </div>

          <h1 className="login-title">
            Colegio
          </h1>

          <p className="login-subtitle">
            Sistema de gestión del aula de computo
          </p>

        </div>

        {/* ===================================
            ERROR
        ==================================== */}

        {error && (
          <div
            className="login-error"
            role="alert"
          >

            <FiAlertTriangle size={18} />

            <span>
              {error}
            </span>

          </div>
        )}

        {/* ===================================
            FORMULARIO
        ==================================== */}

        <form onSubmit={handleSubmit}>

          {/* USUARIO */}

          <div className="form-group">

            <label
              htmlFor="email"
              className="form-label"
            >
              Usuario
            </label>

            <div className="input-container">

              <FiUser
                className="input-icon"
                size={18}
              />

              <input
                id="email"
                type="text"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                className="login-input"
                placeholder="Usuario"
                autoComplete="username"
                required
              />

            </div>

          </div>

          {/* CONTRASEÑA */}

          <div className="form-group password-group">

            <label
              htmlFor="password"
              className="form-label"
            >
              Contraseña
            </label>

            <div className="input-container">

              <FiLock
                className="input-icon"
                size={18}
              />

              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                className="login-input"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />

            </div>

          </div>

          {/* BOTÓN */}

          <button
            type="submit"
            disabled={loading}
            className="login-button"
          >

            <FiLogIn size={18} />

            <span>
              {loading
                ? 'Iniciando sesión...'
                : 'Iniciar Sesión'}
            </span>

          </button>

        </form>

        {/* ===================================
            PIE
        ==================================== */}

        <div className="login-footer">
          <a
            href="https://manuel-scorza-web-olive.vercel.app/"
            className="login-back-link"
          >
            ← Volver
          </a>

          <span className="login-footer-separator">|</span>
          <span className="small text-secondary">Sistema de gestión del aula de cómputo</span>
        </div>

      </section>

    </main>
  );
}

