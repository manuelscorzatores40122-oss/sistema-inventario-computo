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
  FiHash,
  FiShield,
  FiUserCheck,
  FiUserX,
  FiX,
  FiBookOpen,
  FiEye,
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
  dni?: string | null;
  area?: string | null;
  fecha_creacion?: string | null;
};

function useConfirmDialog() {
  const [config, setConfig] = useState<{ isOpen: boolean; message: string; onConfirm: () => void; isDanger?: boolean } | null>(null);

  const confirm = (message: string, onConfirm: () => void, isDanger = true) => {
    setConfig({ isOpen: true, message, onConfirm, isDanger });
  };

  const close = () => setConfig(null);

  const ConfirmComponent = () => {
    if (!config || !config.isOpen) return null;
    return (
      <div className="position-fixed w-100 h-100 top-0 start-0 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 9999, backdropFilter: 'blur(2px)' }}>
        <div className="bg-white rounded-4 shadow-lg overflow-hidden animate__animated animate__fadeInUp animate__faster" style={{ maxWidth: '400px', width: '90%' }}>
          <div className="p-4 border-bottom d-flex align-items-center gap-3">
            <div className={`p-2 rounded-circle ${config.isDanger ? 'bg-danger bg-opacity-10 text-danger' : 'bg-primary bg-opacity-10 text-primary'}`}>
              <FiAlertTriangle size={22} />
            </div>
            <h3 className="h6 fw-bold text-dark mb-0">Confirmación</h3>
          </div>
          <div className="p-4 text-secondary small" style={{ fontSize: '0.9rem' }}>
            {config.message}
          </div>
          <div className="p-3 bg-light border-top d-flex justify-content-end gap-2">
            <button onClick={close} className="btn btn-light border fw-semibold text-secondary btn-sm px-3">
              Cancelar
            </button>
            <button onClick={() => { config.onConfirm(); close(); }} className={`btn ${config.isDanger ? 'btn-danger' : 'btn-primary'} fw-bold btn-sm px-4`}>
              Confirmar
            </button>
          </div>
        </div>
      </div>
    );
  };

  return { confirmDialog: confirm, ConfirmComponent };
}

// ... rest of the types

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
  profesor_nombre: string;
  apellido: string;
  item_nombre: string | null;
  cantidad_solicitada: number;
  motivo: string | null;
  estado: string;
  comentarios: string | null;
  fecha_solicitud: string;
};

type Message = { type: 'success' | 'error'; text: string } | null;

