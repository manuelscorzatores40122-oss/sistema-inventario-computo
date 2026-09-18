'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FiArrowLeft,
  FiArrowRight,
  FiCheckCircle,
  FiXCircle,
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiSave,
  FiSearch,
  FiFilter,
  FiPackage,
  FiLayers,
  FiAlertTriangle,
  FiUser,
  FiUsers,
  FiMail,
  FiPhone,
  FiClock,
  FiCalendar,
  FiMapPin,
  FiSend,
  FiInbox,
  FiTag,
  FiInfo,
  FiHash,
  FiShield,
  FiUserCheck,
  FiUserX,
} from 'react-icons/fi';

type Usuario = {
  id: number;
  email: string;
  nombre: string;
  apellido: string;
  role: 'admin' | 'profesor';
  telefono: string | null;
  correo_personal: string | null;
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

const panel = 'inventory-panel';
const input = 'inventory-form-input';
const label = 'inventory-form-label';
const primaryButton = 'btn-primary-custom';
const secondaryButton = 'btn-secondary-custom';
const dangerButton = 'btn-danger-custom';

const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

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
    <div className={`rounded-lg border px-4 py-3 text-sm font-semibold shadow-sm transition-all d-flex align-items-center gap-2 ${message.type === 'success'
      ? 'border-green-200 bg-green-50 text-green-800'
      : 'border-red-200 bg-red-50 text-red-800'
      }`}>
      {message.type === 'success' ? <FiCheckCircle size={18} /> : <FiXCircle size={18} />}
      <span>{message.text}</span>
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const Icon =
    value === 'disponible' || value === 'aprobada'
      ? FiCheckCircle
      : value === 'mantenimiento' || value === 'separado'
        ? FiClock
        : value === 'agotado' || value === 'rechazada'
          ? FiXCircle
          : FiInbox;

  return (
    <span className={`status-badge ${value}`}>
      <Icon size={12} />
      {value}
    </span>
  );
}

function StockMeter({ disponible, total }: { disponible: number; total: number }) {
  const percent = total > 0 ? Math.round((disponible / total) * 100) : 0;
  const colorClass = percent > 50 ? 'high' : percent > 15 ? 'medium' : 'low';

  return (
    <div className="flex items-center gap-2">
      <div className={`rounded d-flex align-items-center justify-content-center ${percent > 50 ? 'bg-success bg-opacity-10 text-success' : percent > 15 ? 'bg-warning bg-opacity-10 text-warning' : 'bg-danger bg-opacity-10 text-danger'
        }`} style={{ width: '28px', height: '28px', flexShrink: 0 }}>
        {percent > 50 ? <FiPackage size={14} /> : percent > 15 ? <FiLayers size={14} /> : <FiAlertTriangle size={14} />}
      </div>
      <div className="stock-bar-bg" title={`${percent}% disponible`}>
        <div className={`stock-bar-fill ${colorClass}`} style={{ width: `${percent}%` }}></div>
      </div>
      <span className="text-xs font-semibold text-slate-700">
        {disponible} / {total}
      </span>
    </div>
  );
}

