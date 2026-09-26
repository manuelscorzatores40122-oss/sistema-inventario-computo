
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiUser, FiLock, FiLogIn, FiAlertTriangle } from 'react-icons/fi';
import './Login.css';

export default function Login({ register = false }: { register?: boolean }) {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [registered, setRegistered] = useState(false);
  const [greeting, setGreeting] = useState('Te damos la bienvenida');
  const [welcomeMessage, setWelcomeMessage] = useState('Tu espacio para organizar los recursos y reservar el aula de cómputo.');

  useEffect(() => {
    const updateGreeting = () => {
      const hour = Number(new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
      setGreeting(hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches');
      setWelcomeMessage(hour < 12
        ? 'Comienza el día preparando tus clases. Consulta los recursos y reserva el aula de cómputo.'
        : hour < 18
          ? 'Seguimos aprendiendo juntos. Gestiona tus materiales y encuentra un espacio para tu próxima clase.'
          : 'Prepara lo que viene mañana. Organiza tus materiales y deja lista tu próxima reserva.');
    };
    updateGreeting();
    const timer = setInterval(updateGreeting, 60000);
    return () => clearInterval(timer);
  }, []);

  const isRegister = register && !registered;
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
      const response = await fetch(isRegister ? '/api/auth/register' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, nombre: nombre.trim(), apellido: apellido.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || (isRegister ? 'No se pudo crear la cuenta' : 'Error al iniciar sesión'));
        setLoading(false);
        return;
      }

      if (isRegister) {
        setRegistered(true);
        setPassword('');
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
          <span className="login-image-kicker">I.E. Manuel Scorza</span>
          <h2>{greeting}</h2>
          <p>{welcomeMessage}</p>
          <span className="login-community">Juntos, al servicio de nuestra comunidad educativa.</span>
        </div>
      </div>

      <div className="login-form-section">
        <div className="login-form-wrapper">
          <div className="login-header">
            <div className="login-mark">
              <img src="/logo.png" alt="Insignia de la I.E. Manuel Scorza" className="login-logo" />
            </div>
            <p className="login-school">I.E. Manuel Scorza</p>
            <p className="login-mobile-greeting">{greeting}</p>
            <h1 className="login-title">{isRegister ? 'Crea tu cuenta' : 'Iniciar sesión'}</h1>
            <p className="login-subtitle">{isRegister ? 'Regístrate como docente de nuestra comunidad' : 'Ingresa tus credenciales para continuar'}</p>
          </div>

          {registered && <p className="login-success" role="status">Tu cuenta está lista. Inicia sesión con tu DNI y contraseña.</p>}

          {error && (
            <div className="login-alert" role="alert">
              <FiAlertTriangle className="alert-icon" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            {isRegister && <>
              <div className="form-group">
                <label htmlFor="nombre">Nombres</label>
                <div className="input-with-icon">
                  <FiUser className="input-icon" />
                  <input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="given-name" placeholder="Tus nombres" required maxLength={100} />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="apellido">Apellidos</label>
                <div className="input-with-icon">
                  <FiUser className="input-icon" />
                  <input id="apellido" value={apellido} onChange={(e) => setApellido(e.target.value)} autoComplete="family-name" placeholder="Tus apellidos" required maxLength={100} />
                </div>
              </div>
            </>}
            <div className="form-group">
              <label htmlFor="email">DNI</label>
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
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  minLength={isRegister ? 6 : undefined}
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="login-submit-btn">
              {loading ? (isRegister ? 'Creando cuenta...' : 'Verificando...') : (isRegister ? 'Registrarse' : 'Iniciar sesión')}
            </button>
          </form>

          <p className="login-register-link">
            {isRegister ? '¿Ya tienes una cuenta? ' : '¿No tienes una cuenta? '}
            <Link href={isRegister ? '/auth/login' : '/auth/register'}>{isRegister ? 'Inicia sesión' : 'Regístrate'}</Link>
          </p>

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