type Prestamo = {
  id: number;
  inventario_id: number;
  profesor_id: number;
  cantidad: number;
  detalle: string | null;
  estado: string;
  item_nombre: string | null;
  categoria: string | null;
  profesor_nombre: string | null;
  apellido: string | null;
  fecha_prestamo: string;
  fecha_devolucion: string | null;
};

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
    value === 'disponible' || value === 'aprobada' || value === 'devuelto'
      ? FiCheckCircle
      : value === 'mantenimiento' || value === 'separado' || value === 'prestado'
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
  const [customCategorias, setCustomCategorias] = useState<string[]>([]);

  const { confirmDialog, ConfirmComponent } = useConfirmDialog();

  const fetchItems = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const response = await fetch('/api/inventario?estado=todos');
      const data = await response.json();
      setItems(data.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems(true).catch(() => setMessage({ type: 'error', text: 'Error al cargar inventario' }));
  }, []);

  const categoriasDisponibles = useMemo(() => {
    const list = items.map((i) => i.categoria).filter(Boolean);
    return Array.from(new Set([...list, ...customCategorias])).sort();
  }, [items, customCategorias]);

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

    const data = await response.json();
    const savedItem = data.item as Item | undefined;

    setForm(empty);
    setEditingId(null);
    setMessage({ type: 'success', text: editingId ? 'Artículo actualizado con éxito' : 'Artículo creado con éxito' });

    if (savedItem) {
      setItems((prev) =>
        editingId
          ? prev.map((i) => (i.id === savedItem.id ? savedItem : i))
          : [savedItem, ...prev]
      );
    } else {
      fetchItems();
    }
  };

  const edit = (item: Item) => {
    setEditingId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    confirmDialog('¿Seguro que deseas eliminar este artículo del inventario?', async () => {
      const response = await fetch(`/api/inventario/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        setMessage({ type: 'error', text: await readError(response) });
        return;
      }
      setMessage({ type: 'success', text: 'Artículo eliminado correctamente' });
      setItems((prev) => prev.filter((i) => i.id !== id));
    });
  };

  return (
    <PageShell title="Gestión de Inventario" subtitle="Control de productos, stock en tiempo real, ubicaciones y estado operativo de equipos.">
      <Notice message={message} />
      <ConfirmComponent />

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
        <div>
          <label className={label}>Categoría</label>
          <div className="d-flex gap-2">
            <select
              className={input}
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              required
            >
              <option value="" disabled>Seleccione una categoría...</option>
              {categoriasDisponibles.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-outline-primary d-flex align-items-center justify-content-center"
              style={{ width: '42px', flexShrink: 0, padding: 0 }}
              onClick={() => {
                const nueva = window.prompt('Ingrese el nombre de la nueva categoría:');
                if (nueva && nueva.trim()) {
                  const categoria = nueva.trim();
                  setCustomCategorias((prev) => Array.from(new Set([...prev, categoria])));
                  setForm({ ...form, categoria });
                }
              }}
              title="Crear nueva categoría"
            >
              <FiPlus size={18} />
            </button>
          </div>
        </div>
        <div>
          <label className={label}>Cantidad Total</label>
          <input className={input} type="number" min="0" value={form.cantidad_total} 
            onChange={(e) => {
              const newTotal = Number(e.target.value);
              const diff = newTotal - form.cantidad_total;
              setForm({ 
                ...form, 
                cantidad_total: newTotal,
                cantidad_disponible: Math.max(0, form.cantidad_disponible + diff)
              });
            }} required />
        </div>
        <div>
          <label className={label}>Cantidad Disponible</label>
          <input className={input} type="number" min="0" value={form.cantidad_disponible} 
            onChange={(e) => {
              const newDisp = Number(e.target.value);
              setForm({
                ...form,
                cantidad_disponible: Math.min(newDisp, form.cantidad_total)
              });
            }} required />
        </div>
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
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const pageSize = 10;
  const [page, setPage] = useState(1);
  
  const { confirmDialog, ConfirmComponent } = useConfirmDialog();

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setForm({ email: usuario.email, nombre: usuario.nombre, apellido: usuario.apellido, password: '', role: usuario.role, telefono: usuario.telefono || '', correo_personal: usuario.correo_personal || '', activo: usuario.activo });
  };

  const deactivate = async (id: number) => {
    confirmDialog('¿Seguro que deseas desactivar o activar este usuario?', async () => {
      const response = await fetch(`/api/usuarios/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        setMessage({ type: 'error', text: await readError(response) });
        return;
      }
      setMessage({ type: 'success', text: 'Estado del usuario actualizado' });
      fetchUsuarios();
    });
  };

  return (
    <PageShell title="Gestión de Profesores" subtitle="Administra las cuentas y credenciales del personal docente.">
      <Notice message={message} />
      <ConfirmComponent />

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
                <div
                  key={usuario.id}
                  className={`${panel} p-3 d-flex flex-column gap-3 flex-md-row align-items-md-center`}
                  style={{ cursor: 'pointer', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '';
                    e.currentTarget.style.boxShadow = '';
                  }}
                  onClick={() => setSelectedUser(usuario)}
                >
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

      {selectedUser && (
        <>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog">
            <div className="modal-dialog" role="document">
              <div className="modal-content border-0 shadow-lg">
                <div className="modal-header border-b border-slate-200 p-4">
                  <h5 className="modal-title font-bold text-slate-900 d-flex align-items-center gap-2">
                    <span className="rounded d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary" style={{ width: '30px', height: '30px' }}>
                      <FiEye size={15} />
                    </span>
                    Información del Usuario
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setSelectedUser(null)} />
                </div>

                <div className="modal-body p-4">
                  <div className="d-flex align-items-center gap-3 mb-4">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white flex-shrink-0"
                      style={{
                        width: '56px',
                        height: '56px',
                        fontSize: '20px',
                        backgroundColor: ['#2563eb', '#0ea5e9', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#db2777'][selectedUser.id % 8],
                      }}
                    >
                      {selectedUser.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900" style={{ fontSize: '1.05rem' }}>
                        {selectedUser.nombre} {selectedUser.apellido}
                      </div>
                      <div className="d-flex align-items-center gap-1 mt-1 flex-wrap">
                        <span className={`category-chip d-inline-flex align-items-center gap-1 ${selectedUser.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : ''}`}>
                          {selectedUser.role === 'admin' ? <FiShield size={11} /> : <FiUser size={11} />}
                          {selectedUser.role === 'admin' ? 'Administrador' : 'Profesor'}
                        </span>
                        <StatusBadge value={selectedUser.activo ? 'disponible' : 'agotado'} />
                      </div>
                    </div>
                  </div>

                  <div className="d-flex flex-column gap-2">
                    <div className="d-flex align-items-center gap-2 text-slate-600" style={{ fontSize: '0.85rem' }}>
                      <span className="rounded d-flex align-items-center justify-content-center bg-slate-100 text-slate-500 flex-shrink-0" style={{ width: '28px', height: '28px' }}>
                        <FiHash size={13} />
                      </span>
                      <span><span className="font-semibold text-slate-500">DNI:</span> <strong className="text-slate-800">{selectedUser.email}</strong></span>
                    </div>
                    <div className="d-flex align-items-center gap-2 text-slate-600" style={{ fontSize: '0.85rem' }}>
                      <span className="rounded d-flex align-items-center justify-content-center bg-slate-100 text-slate-500 flex-shrink-0" style={{ width: '28px', height: '28px' }}>
                        <FiBookOpen size={13} />
                      </span>
                      <span><span className="font-semibold text-slate-500">Área / Cargo:</span> <strong className="text-slate-800">{selectedUser.area || 'Sin asignar'}</strong></span>
                    </div>
                    <div className="d-flex align-items-center gap-2 text-slate-600" style={{ fontSize: '0.85rem' }}>
                      <span className="rounded d-flex align-items-center justify-content-center bg-slate-100 text-slate-500 flex-shrink-0" style={{ width: '28px', height: '28px' }}>
                        <FiMail size={13} />
                      </span>
                      <span><span className="font-semibold text-slate-500">Correo institucional:</span> <strong className="text-slate-800">{selectedUser.email}@colegio.edu.pe</strong></span>
                    </div>
                    <div className="d-flex align-items-center gap-2 text-slate-600" style={{ fontSize: '0.85rem' }}>
                      <span className="rounded d-flex align-items-center justify-content-center bg-slate-100 text-slate-500 flex-shrink-0" style={{ width: '28px', height: '28px' }}>
                        <FiUser size={13} />
                      </span>
                      <span><span className="font-semibold text-slate-500">Correo de contacto:</span> <strong className="text-slate-800">{selectedUser.correo_personal || 'Sin correo'}</strong></span>
                    </div>
                    <div className="d-flex align-items-center gap-2 text-slate-600" style={{ fontSize: '0.85rem' }}>
                      <span className="rounded d-flex align-items-center justify-content-center bg-slate-100 text-slate-500 flex-shrink-0" style={{ width: '28px', height: '28px' }}>
                        <FiPhone size={13} />
                      </span>
                      <span><span className="font-semibold text-slate-500">Teléfono / WhatsApp:</span> <strong className="text-slate-800">{selectedUser.telefono || 'Sin teléfono'}</strong></span>
                    </div>
                    <div className="d-flex align-items-center gap-2 text-slate-600" style={{ fontSize: '0.85rem' }}>
                      <span className="rounded d-flex align-items-center justify-content-center bg-slate-100 text-slate-500 flex-shrink-0" style={{ width: '28px', height: '28px' }}>
                        <FiCalendar size={13} />
                      </span>
                      <span>
                        <span className="font-semibold text-slate-500">Registrado el:</span>{' '}
                        <strong className="text-slate-800">
                          {selectedUser.fecha_creacion ? new Date(selectedUser.fecha_creacion).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Fecha no disponible'}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-t border-slate-200 p-3 flex justify-end gap-2">
                  <button
                    className={`${secondaryButton} d-inline-flex align-items-center gap-1`}
                    onClick={() => {
                      setSelectedUser(null);
                      edit(selectedUser);
                    }}
                  >
                    <FiEdit2 size={13} />Editar
                  </button>
                  <button
                    className={`${selectedUser.activo ? dangerButton : primaryButton} d-inline-flex align-items-center gap-1`}
                    onClick={() => {
                      setSelectedUser(null);
                      deactivate(selectedUser.id);
                    }}
                  >
                    {selectedUser.activo ? <><FiUserX size={13} />Desactivar</> : <><FiUserCheck size={13} />Activar</>}
                  </button>
                  <button className={secondaryButton} onClick={() => setSelectedUser(null)}>
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      )}
    </PageShell>
  );
}

export function AdminSolicitudesView() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [comentarios, setComentarios] = useState<Record<number, string>>({});
  const [message, setMessage] = useState<Message>(null);
  const [user, setUser] = useState<Usuario | null>(null);
  useEffect(() => { setUser(getStoredUser()); }, []);

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
    await fetchSolicitudes();

    if (estado === 'aprobada') {
      const sol = solicitudes.find(s => s.id === id);
      if (sol && (sol.item_nombre?.includes('Aula de Cómputo') || (sol as any).disponibilidad_id)) {
        setTimeout(() => {
          window.location.href = '/admin/horario';
        }, 1500);
      }
    }
  };

  return (
    <PageShell title="Control de Solicitudes" subtitle="Revisa, aprueba o rechaza los préstamos de artículos de inventario solicitados por los profesores.">
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
          {solicitudes.length === 0 && <tr><td className="text-center py-6 text-slate-500" colSpan={7}>Sin solicitudes registradas en la plataforma</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export function ProfesorSolicitudesView() {
  const [user, setUser] = useState<Usuario | null>(null);
  useEffect(() => { setUser(getStoredUser()); }, []);
  const [items, setItems] = useState<Item[]>([]);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [form, setForm] = useState({ inventario_id: 0, cantidad_solicitada: 1, motivo: '' });
  const [message, setMessage] = useState<Message>(null);
  const [activeTab, setActiveTab] = useState<'todas' | 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada'>('todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [solicitudType, setSolicitudType] = useState<'equipo' | 'aula'>('equipo');
  const [aulaForm, setAulaForm] = useState({ fecha_reserva: new Date().toISOString().split('T')[0], hora_inicio: '08:00', hora_fin: '10:00' });

  const { confirmDialog, ConfirmComponent } = useConfirmDialog();

  const fetchData = async () => {
    const invRes = await fetch('/api/inventario');
    const invData = await invRes.json();
    setItems(invData.items || []);

    if (user?.id) {
      const solRes = await fetch(`/api/solicitudes?profesor_id=${user.id}`);
      const solData = await solRes.json();
      setSolicitudes(solData.solicitudes || []);
    }
  };

  useEffect(() => {
    if (user?.id) fetchData();
  }, [user]);

  const selectedItemData = useMemo(() => {
    return items.find((i) => i.id === form.inventario_id) || null;
  }, [items, form.inventario_id]);

  const maxStock = selectedItemData ? selectedItemData.cantidad_disponible : 1;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (solicitudType === 'equipo' && !form.inventario_id) {
      setMessage({ type: 'error', text: 'Selecciona un artículo' });
      return;
    }

    setSubmitting(true);
    
    const bodyPayload: any = {
      profesor_id: user?.id,
      motivo: form.motivo.trim() || 'Uso docente en clase',
    };

    if (solicitudType === 'equipo') {
      bodyPayload.inventario_id = form.inventario_id;
      bodyPayload.cantidad_solicitada = form.cantidad_solicitada;
      bodyPayload.tipo_solicitud = 'equipo';
    } else {
      bodyPayload.tipo_solicitud = 'aula';
      bodyPayload.fecha_reserva = aulaForm.fecha_reserva;
      bodyPayload.hora_inicio = aulaForm.hora_inicio;
      bodyPayload.hora_fin = aulaForm.hora_fin;
    }

    const response = await fetch('/api/solicitudes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload),
    });
    setSubmitting(false);

    if (!response.ok) {
      setMessage({ type: 'error', text: await readError(response) });
      return;
    }

    setMessage({ type: 'success', text: 'Solicitud enviada con éxito' });
    setForm({ inventario_id: 0, cantidad_solicitada: 1, motivo: '' });
    setShowNewForm(false);
    fetchData();
  };

  const handleCancel = async (id: number) => {
    confirmDialog('¿Estás seguro de que deseas cancelar esta solicitud?', async () => {
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
    });
  };

  // Filtered requests
  const filteredSolicitudes = useMemo(() => {
    return solicitudes.filter((s) => {
      const matchTab = activeTab === 'todas' ? true : s.estado === activeTab;
      const matchSearch =
        !searchQuery.trim() ||
        (s.item_nombre && s.item_nombre.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.motivo && s.motivo.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchTab && matchSearch;
    });
  }, [solicitudes, activeTab, searchQuery]);

  const counts = useMemo(() => {
    return {
      todas: solicitudes.length,
      pendiente: solicitudes.filter((s) => s.estado === 'pendiente').length,
      aprobada: solicitudes.filter((s) => s.estado === 'aprobada').length,
      rechazada: solicitudes.filter((s) => s.estado === 'rechazada').length,
      cancelada: solicitudes.filter((s) => s.estado === 'cancelada').length,
    };
  }, [solicitudes]);

  const motivosPredefinidos = [
    'Clase de Cómputo',
    'Examen Escolar',
    'Presentación',
    'Taller Práctico',
  ];

  return (
    <PageShell title="Mis Solicitudes" subtitle="Revisa el estado de tus solicitudes de material o genera una nueva.">
      <Notice message={message} />

      {/* TOP ACTIONS & NEW REQUEST TOGGLE */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            onClick={() => setShowNewForm(!showNewForm)}
            className={`${primaryButton} d-inline-flex align-items-center gap-2`}
          >
            {showNewForm ? <FiX size={16} /> : <FiPlus size={16} />}
            {showNewForm ? 'Ocultar Formulario' : 'Nueva Solicitud'}
          </button>
        </div>

        {/* SEARCH BAR */}
        <div className="position-relative" style={{ minWidth: '240px' }}>
          <FiSearch className="position-absolute text-secondary" size={15} style={{ left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="inventory-form-input ps-5"
            placeholder="Buscar por artículo o motivo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* NEW REQUEST FORM (COLLAPSIBLE / ACCORDION) */}
      {showNewForm && (
        <form onSubmit={handleSubmit} className={`${panel} p-3 p-md-4 mb-4 border-2 border-primary`}>
          <div className="border-b border-slate-200 pb-2 mb-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <h2 className="text-base font-bold text-slate-900 d-flex align-items-center gap-2 mb-0">
              <span className="rounded-3 d-flex align-items-center justify-content-center bg-blue-50 text-blue-700" style={{ width: '32px', height: '32px' }}>
                <FiSend size={16} />
              </span>
              Registrar Nueva Solicitud
            </h2>
            <div className="btn-group" role="group">
              <button type="button" className={`btn btn-sm ${solicitudType === 'equipo' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setSolicitudType('equipo')}>
                Solicitar Equipo
              </button>
              <button type="button" className={`btn btn-sm ${solicitudType === 'aula' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setSolicitudType('aula')}>
                Solicitar Aula
              </button>
            </div>
          </div>

          <div className="row g-3">
            {solicitudType === 'equipo' ? (
              <>
                <div className="col-12 col-md-6">
                  <label className={label}>Artículo de Inventario</label>
                  <select
                    className={`${input} fw-semibold`}
                    value={form.inventario_id}
                    onChange={(e) => {
                      setForm({ ...form, inventario_id: Number(e.target.value), cantidad_solicitada: 1 });
                    }}
                    required
                  >
                    <option value="0">-- Seleccionar artículo --</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id} disabled={item.cantidad_disponible <= 0}>
                        {item.nombre} ({item.cantidad_disponible} disponibles) {item.categoria ? `• ${item.categoria}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-12 col-md-6">
                  <label className={label}>Cantidad a solicitar</label>
                  <div className="d-flex align-items-center gap-3">
                    <div className="mobile-stepper">
                      <button
                        type="button"
                        className="mobile-stepper-btn"
                        onClick={() => setForm((prev) => ({ ...prev, cantidad_solicitada: Math.max(1, prev.cantidad_solicitada - 1) }))}
                        disabled={form.cantidad_solicitada <= 1 || !form.inventario_id}
                      >
                        -
                      </button>
                      <span className="mobile-stepper-val">{form.cantidad_solicitada}</span>
                      <button
                        type="button"
                        className="mobile-stepper-btn"
                        onClick={() => setForm((prev) => ({ ...prev, cantidad_solicitada: Math.min(maxStock, prev.cantidad_solicitada + 1) }))}
                        disabled={form.cantidad_solicitada >= maxStock || !form.inventario_id}
                      >
                        +
                      </button>
                    </div>
                    <span className="text-secondary small">
                      {selectedItemData ? `(De ${selectedItemData.cantidad_disponible} en stock)` : 'Selecciona un artículo primero'}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="col-12 col-md-4">
                  <label className={label}>Fecha de reserva</label>
                  <input
                    type="date"
                    className={input}
                    value={aulaForm.fecha_reserva}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setAulaForm({ ...aulaForm, fecha_reserva: e.target.value })}
                    required
                  />
                </div>
                <div className="col-6 col-md-4">
                  <label className={label}>Hora inicio</label>
                  <input
                    type="time"
                    className={input}
                    value={aulaForm.hora_inicio}
                    onChange={(e) => setAulaForm({ ...aulaForm, hora_inicio: e.target.value })}
                  />
                </div>
                <div className="col-6 col-md-4">
                  <label className={label}>Hora fin</label>
                  <input
                    type="time"
                    className={input}
                    value={aulaForm.hora_fin}
                    onChange={(e) => setAulaForm({ ...aulaForm, hora_fin: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="col-12">
              <label className={label}>Motivo o justificación de la clase</label>
              <div className="d-flex flex-wrap gap-1 mb-2">
                {motivosPredefinidos.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setForm({ ...form, motivo: preset })}
                    className={`reason-preset-chip ${form.motivo === preset ? 'active' : ''}`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <input
                className={input}
                value={form.motivo}
                onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                placeholder="Ej. Clase de Computación 2do Grado o Examen Final"
                required
              />
            </div>

            <div className="col-12 d-flex gap-2 pt-2">
              <button
                className={`${primaryButton} d-inline-flex align-items-center gap-2`}
                type="submit"
                disabled={submitting || (solicitudType === 'equipo' && !form.inventario_id)}
              >
                <FiSend size={15} />
                {submitting ? 'Enviando...' : 'Enviar Solicitud'}
              </button>
              <button
                type="button"
                className={secondaryButton}
                onClick={() => setShowNewForm(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </form>
      )}

      {/* MOBILE SEGMENT / FILTER TABS */}
      <div className="mobile-segment-control mb-3">
        <button
          type="button"
          onClick={() => setActiveTab('todas')}
          className={`mobile-segment-tab ${activeTab === 'todas' ? 'active' : ''}`}
        >
          Todas ({counts.todas})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('pendiente')}
          className={`mobile-segment-tab ${activeTab === 'pendiente' ? 'active' : ''}`}
        >
          ⏳ Pendientes ({counts.pendiente})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('aprobada')}
          className={`mobile-segment-tab ${activeTab === 'aprobada' ? 'active' : ''}`}
        >
          ✅ Aprobadas ({counts.aprobada})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('rechazada')}
          className={`mobile-segment-tab ${activeTab === 'rechazada' ? 'active' : ''}`}
        >
          ❌ Rechazadas ({counts.rechazada})
        </button>
      </div>

      {/* MOBILE VIEW: NATIVE CARDS (VISIBLE ON PHONES) */}
      <div className="d-block d-md-none">
        {filteredSolicitudes.length === 0 ? (
          <div className={`${panel} p-4 text-center text-secondary`}>
            <FiInbox className="text-slate-300 mb-2" size={36} />
            <p className="small mb-0">No se encontraron solicitudes para este filtro.</p>
          </div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {filteredSolicitudes.map((sol) => (
              <div
                key={sol.id}
                className={`mobile-solicitud-card status-${sol.estado}`}
              >
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <h3 className="h6 fw-bold text-dark mb-0">
                      {sol.item_nombre || 'Artículo sin especificar'}
                    </h3>
                    <div className="small text-secondary" style={{ fontSize: '0.72rem' }}>
                      <FiCalendar className="me-1" size={11} />
                      {new Date(sol.fecha_solicitud).toLocaleDateString('es-PE', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <span className={`status-badge ${sol.estado}`}>
                    {sol.estado}
                  </span>
                </div>

                <div className="bg-slate-50 rounded-3 p-2 mb-2">
                  <div className="small text-dark mb-1">
                    <span className="text-secondary fw-semibold">Cantidad: </span>
                    <strong className="badge bg-primary text-white rounded-pill px-2">
                      {sol.cantidad_solicitada} unidad{sol.cantidad_solicitada > 1 ? 'es' : ''}
                    </strong>
                  </div>
                  <div className="small text-slate-700">
                    <span className="text-secondary fw-semibold">Motivo: </span>
                    {sol.motivo || 'Sin motivo especificado'}
                  </div>
                  {sol.comentarios && (
                    <div className="small text-primary mt-1 border-top pt-1" style={{ fontSize: '0.75rem' }}>
                      <strong>Nota de Administración: </strong>
                      {sol.comentarios}
                    </div>
                  )}
                </div>

                {sol.estado === 'pendiente' && (
                  <div className="d-flex justify-content-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleCancel(sol.id)}
                      className="btn btn-outline-danger btn-sm py-1 px-3 fw-semibold d-inline-flex align-items-center gap-1"
                      style={{ fontSize: '0.78rem' }}
                    >
                      <FiXCircle size={13} />
                      Cancelar Solicitud
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DESKTOP VIEW: TABLE (VISIBLE ON TABLETS & DESKTOPS) */}
      <div className="d-none d-md-block">
        <SolicitudesTable solicitudes={filteredSolicitudes} onCancel={handleCancel} />
      </div>
    </PageShell>
  );
}

export function AdminPrestamosView() {
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [profesores, setProfesores] = useState<{ id: number; nombre: string; apellido: string }[]>([]);
  const [tab, setTab] = useState<'prestado' | 'devuelto'>('prestado');
  const [form, setForm] = useState({ inventario_id: 0, profesor_id: 0, cantidad: 1, detalle: '' });
  const [message, setMessage] = useState<Message>(null);
  const [saving, setSaving] = useState(false);
  const [procesando, setProcesando] = useState<number | null>(null);

  const { confirmDialog, ConfirmComponent } = useConfirmDialog();

  const fetchData = async () => {
    const [preRes, invRes, profRes] = await Promise.all([
      fetch('/api/prestamos'),
      fetch('/api/inventario?estado=disponible'),
      fetch('/api/usuarios?role=profesor&activo=true'),
    ]);
    if (preRes.ok) {
      const data = await preRes.json();
      setPrestamos(data.prestamos || []);
    }
    if (invRes.ok) {
      const data = await invRes.json();
      setItems(data.items || []);
    }
    if (profRes.ok) {
      const data = await profRes.json();
      setProfesores(data.usuarios || []);
    }
  };

  useEffect(() => {
    fetchData().catch(() => setMessage({ type: 'error', text: 'Error al cargar préstamos' }));
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.inventario_id || !form.profesor_id) {
      setMessage({ type: 'error', text: 'Selecciona el equipo y el profesor' });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/prestamos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => null);
      if (response.ok) {
        setMessage({ type: 'success', text: data?.message || 'Préstamo registrado' });
        if (data?.prestamo) {
          const itemOrigen = items.find((i) => i.id === data.prestamo.inventario_id);
          const profe = profesores.find((p) => p.id === data.prestamo.profesor_id);
          setPrestamos((prev) => [
            {
              ...data.prestamo,
              item_nombre: itemOrigen?.nombre || null,
              categoria: itemOrigen?.categoria || null,
              profesor_nombre: profe?.nombre || null,
              apellido: profe?.apellido || null,
            },
            ...prev,
          ]);
          setItems((prev) =>
            prev.map((i) =>
              i.id === data.prestamo.inventario_id
                ? { ...i, cantidad_disponible: i.cantidad_disponible - data.prestamo.cantidad }
                : i
            )
          );
        }
        setForm({ inventario_id: 0, profesor_id: 0, cantidad: 1, detalle: '' });
      } else {
        setMessage({ type: 'error', text: data?.error || 'No se pudo registrar el préstamo' });
      }
    } catch (error) {
      console.error('Error al registrar préstamo:', error);
      setMessage({ type: 'error', text: 'Error al registrar el préstamo' });
    } finally {
      setSaving(false);
    }
  };

  const entregar = async (id: number) => {
    confirmDialog('¿Confirmas que el/la profesor(a) devolvió el equipo?', async () => {
      setProcesando(id);
      try {
        const response = await fetch(`/api/prestamos/${id}`, { method: 'PUT' });
        if (response.ok) {
          setMessage({ type: 'success', text: 'Equipo entregado, vuelve a estar disponible en el inventario' });
          const prestamo = prestamos.find((p) => p.id === id);
          setPrestamos((prev) =>
            prev.map((p) =>
              p.id === id
                ? { ...p, estado: 'devuelto', fecha_devolucion: new Date().toISOString() }
                : p
            )
          );
          if (prestamo) {
            setItems((prev) =>
              prev.map((i) =>
                i.id === prestamo.inventario_id
                  ? { ...i, cantidad_disponible: i.cantidad_disponible + prestamo.cantidad }
                  : i
              )
            );
          }
        } else {
          const data = await response.json().catch(() => null);
          setMessage({ type: 'error', text: data?.error || 'No se pudo marcar como entregado' });
        }
      } catch (error) {
        console.error('Error al marcar prestamo como entregado:', error);
        setMessage({ type: 'error', text: 'Error al marcar como entregado' });
      } finally {
        setProcesando(null);
      }
    });
  };

  const eliminar = async (id: number) => {
    confirmDialog('¿Seguro que deseas eliminar este registro de devolución?', async () => {
      const response = await fetch(`/api/prestamos/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Registro eliminado' });
        setPrestamos((prev) => prev.filter((p) => p.id !== id));
      } else {
        const data = await response.json().catch(() => null);
        setMessage({ type: 'error', text: data?.error || 'No se pudo eliminar el registro' });
      }
    }, true);
  };

  const activos = prestamos.filter((p) => p.estado === 'prestado');
  const devueltos = prestamos.filter((p) => p.estado === 'devuelto');
  const list = tab === 'prestado' ? activos : devueltos;
  const itemsDisponibles = items.filter((i) => i.cantidad_disponible > 0);

  return (
    <PageShell title="Préstamos de Equipos" subtitle="Registra qué equipo se presta a cada profesor; al devolverlo queda Entregado y vuelve al inventario.">
      <Notice message={message} />
      <ConfirmComponent />

      <form onSubmit={submit} className={`${panel} grid gap-4 p-6 md:grid-cols-4`}>
        <div className="md:col-span-4 border-b border-slate-200 pb-2">
          <h2 className="text-base font-bold text-slate-900 d-flex align-items-center gap-2">
            <span className="rounded d-flex align-items-center justify-content-center bg-blue-50 text-blue-700" style={{ width: '30px', height: '30px' }}>
              <FiPackage size={15} />
            </span>
            Registrar Préstamo a Profesor
          </h2>
        </div>
        <div>
          <label className={label}>Equipo / Artículo</label>
          <select className={input} value={form.inventario_id} onChange={(e) => setForm({ ...form, inventario_id: Number(e.target.value) })}>
            <option value="0">Seleccionar equipo...</option>
            {itemsDisponibles.map((item) => (
              <option key={item.id} value={item.id}>{item.nombre} (Disponibles: {item.cantidad_disponible})</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Profesor que recibe</label>
          <select className={input} value={form.profesor_id} onChange={(e) => setForm({ ...form, profesor_id: Number(e.target.value) })}>
            <option value="0">Seleccionar profesor...</option>
            {profesores.map((profesor) => (
              <option key={profesor.id} value={profesor.id}>{profesor.apellido}, {profesor.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Cantidad</label>
          <input className={input} type="number" min="1" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: Number(e.target.value) })} required />
        </div>
        <div className="flex items-end">
          <button className={`${primaryButton} d-inline-flex align-items-center gap-2`} type="submit" disabled={saving}>
            <FiCheckCircle size={15} />
            {saving ? 'Registrando...' : 'Prestar Equipo'}
          </button>
        </div>
        <div className="md:col-span-4">
          <label className={label}>Detalle de la unidad (opcional)</label>
          <input className={input} value={form.detalle} onChange={(e) => setForm({ ...form, detalle: e.target.value })} placeholder="Ej. Laptop P2, Control N° 3, Monitor del aula A..." />
        </div>
      </form>

      <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
        <div className="d-flex gap-2">
          <button
            className={tab === 'prestado' ? `${primaryButton}` : `${secondaryButton}`}
            onClick={() => setTab('prestado')}
          >
            Prestados ({activos.length})
          </button>
          <button
            className={tab === 'devuelto' ? `${primaryButton}` : `${secondaryButton}`}
            onClick={() => setTab('devuelto')}
          >
            Entregados ({devueltos.length})
          </button>
        </div>
      </div>

      <div className={`${panel} p-4 overflow-x-auto`}>
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Equipo</th>
              <th>Profesor</th>
              <th>Cant.</th>
              <th>Detalle</th>
              <th>Fecha de Préstamo</th>
              {tab === 'devuelto' && <th>Fecha de Entrega</th>}
              <th>Estado</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {list.map((prestamo) => (
              <tr key={prestamo.id}>
                <td className="font-bold text-slate-900 d-flex align-items-center gap-2">
                  <span className="rounded d-inline-flex align-items-center justify-content-center bg-blue-50 text-blue-700" style={{ width: '26px', height: '26px' }}>
                    <FiPackage size={13} />
                  </span>
                  {prestamo.item_nombre}
                </td>
                <td>
                  <span className="d-inline-flex align-items-center gap-1 font-semibold text-slate-800">
                    <FiUser size={12} className="text-slate-400" />
                    {prestamo.profesor_nombre} {prestamo.apellido}
                  </span>
                </td>
                <td className="font-semibold">{prestamo.cantidad}</td>
                <td className="text-xs text-slate-600">{prestamo.detalle || '-'}</td>
                <td className="text-xs text-slate-500">{new Date(prestamo.fecha_prestamo).toLocaleDateString('es-ES')}</td>
                {tab === 'devuelto' && <td className="text-xs text-slate-500">{prestamo.fecha_devolucion ? new Date(prestamo.fecha_devolucion).toLocaleDateString('es-ES') : '-'}</td>}
                <td><StatusBadge value={prestamo.estado} /></td>
                <td className="text-right">
                  {prestamo.estado === 'prestado' ? (
                    <button className={`${primaryButton} d-inline-flex align-items-center gap-1`} disabled={procesando === prestamo.id} onClick={() => entregar(prestamo.id)}>
                      <FiCheckCircle size={13} />
                      {procesando === prestamo.id ? 'Procesando...' : 'Entregado'}
                    </button>
                  ) : (
                    <button className={`${dangerButton} d-inline-flex align-items-center gap-1`} onClick={() => eliminar(prestamo.id)}>
                      <FiTrash2 size={13} />
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td className="text-center py-6 text-slate-500" colSpan={tab === 'devuelto' ? 8 : 7}>
                  {tab === 'prestado' ? 'No hay equipos prestados actualmente' : 'No hay equipos entregados aún'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
