'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type Usuario = {
  id: number;
  email: string;
  nombre: string;
  apellido: string;
  role: 'admin' | 'profesor';
  telefono: string | null;
  activo: boolean;
};

type Item = {
  id: number;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  cantidad_total: number;
  cantidad_disponible: number;
  ubicacion: string | null;
  estado: string;
};

type Solicitud = {
  id: number;
  profesor_id: number;
  inventario_id: number | null;
  disponibilidad_id: number | null;
  profesor_nombre: string;
  apellido: string;
  item_nombre: string | null;
  sala_nombre: string | null;
  dia_semana: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  cantidad_solicitada: number;
  motivo: string | null;
  estado: string;
  comentarios: string | null;
  fecha_solicitud: string;
};

type Disponibilidad = {
  id: number;
  sala_nombre: string;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
  reservado_por: number | null;
  reservado_por_nombre: string | null;
  reservado_por_apellido: string | null;
  motivo_reserva: string | null;
};

type Message = { type: 'success' | 'error'; text: string } | null;

const panel = 'bg-white border border-slate-200 rounded-lg shadow-sm';
const input = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
const label = 'block text-xs font-semibold uppercase tracking-wide text-slate-500';
const primaryButton = 'rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300';
const secondaryButton = 'rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50';
const dangerButton = 'rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700';

const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

function getStoredUser(): Usuario | null {
  if (typeof window === 'undefined') return null;
  const value = localStorage.getItem('user');
  return value ? JSON.parse(value) : null;
}

async function readError(response: Response) {
  const data = await response.json().catch(() => null);
  return data?.error || 'No se pudo completar la operación';
}

function Notice({ message }: { message: Message }) {
  if (!message) return null;

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${
      message.type === 'success'
        ? 'border-green-200 bg-green-50 text-green-800'
        : 'border-red-200 bg-red-50 text-red-800'
    }`}>
      {message.text}
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const classes: Record<string, string> = {
    disponible: 'bg-green-50 text-green-700 ring-green-200',
    separado: 'bg-amber-50 text-amber-700 ring-amber-200',
    pendiente: 'bg-blue-50 text-blue-700 ring-blue-200',
    aprobada: 'bg-green-50 text-green-700 ring-green-200',
    rechazada: 'bg-red-50 text-red-700 ring-red-200',
    cancelada: 'bg-slate-100 text-slate-700 ring-slate-200',
    mantenimiento: 'bg-amber-50 text-amber-700 ring-amber-200',
    agotado: 'bg-red-50 text-red-700 ring-red-200',
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${classes[value] || classes.cancelada}`}>
      {value}
    </span>
  );
}

function PageShell({ title, subtitle, backHref, children }: { title: string; subtitle: string; backHref?: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">{title}</h1>
            <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
          </div>
          <a className={secondaryButton} href={backHref || (title.startsWith('Profesor') || title.startsWith('Mis') ? '/profesor/dashboard' : '/admin/dashboard')}>
            Volver al panel
          </a>
        </div>
        {children}
      </div>
    </main>
  );
}

