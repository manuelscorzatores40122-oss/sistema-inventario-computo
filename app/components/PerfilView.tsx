'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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
    const parsed = JSON.parse(stored);

    fetch(`/api/usuarios/${parsed.id}`)
      .then(res => res.json())
      .then(data => {
        const u = data.usuario;
        setUser(u);
        setEmail(u.email);
        setTelefono(u.telefono || '');
        setCorreoPersonal(u.correo_personal || '');
      })
      .finally(() => setLoading(false));
  }, [router]);

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

  if (loading) return <p>Cargando perfil…</p>;
  if (!user) return <p>No se pudo cargar el perfil</p>;

  return (
    <div>
      <h1>Mi Perfil</h1>

      {message && <p style={{ color: 'green' }}>{message}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <h2>Información</h2>
      <table border={1} cellPadding={8} cellSpacing={0}>
        <tbody>
          <tr><td><strong>Nombres</strong></td><td>{user.nombre}</td></tr>
          <tr><td><strong>Apellidos</strong></td><td>{user.apellido}</td></tr>
          <tr><td><strong>DNI</strong></td><td>{user.dni || user.email}</td></tr>
          <tr><td><strong>Rol</strong></td><td>{user.role === 'admin' ? 'Administrador' : 'Profesor'}</td></tr>
          <tr><td><strong>Área</strong></td><td>{user.area || '—'}</td></tr>
        </tbody>
      </table>

      <h2>Credenciales de acceso</h2>
      <form onSubmit={handleSave}>
        <div>
          <label htmlFor="email">Usuario (DNI)</label>
          <br />
          <input id="email" type="text" value={email} onChange={e => setEmail(e.target.value)} />
        </div>

        <div>
          <label htmlFor="password">Nueva contraseña (opcional)</label>
          <br />
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Dejar vacío para no cambiar"
          />
        </div>

        <div>
          <label htmlFor="telefono">Teléfono</label>
          <br />
          <input id="telefono" type="text" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+51999999999" />
        </div>

        <div>
          <label htmlFor="correoPersonal">Correo personal</label>
          <br />
          <input id="correoPersonal" type="email" value={correoPersonal} onChange={e => setCorreoPersonal(e.target.value)} />
        </div>

        <button type="submit">Guardar cambios</button>
      </form>
    </div>
  );
}