function PageShell({ title, subtitle, backHref, children }: { title: string; subtitle: string; backHref?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">{title}</h1>
            <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
          </div>
          <Link className={`${secondaryButton} d-inline-flex align-items-center gap-2 text-decoration-none`} href={backHref || (title.startsWith('Profesor') || title.startsWith('Mis') ? '/profesor/dashboard' : '/admin/dashboard')}>
            <FiArrowLeft size={15} />
            Volver al panel
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}

export function AdminInventarioView() {
  const empty = { nombre: '', descripcion: '', categoria: '', cantidad_total: 1, cantidad_disponible: 1, ubicacion: '', estado: 'disponible' };
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('');

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

  const categoriasDisponibles = useMemo(() => {
    const list = items.map((i) => i.categoria).filter(Boolean);
    return Array.from(new Set(list));
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        item.nombre.toLowerCase().includes(search.toLowerCase()) ||
        (item.descripcion && item.descripcion.toLowerCase().includes(search.toLowerCase())) ||
        (item.ubicacion && item.ubicacion.toLowerCase().includes(search.toLowerCase()));
      const matchCat = !selectedCategoria || item.categoria === selectedCategoria;
      return matchSearch && matchCat;
    });
  }, [items, search, selectedCategoria]);

  const stats = useMemo(() => {
    const totalTipos = items.length;
    const totalStock = items.reduce((acc, i) => acc + i.cantidad_total, 0);
    const totalDisponible = items.reduce((acc, i) => acc + i.cantidad_disponible, 0);
    const mantenimientos = items.filter((i) => i.estado === 'mantenimiento' || i.estado === 'agotado').length;
    return { totalTipos, totalStock, totalDisponible, mantenimientos };
  }, [items]);

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
    setMessage({ type: 'success', text: editingId ? 'Artículo actualizado con éxito' : 'Artículo creado con éxito' });
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (id: number) => {
    if (!confirm('¿Seguro que deseas eliminar este artículo del inventario?')) return;
    const response = await fetch(`/api/inventario/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      setMessage({ type: 'error', text: await readError(response) });
      return;
    }
    setMessage({ type: 'success', text: 'Artículo eliminado correctamente' });
    fetchItems();
  };

  return (
    <PageShell title="Gestión de Inventario" subtitle="Control de productos, stock en tiempo real, ubicaciones y estado operativo de equipos.">
      <Notice message={message} />

      {/* KPI Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="inventory-panel p-4 flex flex-col justify-between">
          <div className="d-flex align-items-center gap-2 mb-2">
            <div className="rounded d-flex align-items-center justify-content-center bg-slate-100 text-slate-600" style={{ width: '36px', height: '36px', flexShrink: 0 }}>
              <FiTag size={17} />
            </div>
            <span className="text-xs font-bold uppercase text-slate-500">Categorías y Tipos</span>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{stats.totalTipos} <span className="text-xs font-normal text-slate-500">artículos</span></div>
        </div>
        <div className="inventory-panel p-4 flex flex-col justify-between border-l-4 border-l-blue-600">
          <div className="d-flex align-items-center gap-2 mb-2">
            <div className="rounded d-flex align-items-center justify-content-center bg-blue-50 text-blue-600" style={{ width: '36px', height: '36px', flexShrink: 0 }}>
              <FiLayers size={17} />
            </div>
            <span className="text-xs font-bold uppercase text-slate-500">Stock Total</span>
          </div>
          <div className="mt-2 text-2xl font-black text-blue-600">{stats.totalStock} <span className="text-xs font-normal text-slate-500">unidades</span></div>
        </div>
        <div className="inventory-panel p-4 flex flex-col justify-between border-l-4 border-l-green-600">
          <div className="d-flex align-items-center gap-2 mb-2">
            <div className="rounded d-flex align-items-center justify-content-center bg-green-50 text-green-600" style={{ width: '36px', height: '36px', flexShrink: 0 }}>
              <FiPackage size={17} />
            </div>
            <span className="text-xs font-bold uppercase text-slate-500">Disponibles</span>
          </div>
          <div className="mt-2 text-2xl font-black text-green-600">{stats.totalDisponible} <span className="text-xs font-normal text-slate-500 font-semibold">para préstamo</span></div>
        </div>
        <div className="inventory-panel p-4 flex flex-col justify-between border-l-4 border-l-amber-500">
          <div className="d-flex align-items-center gap-2 mb-2">
            <div className="rounded d-flex align-items-center justify-content-center bg-amber-50 text-amber-600" style={{ width: '36px', height: '36px', flexShrink: 0 }}>
              <FiAlertTriangle size={17} />
            </div>
            <span className="text-xs font-bold uppercase text-slate-500">Mantenimiento / Agotados</span>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600">{stats.mantenimientos} <span className="text-xs font-normal text-slate-500 font-semibold">requieren atención</span></div>
        </div>
      </div>

      {/* Add / Edit Form */}
      <form onSubmit={submit} className={`${panel} grid gap-4 p-6 md:grid-cols-4`}>
        <div className="md:col-span-4 border-b border-slate-200 pb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 d-flex align-items-center gap-2">
            <span className="rounded d-flex align-items-center justify-content-center bg-blue-50 text-blue-600" style={{ width: '30px', height: '30px' }}>
              {editingId ? <FiEdit2 size={15} /> : <FiPlus size={15} />}
            </span>
            {editingId ? 'Editar Artículo' : 'Agregar Nuevo Artículo'}
          </h2>
          {editingId && (
            <span className="text-xs bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full font-semibold">
              Modificando ID #{editingId}
            </span>
          )}
        </div>

        <div><label className={label}>Nombre del equipo</label><input className={input} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Equipo" required /></div>
        <div><label className={label}>Categoría</label><input className={input} value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="Categorial al Que Pertenece" required /></div>
        <div><label className={label}>Cantidad Total</label><input className={input} type="number" min="0" value={form.cantidad_total} onChange={(e) => setForm({ ...form, cantidad_total: Number(e.target.value) })} required /></div>
        <div><label className={label}>Cantidad Disponible</label><input className={input} type="number" min="0" value={form.cantidad_disponible} onChange={(e) => setForm({ ...form, cantidad_disponible: Number(e.target.value) })} required /></div>
        <div><label className={label}>Ubicación</label><input className={input} value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} placeholder="Ubicación / Almacén" /></div>
        <div>
          <label className={label}>Estado</label>
          <select className={input} value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
            <option value="disponible">Disponible</option>
            <option value="mantenimiento">Mantenimiento</option>
            <option value="agotado">Agotado</option>
          </select>
        </div>
        <div className="md:col-span-2"><label className={label}>Descripción / Notas</label><input className={input} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Modelo del equipo " /></div>

        <div className="flex gap-2 md:col-span-4 pt-2">
          <button className={`${primaryButton} d-inline-flex align-items-center gap-2`} type="submit">
            {editingId ? <FiSave size={15} /> : <FiPlus size={15} />}
            {editingId ? 'Guardar Cambios' : 'Registrar Artículo'}
          </button>
          {editingId && <button className={secondaryButton} type="button" onClick={() => { setEditingId(null); setForm(empty); }}>Cancelar</button>}
        </div>
      </form>

      {/* Filter and Table Panel */}
      <div className={`${panel} p-4 space-y-4`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">Listado de Equipos</span>
            <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-semibold">{filteredItems.length} registros</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2">
              <FiSearch className="text-slate-400" size={16} style={{ marginLeft: '8px' }} />
              <input
                className={`${input} md:w-64`}
                placeholder="Buscar por nombre o ubicación..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="d-flex align-items-center gap-2">
              <FiFilter className="text-slate-400" size={16} style={{ marginLeft: '8px' }} />
              <select
                className={`${input} md:w-48`}
                value={selectedCategoria}
                onChange={(e) => setSelectedCategoria(e.target.value)}
              >
                <option value="">Todas las categorías</option>
                {categoriasDisponibles.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Artículo / Descripción</th>
                <th>Categoría</th>
                <th>Stock / Nivel</th>
                <th>Ubicación</th>
                <th>Estado</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="text-center py-6 text-slate-500" colSpan={6}>Cargando inventario...</td></tr>
              ) : filteredItems.length === 0 ? (
                <tr><td className="text-center py-6 text-slate-500" colSpan={6}>No se encontraron artículos que coincidan con la búsqueda.</td></tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="font-bold text-slate-900">{item.nombre}</div>
                      {item.descripcion && <div className="text-xs text-slate-500 mt-0.5">{item.descripcion}</div>}
                    </td>
                    <td>
                      <span className="category-chip">{item.categoria}</span>
                    </td>
                    <td>
                      <StockMeter disponible={item.cantidad_disponible} total={item.cantidad_total} />
                    </td>
                    <td className="text-sm text-slate-700 font-medium">
                      <span className="d-inline-flex align-items-center gap-1">
                        <FiMapPin size={13} className="text-slate-400" />
                        {item.ubicacion || 'Sin especificar'}
                      </span>
                    </td>
                    <td>
                      <StatusBadge value={item.estado} />
                    </td>
                    <td className="text-right space-x-2">
                      <button className={`${secondaryButton} d-inline-flex align-items-center gap-1`} onClick={() => edit(item)}><FiEdit2 size={13} />Editar</button>
                      <button className={`${dangerButton} d-inline-flex align-items-center gap-1`} onClick={() => remove(item.id)}><FiTrash2 size={13} />Eliminar</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}

export function AdminProfesoresView() {
  const empty = { email: '', nombre: '', apellido: '', password: '', role: 'profesor', telefono: '', correo_personal: '', activo: true };
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [search, setSearch] = useState('');
  const pageSize = 10;
  const [page, setPage] = useState(1);

  const fetchUsuarios = async () => {
    const response = await fetch('/api/usuarios');
    const data = await response.json();
    setUsuarios(data.usuarios || []);
  };

  useEffect(() => {
    fetchUsuarios().catch(() => setMessage({ type: 'error', text: 'Error al cargar usuarios' }));
  }, []);

  const filteredUsuarios = useMemo(() => {
    return usuarios.filter((u) => {
      const full = `${u.nombre} ${u.apellido} ${u.email} ${u.correo_personal || ''}`.toLowerCase();
      return full.includes(search.toLowerCase());
    });
  }, [usuarios, search]);

  const totalPages = Math.max(1, Math.ceil(filteredUsuarios.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedUsuarios = filteredUsuarios.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rangeStart = filteredUsuarios.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filteredUsuarios.length);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

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
    setMessage({ type: 'success', text: editingId ? 'Usuario actualizado con éxito' : 'Usuario creado con éxito' });
    fetchUsuarios();
  };

  const edit = (usuario: Usuario) => {
    setEditingId(usuario.id);
    setForm({ email: usuario.email, nombre: usuario.nombre, apellido: usuario.apellido, password: '', role: usuario.role, telefono: usuario.telefono || '', correo_personal: usuario.correo_personal || '', activo: usuario.activo });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deactivate = async (id: number) => {
    if (!confirm('¿Seguro que deseas desactivar este usuario?')) return;
    const response = await fetch(`/api/usuarios/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      setMessage({ type: 'error', text: await readError(response) });
      return;
    }
    setMessage({ type: 'success', text: 'Usuario desactivado' });
    fetchUsuarios();
  };

  return (
    <PageShell title="Profesores y Usuarios" subtitle="Gestión de cuentas de docentes y administradores, credenciales y contacto.">
      <Notice message={message} />

      <form onSubmit={submit} className={`${panel} grid gap-4 p-6 md:grid-cols-4`}>
        <div className="md:col-span-4 border-b border-slate-200 pb-2 flex justify-between items-center">
          <h2 className="text-base font-bold text-slate-900 d-flex align-items-center gap-2">
            <span className="rounded d-flex align-items-center justify-content-center bg-purple-50 text-purple-700" style={{ width: '30px', height: '30px' }}>
              {editingId ? <FiEdit2 size={15} /> : <FiUser size={15} />}
            </span>
            {editingId ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
          </h2>
        </div>
        <div><label className={label}>Nombre</label><input className={input} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required /></div>
        <div><label className={label}>Apellido</label><input className={input} value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} required /></div>
        <div><label className={label}>DNI / Usuario</label><input className={input} type="text" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
        <div><label className={label}>Correo Personal Contacto</label><input className={input} type="email" value={form.correo_personal} onChange={(e) => setForm({ ...form, correo_personal: e.target.value })} placeholder="contacto@email.com" /></div>
        <div><label className={label}>Teléfono / WhatsApp</label><input className={input} value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="+51999999999" /></div>
        <div><label className={label}>Contraseña</label><input className={input} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editingId ? 'Opcional (dejar vacío para mantener)' : 'DNI por defecto'} /></div>
        <div><label className={label}>Rol de Acceso</label><select className={input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as any })}><option value="profesor">Profesor</option><option value="admin">Administrador</option></select></div>
        <div className="flex items-end mb-2">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} /> Cuenta Activa
          </label>
        </div>
        <div className="flex items-end gap-2 md:col-span-4 pt-2">
          <button className={`${primaryButton} d-inline-flex align-items-center gap-2`} type="submit">
            {editingId ? <FiSave size={15} /> : <FiUser size={15} />}
            {editingId ? 'Guardar Cambios' : 'Crear Usuario'}
          </button>
          {editingId && <button className={secondaryButton} type="button" onClick={() => { setEditingId(null); setForm(empty); }}>Cancelar</button>}
        </div>
      </form>

      <div className={`${panel} p-4 space-y-4`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-3">
          <h3 className="text-sm font-bold text-slate-900 d-flex align-items-center gap-2">
            <FiUsers size={17} className="text-slate-500" />
            Directorio de Usuarios ({filteredUsuarios.length})
            {filteredUsuarios.length > 0 && (
              <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                {rangeStart}-{rangeEnd}
              </span>
            )}
          </h3>
          <div className="d-flex align-items-center gap-2">
            <FiSearch className="text-slate-400" size={16} style={{ marginLeft: '8px' }} />
            <input className={`${input} md:w-72`} placeholder="Buscar por nombre, DNI o correo..." value={search} onChange={(e) => handleSearch(e.target.value)} />
          </div>
        </div>

        {filteredUsuarios.length === 0 ? (
          <div className="text-center py-8 text-slate-500 font-semibold">
            <FiUsers size={36} className="mx-auto mb-3 text-slate-300" />
            No se encontraron usuarios que coincidan con la búsqueda.
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedUsuarios.map((usuario) => {
              const isAdmin = usuario.role === 'admin';
              const activo = usuario.activo;

              const avatarPalette = ['#2563eb', '#0ea5e9', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#db2777'];
              const avatarColor = avatarPalette[usuario.id % avatarPalette.length];

              return (
                <div key={usuario.id} className={`${panel} p-3 d-flex flex-column gap-3 flex-md-row align-items-md-center`}>
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white flex-shrink-0"
                      style={{ width: '46px', height: '46px', fontSize: '17px', backgroundColor: avatarColor }}
                    >
                      {usuario.nombre.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-truncate">
                        {usuario.nombre} {usuario.apellido}
                      </div>
                      <div className="d-flex align-items-center gap-1 mt-1 flex-wrap">
                        <span className={`category-chip d-inline-flex align-items-center gap-1 ${isAdmin ? 'bg-purple-50 text-purple-700 border-purple-200' : ''}`}>
                          {isAdmin ? <FiShield size={11} /> : <FiUser size={11} />}
                          {isAdmin ? 'Admin' : 'Profesor'}
                        </span>
                        <StatusBadge value={activo ? 'disponible' : 'agotado'} />
                      </div>
                    </div>
                  </div>

                  <div className="d-flex flex-column gap-2 flex-md-row gap-md-3 flex-grow-1">
                    <div className="d-flex align-items-center gap-2 text-slate-600 flex-md-fill" style={{ fontSize: '0.85rem' }}>
                      <span className="rounded d-flex align-items-center justify-content-center bg-slate-100 text-slate-500 flex-shrink-0" style={{ width: '26px', height: '26px' }}>
                        <FiHash size={13} />
                      </span>
                      <span className="text-truncate">DNI: <strong className="text-slate-800">{usuario.email}</strong></span>
                    </div>
                    <div className="d-flex align-items-center gap-2 text-slate-600 flex-md-fill" style={{ fontSize: '0.85rem' }}>
                      <span className="rounded d-flex align-items-center justify-content-center bg-slate-100 text-slate-500 flex-shrink-0" style={{ width: '26px', height: '26px' }}>
                        <FiMail size={13} />
                      </span>
                      <span className="text-truncate">{usuario.correo_personal || 'Sin correo'}</span>
                    </div>
                    <div className="d-flex align-items-center gap-2 text-slate-600 flex-md-fill" style={{ fontSize: '0.85rem' }}>
                      <span className="rounded d-flex align-items-center justify-content-center bg-slate-100 text-slate-500 flex-shrink-0" style={{ width: '26px', height: '26px' }}>
                        <FiPhone size={13} />
                      </span>
                      <span className="text-truncate">{usuario.telefono || 'Sin teléfono'}</span>
                    </div>
                  </div>

                  <div className="d-flex gap-2 flex-shrink-0">
                    <button className={`${secondaryButton} d-inline-flex align-items-center gap-1`} onClick={() => edit(usuario)}>
                      <FiEdit2 size={13} />Editar
                    </button>
                    <button className={`${activo ? dangerButton : primaryButton} d-inline-flex align-items-center gap-1`} onClick={() => deactivate(usuario.id)}>
                      {activo ? <><FiUserX size={13} />Desactivar</> : <><FiUserCheck size={13} />Activar</>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filteredUsuarios.length > pageSize && (
          <div className="d-flex flex-column gap-2 flex-md-row align-items-md-center justify-content-md-between border-top border-slate-200 pt-3">
            <span className="text-xs font-semibold text-slate-500">
              Mostrando {rangeStart}-{rangeEnd} de {filteredUsuarios.length} usuarios
            </span>
            <div className="d-flex align-items-center gap-1">
              <button
                className={`${secondaryButton} d-inline-flex align-items-center gap-1 ${currentPage === 1 ? 'disabled opacity-50' : ''}`}
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                <FiArrowLeft size={13} />Anterior
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => Math.abs(p - currentPage) <= 1 || p === 1 || p === totalPages)
                .reduce<number[]>((acc, p, idx, arr) => {
                  if (idx > 0 && arr[idx - 1] !== p - 1) acc.push(NaN);
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  isNaN(p) ? (
                    <span key={`gap-${idx}`} className="px-1 text-slate-500 small">...</span>
                  ) : (
                    <button
                      key={p}
                      className={`d-inline-flex align-items-center justify-content-center rounded fw-bold ${currentPage === p ? 'text-white bg-primary' : 'text-slate-600 bg-slate-100'}`}
                      style={{ width: '32px', height: '32px', border: 'none', transition: 'background-color 0.2s' }}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  )
                )}

              <button
                className={`${secondaryButton} d-inline-flex align-items-center gap-1 ${currentPage === totalPages ? 'disabled opacity-50' : ''}`}
                disabled={currentPage === totalPages}
                onClick={() => setPage(currentPage + 1)}
              >
                Siguiente<FiArrowRight size={13} />
              </button>
            </div>
          </div>
        )}
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

    setMessage({ type: 'success', text: `Solicitud marcada como ${estado}` });
    fetchSolicitudes();
  };

  return (
    <PageShell title="Control de Solicitudes" subtitle="Revisa, aprueba o rechaza préstamos de inventario y reservas de salas de cómputo.">
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
    <div className={`${panel} p-4 overflow-x-auto`}>
      <table className="inventory-table">
        <thead>
          <tr>
            <th>Profesor</th>
            <th>Artículo Solicitado</th>
            <th>Reserva de Sala</th>
            <th>Cant.</th>
            <th>Motivo</th>
            <th>Estado</th>
            <th>Fecha</th>
            <th className="text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {solicitudes.map((solicitud) => (
            <tr key={solicitud.id}>
              <td className="font-bold text-slate-900">{solicitud.profesor_nombre} {solicitud.apellido}</td>
              <td>{solicitud.item_nombre ? <span className="font-semibold text-slate-800">{solicitud.item_nombre}</span> : <span className="text-slate-400">-</span>}</td>
              <td>{solicitud.sala_nombre ? <span className="text-xs bg-blue-50 text-blue-800 px-2 py-1 rounded font-semibold d-inline-flex align-items-center gap-1"><FiClock size={11} />{solicitud.sala_nombre} ({solicitud.dia_semana} {solicitud.hora_inicio}-{solicitud.hora_fin})</span> : <span className="text-slate-400">-</span>}</td>
              <td className="font-semibold">{solicitud.item_nombre ? solicitud.cantidad_solicitada : '-'}</td>
              <td className="text-xs text-slate-600">{solicitud.motivo || '-'}</td>
              <td><StatusBadge value={solicitud.estado} /></td>
              <td className="text-xs text-slate-500">{new Date(solicitud.fecha_solicitud).toLocaleDateString()}</td>
              <td className="text-right space-y-1">
                {solicitud.estado === 'pendiente' && setComentarios && (
                  <input className={`${input} text-xs py-1 px-2 mb-1 w-full`} placeholder="Añadir nota / observación..." value={comentarios?.[solicitud.id] || ''} onChange={(e) => setComentarios({ ...(comentarios || {}), [solicitud.id]: e.target.value })} />
                )}
                <div className="flex justify-end gap-1">
                  {solicitud.estado === 'pendiente' && onApprove && <button className={`${primaryButton} d-inline-flex align-items-center gap-1`} onClick={() => onApprove(solicitud.id)}><FiCheckCircle size={13} />Aprobar</button>}
                  {solicitud.estado === 'pendiente' && onReject && <button className={`${dangerButton} d-inline-flex align-items-center gap-1`} onClick={() => onReject(solicitud.id)}><FiXCircle size={13} />Rechazar</button>}
                  {solicitud.estado === 'pendiente' && onCancel && <button className={`${dangerButton} d-inline-flex align-items-center gap-1`} onClick={() => onCancel(solicitud.id)}><FiXCircle size={13} />Cancelar</button>}
                </div>
              </td>
            </tr>
          ))}
          {solicitudes.length === 0 && <tr><td className="text-center py-6 text-slate-500" colSpan={8}>Sin solicitudes registradas en la plataforma</td></tr>}
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
    setMessage({ type: 'success', text: editingId ? 'Horario actualizado con éxito' : 'Horario registrado con éxito' });
    fetchData();
  };

  const edit = (d: Disponibilidad) => {
    setEditingId(d.id);
    setForm({ sala_nombre: d.sala_nombre, dia_semana: d.dia_semana, hora_inicio: d.hora_inicio, hora_fin: d.hora_fin, estado: d.estado, reservado_por: d.reservado_por || user?.id || null, motivo_reserva: d.motivo_reserva || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (id: number) => {
    if (!confirm('¿Seguro que deseas eliminar este registro de disponibilidad?')) return;
    const response = await fetch(`/api/disponibilidad/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      setMessage({ type: 'error', text: await readError(response) });
      return;
    }
    setMessage({ type: 'success', text: 'Horario eliminado' });
    fetchData();
  };

  return (
    <PageShell title="Disponibilidad de Sala" backHref={isAdmin ? '/admin/dashboard' : '/profesor/dashboard'} subtitle={isAdmin ? 'Gestiona bloques horarios y reservas de la Sala de Cómputo.' : 'Consulta los bloques de tiempo libres y separados en la Sala de Cómputo.'}>
      <Notice message={message} />
      {isAdmin && (
        <form onSubmit={submit} className={`${panel} grid gap-4 p-6 md:grid-cols-5`}>
          <div className="md:col-span-5 border-b border-slate-200 pb-2">
            <h2 className="text-base font-bold text-slate-900 d-flex align-items-center gap-2">
              <span className="rounded d-flex align-items-center justify-content-center bg-green-50 text-green-700" style={{ width: '30px', height: '30px' }}>
                {editingId ? <FiEdit2 size={15} /> : <FiCalendar size={15} />}
              </span>
              {editingId ? 'Editar Bloque Horario' : 'Crear Nuevo Bloque Horario'}
            </h2>
          </div>
          <div><label className={label}>Nombre de Sala</label><input className={input} value={form.sala_nombre} onChange={(e) => setForm({ ...form, sala_nombre: e.target.value })} required /></div>
          <div><label className={label}>Día de la semana</label><select className={input} value={form.dia_semana} onChange={(e) => setForm({ ...form, dia_semana: e.target.value })}>{diasSemana.map((dia) => <option key={dia}>{dia}</option>)}</select></div>
          <div><label className={label}>Hora Inicio</label><input className={input} type="time" value={form.hora_inicio} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} required /></div>
          <div><label className={label}>Hora Fin</label><input className={input} type="time" value={form.hora_fin} onChange={(e) => setForm({ ...form, hora_fin: e.target.value })} required /></div>
          <div><label className={label}>Estado</label><select className={input} value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}><option value="disponible">Disponible</option><option value="separado">Separado</option></select></div>
          {form.estado === 'separado' && <div className="md:col-span-3"><label className={label}>Motivo de la Reserva</label><input className={input} value={form.motivo_reserva} onChange={(e) => setForm({ ...form, motivo_reserva: e.target.value })} placeholder="Ej. Examen final de programación" /></div>}
          <div className="flex items-end gap-2 md:col-span-5 pt-2"><button className={`${primaryButton} d-inline-flex align-items-center gap-2`} type="submit">
            {editingId ? <FiSave size={15} /> : <FiPlus size={15} />}
            {editingId ? 'Guardar' : 'Registrar Horario'}
          </button>{editingId && <button className={secondaryButton} type="button" onClick={() => { setEditingId(null); setForm(empty); }}>Cancelar</button>}</div>
        </form>
      )}
      <div className={`${panel} p-4 overflow-x-auto`}>
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Sala</th>
              <th>Día</th>
              <th>Horario</th>
              <th>Estado</th>
              <th>Reservado Por</th>
              <th>Motivo</th>
              {isAdmin && <th className="text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {disponibilidades.map((d) => (
              <tr key={d.id}>
                <td className="font-bold text-slate-900">
                  <span className="d-inline-flex align-items-center gap-1">
                    <FiInfo size={13} className="text-slate-400" />
                    {d.sala_nombre}
                  </span>
                </td>
                <td><span className="category-chip d-inline-flex align-items-center gap-1"><FiCalendar size={11} />{d.dia_semana}</span></td>
                <td className="font-mono text-sm">{d.hora_inicio} - {d.hora_fin}</td>
                <td><StatusBadge value={d.estado} /></td>
                <td className="text-slate-700">{d.reservado_por_nombre ? `${d.reservado_por_nombre} ${d.reservado_por_apellido || ''}` : '-'}</td>
                <td className="text-xs text-slate-600">{d.motivo_reserva || '-'}</td>
                {isAdmin && <td className="text-right space-x-2">
                  <button className={`${secondaryButton} d-inline-flex align-items-center gap-1`} onClick={() => edit(d)}><FiEdit2 size={13} />Editar</button>
                  <button className={`${dangerButton} d-inline-flex align-items-center gap-1`} onClick={() => remove(d.id)}><FiTrash2 size={13} />Eliminar</button>
                </td>}
              </tr>
            ))}
            {disponibilidades.length === 0 && <tr><td className="text-center py-6 text-slate-500" colSpan={isAdmin ? 7 : 6}>Sin horarios registrados</td></tr>}
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
    setMessage({ type: 'success', text: 'Solicitud enviada correctamente a administración' });
    fetchData();
  };

  const cancel = async (id: number) => {
    if (!confirm('¿Seguro que deseas cancelar esta solicitud?')) return;
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
    <PageShell title="Mis Solicitudes" subtitle="Solicita reserva de la sala de cómputo y préstamos de equipos de inventario.">
      <Notice message={message} />
      <form onSubmit={submit} className={`${panel} grid gap-4 p-6 md:grid-cols-4`}>
        <div className="md:col-span-4 border-b border-slate-200 pb-2">
          <h2 className="text-base font-bold text-slate-900 d-flex align-items-center gap-2">
            <span className="rounded d-flex align-items-center justify-content-center bg-blue-50 text-blue-700" style={{ width: '30px', height: '30px' }}>
              <FiSend size={15} />
            </span>
            Nueva Solicitud de Reserva / Préstamo
          </h2>
        </div>
        <div className="md:col-span-2">
          <label className={label}>Horario de Sala (Opcional si solo requiere equipo)</label>
          <select className={input} value={form.disponibilidad_id} onChange={(e) => setForm({ ...form, disponibilidad_id: Number(e.target.value) })}>
            <option value="0">Seleccionar horario disponible...</option>
            {disponibilidades.map((d) => (
              <option key={d.id} value={d.id}>{d.sala_nombre} - {d.dia_semana} {d.hora_inicio}-{d.hora_fin}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Artículo de Inventario (Opcional)</label>
          <select className={input} value={form.inventario_id} onChange={(e) => setForm({ ...form, inventario_id: Number(e.target.value) })}>
            <option value="0">Sin artículo</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>{item.nombre} (Disponibles: {item.cantidad_disponible})</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Cantidad</label>
          <input className={input} type="number" min="1" value={form.cantidad_solicitada} onChange={(e) => setForm({ ...form, cantidad_solicitada: Number(e.target.value) })} disabled={!form.inventario_id} required={!!form.inventario_id} />
        </div>
        <div className="md:col-span-3">
          <label className={label}>Motivo / Justificación de la clase</label>
          <input className={input} value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} placeholder="Ej. Clase de Computación 2do Grado" required />
        </div>
        <div className="flex items-end">
          <button className={`${primaryButton} d-inline-flex align-items-center gap-2`} type="submit"><FiSend size={14} />Enviar Solicitud</button>
        </div>
      </form>
      <SolicitudesTable solicitudes={solicitudes} onCancel={cancel} />
    </PageShell>
  );
}