export function AdminInventarioView() {
  const empty = { nombre: '', descripcion: '', categoria: '', cantidad_total: 1, cantidad_disponible: 1, ubicacion: '', estado: 'disponible' };
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    setLoading(true);
    const response = await fetch('/api/inventario?estado=todos');
    const data = await response.json();
    setItems(data.items || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems().catch(() => setMessage({ type: 'error', text: 'Error al cargar inventario' }));
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const response = await fetch(editingId ? `/api/inventario/${editingId}` : '/api/inventario', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (!response.ok) {
      setMessage({ type: 'error', text: await readError(response) });
      return;
    }

    setForm(empty);
    setEditingId(null);
    setMessage({ type: 'success', text: editingId ? 'Artículo actualizado' : 'Artículo creado' });
    fetchItems();
  };

  const edit = (item: Item) => {
    setEditingId(item.id);
    setForm({
      nombre: item.nombre,
      descripcion: item.descripcion || '',
      categoria: item.categoria,
      cantidad_total: item.cantidad_total,
      cantidad_disponible: item.cantidad_disponible,
      ubicacion: item.ubicacion || '',
      estado: item.estado,
    });
  };

  const remove = async (id: number) => {
    if (!confirm('¿Eliminar este artículo?')) return;
    const response = await fetch(`/api/inventario/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      setMessage({ type: 'error', text: await readError(response) });
      return;
    }
    setMessage({ type: 'success', text: 'Artículo eliminado' });
    fetchItems();
  };

  return (
    <PageShell title="Inventario" subtitle="Administra artículos, cantidades, ubicaciones y estado operativo.">
      <Notice message={message} />
      <form onSubmit={submit} className={`${panel} grid gap-4 p-5 md:grid-cols-4`}>
        <div><label className={label}>Nombre</label><input className={input} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required /></div>
        <div><label className={label}>Categoría</label><input className={input} value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} required /></div>
        <div><label className={label}>Total</label><input className={input} type="number" min="0" value={form.cantidad_total} onChange={(e) => setForm({ ...form, cantidad_total: Number(e.target.value) })} required /></div>
        <div><label className={label}>Disponible</label><input className={input} type="number" min="0" value={form.cantidad_disponible} onChange={(e) => setForm({ ...form, cantidad_disponible: Number(e.target.value) })} required /></div>
        <div><label className={label}>Ubicación</label><input className={input} value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} /></div>
        <div><label className={label}>Estado</label><select className={input} value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}><option value="disponible">Disponible</option><option value="mantenimiento">Mantenimiento</option><option value="agotado">Agotado</option></select></div>
        <div className="md:col-span-2"><label className={label}>Descripción</label><input className={input} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></div>
        <div className="flex gap-2 md:col-span-4">
          <button className={primaryButton} type="submit">{editingId ? 'Guardar cambios' : 'Crear artículo'}</button>
          {editingId && <button className={secondaryButton} type="button" onClick={() => { setEditingId(null); setForm(empty); }}>Cancelar</button>}
        </div>
      </form>
      <div className={`${panel} overflow-x-auto`}>
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">Artículo</th><th>Categoría</th><th>Stock</th><th>Ubicación</th><th>Estado</th><th className="px-4 py-3">Acciones</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? <tr><td className="px-4 py-6 text-slate-500" colSpan={6}>Cargando...</td></tr> : items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-slate-900">{item.nombre}<p className="font-normal text-slate-500">{item.descripcion}</p></td>
                <td>{item.categoria}</td><td>{item.cantidad_disponible} / {item.cantidad_total}</td><td>{item.ubicacion || '-'}</td><td><StatusBadge value={item.estado} /></td>
                <td className="px-4 py-3"><button className={secondaryButton} onClick={() => edit(item)}>Editar</button><button className={`${dangerButton} ml-2`} onClick={() => remove(item.id)}>Eliminar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}

export function AdminProfesoresView() {
  const empty = { email: '', nombre: '', apellido: '', password: '', role: 'profesor', telefono: '', activo: true };
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState<Message>(null);

  const fetchUsuarios = async () => {
    const response = await fetch('/api/usuarios');
    const data = await response.json();
    setUsuarios(data.usuarios || []);
  };

  useEffect(() => {
    fetchUsuarios().catch(() => setMessage({ type: 'error', text: 'Error al cargar usuarios' }));
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = editingId && !form.password ? { ...form, password: undefined } : form;
    const response = await fetch(editingId ? `/api/usuarios/${editingId}` : '/api/usuarios', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setMessage({ type: 'error', text: await readError(response) });
      return;
    }

    setForm(empty);
    setEditingId(null);
    setMessage({ type: 'success', text: editingId ? 'Usuario actualizado' : 'Usuario creado' });
    fetchUsuarios();
  };

  const edit = (usuario: Usuario) => {
    setEditingId(usuario.id);
    setForm({ email: usuario.email, nombre: usuario.nombre, apellido: usuario.apellido, password: '', role: usuario.role, telefono: usuario.telefono || '', activo: usuario.activo });
  };

  const deactivate = async (id: number) => {
    const response = await fetch(`/api/usuarios/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      setMessage({ type: 'error', text: await readError(response) });
      return;
    }
    setMessage({ type: 'success', text: 'Usuario desactivado' });
    fetchUsuarios();
  };

  return (
    <PageShell title="Profesores y usuarios" subtitle="Crea profesores, edita datos de contacto, roles y acceso.">
      <Notice message={message} />
      <form onSubmit={submit} className={`${panel} grid gap-4 p-5 md:grid-cols-4`}>
        <div><label className={label}>Nombre</label><input className={input} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required /></div>
        <div><label className={label}>Apellido</label><input className={input} value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} required /></div>
        <div><label className={label}>Email</label><input className={input} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
        <div><label className={label}>Teléfono WhatsApp</label><input className={input} value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="+51999999999" /></div>
        <div><label className={label}>Contraseña</label><input className={input} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editingId} placeholder={editingId ? 'Opcional' : ''} /></div>
        <div><label className={label}>Rol</label><select className={input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="profesor">Profesor</option><option value="admin">Admin</option></select></div>
        <label className="flex items-end gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} /> Activo</label>
        <div className="flex items-end gap-2"><button className={primaryButton} type="submit">{editingId ? 'Guardar' : 'Crear'}</button>{editingId && <button className={secondaryButton} type="button" onClick={() => { setEditingId(null); setForm(empty); }}>Cancelar</button>}</div>
      </form>
      <div className={`${panel} overflow-x-auto`}>
        <table className="w-full min-w-[850px] text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Usuario</th><th>Email</th><th>Teléfono</th><th>Rol</th><th>Estado</th><th className="px-4 py-3">Acciones</th></tr></thead>
          <tbody className="divide-y divide-slate-200">
            {usuarios.map((usuario) => (
              <tr key={usuario.id}><td className="px-4 py-3 font-semibold">{usuario.nombre} {usuario.apellido}</td><td>{usuario.email}</td><td>{usuario.telefono || '-'}</td><td>{usuario.role}</td><td>{usuario.activo ? 'Activo' : 'Inactivo'}</td><td className="px-4 py-3"><button className={secondaryButton} onClick={() => edit(usuario)}>Editar</button><button className={`${dangerButton} ml-2`} onClick={() => deactivate(usuario.id)}>Desactivar</button></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}

export function AdminSolicitudesView() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [comentarios, setComentarios] = useState<Record<number, string>>({});
  const [message, setMessage] = useState<Message>(null);
  const user = useMemo(getStoredUser, []);

  const fetchSolicitudes = async () => {
    const response = await fetch('/api/solicitudes');
    const data = await response.json();
    setSolicitudes(data.solicitudes || []);
  };

  useEffect(() => {
    fetchSolicitudes().catch(() => setMessage({ type: 'error', text: 'Error al cargar solicitudes' }));
  }, []);

  const updateEstado = async (id: number, estado: string) => {
    const response = await fetch(`/api/solicitudes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado, admin_id: user?.id, comentarios: comentarios[id] }),
    });

    if (!response.ok) {
      setMessage({ type: 'error', text: await readError(response) });
      return;
    }

    setMessage({ type: 'success', text: `Solicitud ${estado}` });
    fetchSolicitudes();
  };

  return (
    <PageShell title="Solicitudes" subtitle="Revisa, aprueba o rechaza pedidos de artículos.">
      <Notice message={message} />
      <SolicitudesTable solicitudes={solicitudes} comentarios={comentarios} setComentarios={setComentarios} onApprove={(id) => updateEstado(id, 'aprobada')} onReject={(id) => updateEstado(id, 'rechazada')} />
    </PageShell>
  );
}

function SolicitudesTable({ solicitudes, comentarios, setComentarios, onApprove, onReject, onCancel }: {
  solicitudes: Solicitud[];
  comentarios?: Record<number, string>;
  setComentarios?: (value: Record<number, string>) => void;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onCancel?: (id: number) => void;
}) {
  return (
    <div className={`${panel} overflow-x-auto`}>
      <table className="w-full min-w-[950px] text-sm">
        <thead className="bg-slate-100 text-left text-xs uppercase text-slate-500">
          <tr><th className="px-4 py-3">Profesor</th><th>Artículo</th><th>Sala</th><th>Cantidad</th><th>Motivo</th><th>Estado</th><th>Fecha</th><th className="px-4 py-3">Acciones</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {solicitudes.map((solicitud) => (
            <tr key={solicitud.id}>
              <td className="px-4 py-3 font-semibold">{solicitud.profesor_nombre} {solicitud.apellido}</td>
              <td>{solicitud.item_nombre || '-'}</td>
              <td>{solicitud.sala_nombre ? `${solicitud.sala_nombre} ${solicitud.dia_semana} ${solicitud.hora_inicio}-${solicitud.hora_fin}` : '-'}</td>
              <td>{solicitud.item_nombre ? solicitud.cantidad_solicitada : '-'}</td><td>{solicitud.motivo || '-'}</td><td><StatusBadge value={solicitud.estado} /></td><td>{new Date(solicitud.fecha_solicitud).toLocaleDateString()}</td>
              <td className="px-4 py-3">
                {solicitud.estado === 'pendiente' && setComentarios && (
                  <input className={`${input} mb-2`} placeholder="Comentario" value={comentarios?.[solicitud.id] || ''} onChange={(e) => setComentarios({ ...(comentarios || {}), [solicitud.id]: e.target.value })} />
                )}
                {solicitud.estado === 'pendiente' && onApprove && <button className={primaryButton} onClick={() => onApprove(solicitud.id)}>Aprobar</button>}
                {solicitud.estado === 'pendiente' && onReject && <button className={`${dangerButton} ml-2`} onClick={() => onReject(solicitud.id)}>Rechazar</button>}
                {solicitud.estado === 'pendiente' && onCancel && <button className={dangerButton} onClick={() => onCancel(solicitud.id)}>Cancelar</button>}
              </td>
            </tr>
          ))}
          {solicitudes.length === 0 && <tr><td className="px-4 py-6 text-slate-500" colSpan={8}>Sin solicitudes registradas</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export function DisponibilidadCrudView({ scope }: { scope: 'admin' | 'profesor' }) {
  const user = useMemo(getStoredUser, []);
  const empty = { sala_nombre: 'Sala de Cómputo', dia_semana: 'Lunes', hora_inicio: '08:00', hora_fin: '12:00', estado: 'disponible', reservado_por: user?.id || null, motivo_reserva: '' };
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidad[]>([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const isAdmin = scope === 'admin';

  const fetchData = async () => {
    const dispRes = await fetch('/api/disponibilidad');
    const dispData = await dispRes.json();
    setDisponibilidades(dispData.disponibilidades || []);
  };

  useEffect(() => {
    fetchData().catch(() => setMessage({ type: 'error', text: 'Error al cargar disponibilidad' }));
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const response = await fetch(editingId ? `/api/disponibilidad/${editingId}` : '/api/disponibilidad', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (!response.ok) {
      setMessage({ type: 'error', text: await readError(response) });
      return;
    }

    setForm(empty);
    setEditingId(null);
    setMessage({ type: 'success', text: editingId ? 'Disponibilidad actualizada' : 'Disponibilidad creada' });
    fetchData();
  };

  const edit = (d: Disponibilidad) => {
    setEditingId(d.id);
    setForm({ sala_nombre: d.sala_nombre, dia_semana: d.dia_semana, hora_inicio: d.hora_inicio, hora_fin: d.hora_fin, estado: d.estado, reservado_por: d.reservado_por || user?.id || null, motivo_reserva: d.motivo_reserva || '' });
  };

  const remove = async (id: number) => {
    const response = await fetch(`/api/disponibilidad/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      setMessage({ type: 'error', text: await readError(response) });
      return;
    }
    setMessage({ type: 'success', text: 'Disponibilidad eliminada' });
    fetchData();
  };

  const title = isAdmin ? 'Disponibilidad de sala' : 'Disponibilidad de sala';

  return (
    <PageShell title={title} backHref={isAdmin ? '/admin/dashboard' : '/profesor/dashboard'} subtitle={isAdmin ? 'Gestiona horarios disponibles y reservas de la sala de cómputo.' : 'Consulta los horarios disponibles y separados de la sala de cómputo.'}>
      <Notice message={message} />
      {isAdmin && (
        <form onSubmit={submit} className={`${panel} grid gap-4 p-5 md:grid-cols-5`}>
          <div><label className={label}>Sala</label><input className={input} value={form.sala_nombre} onChange={(e) => setForm({ ...form, sala_nombre: e.target.value })} required /></div>
          <div><label className={label}>Día</label><select className={input} value={form.dia_semana} onChange={(e) => setForm({ ...form, dia_semana: e.target.value })}>{diasSemana.map((dia) => <option key={dia}>{dia}</option>)}</select></div>
          <div><label className={label}>Inicio</label><input className={input} type="time" value={form.hora_inicio} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} required /></div>
          <div><label className={label}>Fin</label><input className={input} type="time" value={form.hora_fin} onChange={(e) => setForm({ ...form, hora_fin: e.target.value })} required /></div>
          <div><label className={label}>Estado</label><select className={input} value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}><option value="disponible">Disponible</option><option value="separado">Separado</option></select></div>
          {form.estado === 'separado' && <div className="md:col-span-2"><label className={label}>Motivo de reserva</label><input className={input} value={form.motivo_reserva} onChange={(e) => setForm({ ...form, motivo_reserva: e.target.value })} /></div>}
          <div className="flex items-end gap-2"><button className={primaryButton} type="submit">{editingId ? 'Guardar' : 'Crear'}</button>{editingId && <button className={secondaryButton} type="button" onClick={() => { setEditingId(null); setForm(empty); }}>Cancelar</button>}</div>
        </form>
      )}
      <div className={`${panel} overflow-x-auto`}>
        <table className="w-full min-w-[850px] text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Sala</th><th>Día</th><th>Horario</th><th>Estado</th><th>Reservado por</th><th>Motivo</th>{isAdmin && <th className="px-4 py-3">Acciones</th>}</tr></thead>
          <tbody className="divide-y divide-slate-200">
            {disponibilidades.map((d) => (
              <tr key={d.id}><td className="px-4 py-3 font-semibold">{d.sala_nombre}</td><td>{d.dia_semana}</td><td>{d.hora_inicio} - {d.hora_fin}</td><td><StatusBadge value={d.estado} /></td><td>{d.reservado_por_nombre ? `${d.reservado_por_nombre} ${d.reservado_por_apellido || ''}` : '-'}</td><td>{d.motivo_reserva || '-'}</td>{isAdmin && <td className="px-4 py-3"><button className={secondaryButton} onClick={() => edit(d)}>Editar</button><button className={`${dangerButton} ml-2`} onClick={() => remove(d.id)}>Eliminar</button></td>}</tr>
            ))}
            {disponibilidades.length === 0 && <tr><td className="px-4 py-6 text-slate-500" colSpan={isAdmin ? 7 : 6}>Sin horarios registrados</td></tr>}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}

export function ProfesorSolicitudesView() {
  const user = useMemo(getStoredUser, []);
  const [items, setItems] = useState<Item[]>([]);
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidad[]>([]);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [form, setForm] = useState({ inventario_id: 0, disponibilidad_id: 0, cantidad_solicitada: 1, motivo: '' });
  const [message, setMessage] = useState<Message>(null);

  const fetchData = async () => {
    const [invRes, dispRes, solRes] = await Promise.all([
      fetch('/api/inventario?estado=disponible'),
      fetch('/api/disponibilidad?estado=disponible'),
      fetch(`/api/solicitudes?profesor_id=${user?.id}`),
    ]);
    const invData = await invRes.json();
    const dispData = await dispRes.json();
    const solData = await solRes.json();
    setItems(invData.items || []);
    setDisponibilidades(dispData.disponibilidades || []);
    setSolicitudes(solData.solicitudes || []);
  };

  useEffect(() => {
    fetchData().catch(() => setMessage({ type: 'error', text: 'Error al cargar solicitudes' }));
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const response = await fetch('/api/solicitudes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, profesor_id: user?.id }),
    });

    if (!response.ok) {
      setMessage({ type: 'error', text: await readError(response) });
      return;
    }

    setForm({ inventario_id: 0, disponibilidad_id: 0, cantidad_solicitada: 1, motivo: '' });
    setMessage({ type: 'success', text: 'Solicitud enviada' });
    fetchData();
  };

  const cancel = async (id: number) => {
    const response = await fetch(`/api/solicitudes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'cancelada' }),
    });

    if (!response.ok) {
      setMessage({ type: 'error', text: await readError(response) });
      return;
    }

    setMessage({ type: 'success', text: 'Solicitud cancelada' });
    fetchData();
  };

  return (
    <PageShell title="Profesor solicitudes" subtitle="Solicita separar la sala de cómputo y, si lo necesitas, artículos de inventario.">
      <Notice message={message} />
      <form onSubmit={submit} className={`${panel} grid gap-4 p-5 md:grid-cols-4`}>
        <div className="md:col-span-2"><label className={label}>Horario de sala</label><select className={input} value={form.disponibilidad_id} onChange={(e) => setForm({ ...form, disponibilidad_id: Number(e.target.value) })} required><option value="0">Seleccionar horario</option>{disponibilidades.map((d) => <option key={d.id} value={d.id}>{d.sala_nombre} - {d.dia_semana} {d.hora_inicio}-{d.hora_fin}</option>)}</select></div>
        <div><label className={label}>Artículo opcional</label><select className={input} value={form.inventario_id} onChange={(e) => setForm({ ...form, inventario_id: Number(e.target.value) })}><option value="0">Sin artículo</option>{items.map((item) => <option key={item.id} value={item.id}>{item.nombre} - disponibles: {item.cantidad_disponible}</option>)}</select></div>
        <div><label className={label}>Cantidad</label><input className={input} type="number" min="1" value={form.cantidad_solicitada} onChange={(e) => setForm({ ...form, cantidad_solicitada: Number(e.target.value) })} disabled={!form.inventario_id} required={!!form.inventario_id} /></div>
        <div><label className={label}>Motivo</label><input className={input} value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} /></div>
        <div><button className={primaryButton} type="submit">Enviar solicitud</button></div>
      </form>
      <SolicitudesTable solicitudes={solicitudes} onCancel={cancel} />
    </PageShell>
  );
}
