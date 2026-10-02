'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import RequestListControls from './RequestListControls';
import AdminQuickForm from './AdminQuickForm';
import { compareRequests } from '@/app/lib/request-order';
import RequestSubmittedNotice from './RequestSubmittedNotice';
import RequestLocationFields, { emptyRequestLocation, formatRequestLocation } from './RequestLocationFields';
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
  seccion?: string | null;
  numero_aula?: string | null;
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

export function StatusBadge({ value }: { value: string }) {
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

function InventoryEditorContainer({ floating, saving, onClose, children, titleId = "inventory-editor-title" }: {
  floating: boolean; saving: boolean; onClose: () => void; children: React.ReactNode; titleId?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!floating) return;
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [floating]);

  if (!floating) return <>{children}</>;
  return <dialog ref={dialog} className="inventory-edit-dialog" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); if (!saving) onClose(); }}>
    <button className="inventory-edit-close" type="button" onClick={onClose} disabled={saving} aria-label="Cerrar edición"><FiX size={21} /></button>
    {children}
  </dialog>;
}

function InventoryDeleteDialog({ name, deleting, error, onCancel, onConfirm }: {
  name: string; deleting: boolean; error?: string; onCancel: () => void; onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    element?.showModal();
    return () => { element?.close(); previousFocus?.focus(); };
  }, []);

  return <dialog ref={dialog} className="inventory-delete-dialog" aria-labelledby="inventory-delete-title" aria-describedby="inventory-delete-description"
    onCancel={event => { event.preventDefault(); if (!deleting) onCancel(); }}>
    <div className="inventory-delete-dialog-header">
      <span><FiTrash2 size={22} /></span>
      <h2 id="inventory-delete-title">Eliminar artículo</h2>
      <button type="button" onClick={onCancel} disabled={deleting} aria-label="Cerrar confirmación"><FiX size={20} /></button>
    </div>
    <div className="inventory-delete-dialog-body">
      <p id="inventory-delete-description">¿Deseas eliminar <strong>«{name}»</strong> del inventario?</p>
      <p>Esta acción no se puede deshacer.</p>
      {error && <div role="alert" className="inventory-delete-dialog-error">{error}</div>}
    </div>
    <div className="inventory-delete-dialog-footer">
      <button type="button" className={secondaryButton} onClick={onCancel} disabled={deleting} autoFocus>Cancelar</button>
      <button type="button" className={dangerButton} onClick={onConfirm} disabled={deleting}><FiTrash2 size={15} />{deleting ? 'Eliminando…' : 'Sí, eliminar artículo'}</button>
    </div>
  </dialog>;
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
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [customCategorias, setCustomCategorias] = useState<string[]>([]);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [categoryName, setCategoryName] = useState('');

  const addCategory = () => {
    const name = categoryName.trim();
    if (!name) return;
    const existing = categoriasDisponibles.find(category => category.toLocaleLowerCase() === name.toLocaleLowerCase());
    const categoria = existing || name;
    setCustomCategorias(previous => Array.from(new Set([...previous, categoria])));
    setForm(previous => ({ ...previous, categoria }));
    setCategoryName('');
    setCreatingCategory(false);
  };

  useEffect(() => {
    setCreatingCategory(false);
    setCategoryName('');
  }, [editingId, showForm]);

  const { confirmDialog, ConfirmComponent } = useConfirmDialog();

  const fetchItems = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const response = await fetch('/api/inventario?estado=todos');
      if (!response.ok) throw new Error(await readError(response));
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
      return matchSearch && matchCat && (!statusFilter || item.estado === statusFilter);
    });
  }, [items, search, selectedCategoria, statusFilter]);

  const stats = useMemo(() => {
    const totalTipos = items.length;
    const totalStock = items.reduce((acc, i) => acc + Number(i.cantidad_total), 0);
    const totalDisponible = items.reduce((acc, i) => acc + (i.estado === 'disponible' ? Number(i.cantidad_disponible) : 0), 0);
    const mantenimientos = items.filter((i) => i.estado === 'mantenimiento' || i.estado === 'agotado').length;
    return { totalTipos, totalStock, totalDisponible, mantenimientos };
  }, [items]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving || deleting || confirmDelete) return;
    setSaving(true);
    try {
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
    setShowForm(false);
    setMessage({ type: 'success', text: editingId ? 'Artículo actualizado con éxito' : 'Artículo creado con éxito' });

    if (savedItem) {
      setItems((prev) =>
        editingId
          ? prev.map((i) => (i.id === savedItem.id ? savedItem : i))
          : [savedItem, ...prev]
      );
    } else {
      await fetchItems();
    }
    } catch {
      setMessage({ type: 'error', text: 'No se pudo guardar el artículo. Intenta nuevamente.' });
    } finally { setSaving(false); }
  };

  const edit = (item: Item) => {
    setShowForm(true);
    setConfirmDelete(false);
    setEditingId(item.id);
    setMessage(null);
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

  const deleteItem = async (id: number) => {
    if (deleting || saving) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/inventario/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        setMessage({ type: 'error', text: await readError(response) });
        return;
      }
      setItems(previous => previous.filter(item => item.id !== id));
      setMessage({ type: 'success', text: 'Artículo eliminado correctamente' });
      if (editingId === id) {
        setEditingId(null);
        setForm(empty);
        setShowForm(false);
      }
      setConfirmDelete(false);
    } catch {
      setMessage({ type: 'error', text: 'No se pudo eliminar el artículo. Intenta nuevamente.' });
    } finally { setDeleting(false); }
  };

  const remove = (id: number) => {
    confirmDialog('¿Seguro que deseas eliminar este artículo del inventario?', () => { void deleteItem(id); });
  };

  return (
    <div className="inventory-manager">
      <div className="inventory-manager-inner">
      <header className="inventory-manager-header">
        <div><Link href="/admin/dashboard" className="inventory-breadcrumb">Administración <FiArrowRight size={12} /> Inventario</Link><h1>Inventario de equipos</h1><p>Organiza tus artículos y consulta lo que está disponible para cada clase.</p></div>
        <button type="button" className="inventory-add-button" aria-expanded={showForm} aria-controls="inventory-editor" onClick={() => { setShowForm(true); setEditingId(null); setForm(empty); }}><FiPlus size={18} /> Nuevo artículo</button>
      </header>
      <Notice message={message} />
      <ConfirmComponent />
      <div className="inventory-summary">
        {[{ label: 'Artículos registrados', value: stats.totalTipos, unit: 'tipos de equipo', icon: FiTag }, { label: 'Stock total', value: stats.totalStock, unit: 'unidades en inventario', icon: FiLayers }, { label: 'Disponibles', value: stats.totalDisponible, unit: 'unidades para préstamo', icon: FiPackage }, { label: 'Requieren atención', value: stats.mantenimientos, unit: 'en mantenimiento o agotados', icon: FiAlertTriangle }].map(({ label, value, unit, icon: Icon }) => <div className="inventory-summary-card" key={label}><div><span>{label}</span><Icon size={20} /></div><strong>{loading ? '—' : value}</strong><small>{unit}</small></div>)}
      </div>

      {/* Add / Edit Form */}
      <InventoryEditorContainer floating={showForm && editingId !== null} saving={saving || deleting} onClose={() => { setConfirmDelete(false); setEditingId(null); setForm(empty); setShowForm(false); }}>
      <form id="inventory-editor" hidden={!showForm} onSubmit={submit} className={`${panel} inventory-editor grid gap-4 p-6 md:grid-cols-4`}>
        <fieldset disabled={saving || deleting} className="inventory-editor-fields">
        <div className="md:col-span-4 border-b border-slate-200 pb-3 flex items-center justify-between">
          <h2 id="inventory-editor-title" className="text-base font-bold text-slate-900 d-flex align-items-center gap-2">
            <span className="rounded d-flex align-items-center justify-content-center bg-blue-50 text-blue-600" style={{ width: '30px', height: '30px' }}>
              {editingId ? <FiEdit2 size={15} /> : <FiPlus size={15} />}
            </span>
            {editingId ? 'Editar Artículo' : 'Nuevo artículo'}
          </h2>
          {editingId && (
            <span className="text-xs bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full font-semibold">
              Modificando ID #{editingId}
            </span>
          )}
        </div>

        {editingId !== null && message?.type === 'error' && <div className="inventory-edit-error" role="alert"><Notice message={message} /></div>}
        <div><label className={label}>Nombre del equipo</label><input className={input} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Equipo" required /></div>
        <div>
          <label className={label} htmlFor="inventory-category">Categoría</label>
          <select id="inventory-category" className={input} value={form.categoria}
            onChange={event => setForm({ ...form, categoria: event.target.value })} required>
            <option value="" disabled>Selecciona una categoría…</option>
            {categoriasDisponibles.map(category => <option key={category} value={category}>{category}</option>)}
          </select>
          {!creatingCategory ? <button type="button" className="inventory-new-category" aria-expanded={false}
            onClick={() => setCreatingCategory(true)}><FiPlus size={15} /> Nueva categoría</button> :
            <div className="inventory-category-create">
              <label htmlFor="inventory-category-name">Nombre de la nueva categoría</label>
              <input id="inventory-category-name" className={input} value={categoryName} autoFocus
                placeholder="Ej. Cargadores o controles" onChange={event => setCategoryName(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') { event.preventDefault(); addCategory(); }
                  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setCreatingCategory(false); setCategoryName(''); }
                }} />
              <div><button type="button" className={primaryButton} disabled={!categoryName.trim()} onClick={addCategory}><FiPlus size={14} /> Crear y seleccionar</button>
                <button type="button" className={secondaryButton} onClick={() => { setCreatingCategory(false); setCategoryName(''); }}>Cancelar</button></div>
              <small>Se guardará en el inventario al guardar el artículo.</small>
            </div>}
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
          {editingId !== null && <button type="button" className={`${dangerButton} inventory-editor-delete d-inline-flex align-items-center gap-2`} onClick={() => { setMessage(null); setConfirmDelete(true); }}><FiTrash2 size={15} /> Eliminar artículo</button>}
          <button disabled={confirmDelete} className={`${primaryButton} d-inline-flex align-items-center gap-2`} type="submit">
            {editingId ? <FiSave size={15} /> : <FiPlus size={15} />}
            {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Registrar artículo'}
          </button>
          <button className={secondaryButton} type="button" onClick={() => { setConfirmDelete(false); setEditingId(null); setForm(empty); setShowForm(false); }}>Cancelar</button>
        </div>
        </fieldset>
      </form>
      </InventoryEditorContainer>
      {editingId !== null && confirmDelete && <InventoryDeleteDialog
        name={items.find(item => item.id === editingId)?.nombre || form.nombre}
        deleting={deleting} error={message?.type === 'error' ? message.text : undefined}
        onCancel={() => { setConfirmDelete(false); setMessage(null); }}
        onConfirm={() => void deleteItem(editingId)} />}

      {/* Filter and Table Panel */}
      <div className={`${panel} inventory-list-panel p-4 space-y-4`}>
        <div className="inventory-list-toolbar">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">Tus equipos</span>
            <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-semibold">{filteredItems.length} de {items.length}</span>
          </div>

          <div className="inventory-list-filters">
            <div className="d-flex align-items-center gap-2">
              <FiSearch className="text-slate-400" size={16} style={{ marginLeft: '8px' }} />
              <input
                className={`${input} md:w-64`}
                aria-label="Buscar artículos" placeholder="Buscar equipo, descripción o ubicación…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="d-flex align-items-center gap-2">
              <FiFilter className="text-slate-400" size={16} style={{ marginLeft: '8px' }} />
              <select
                className={`${input} md:w-48`}
                aria-label="Filtrar por categoría" value={selectedCategoria}
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

        <div className="inventory-state-tabs" role="group" aria-label="Filtrar por estado">
          {[['', 'Todos'], ['disponible', 'Disponibles'], ['mantenimiento', 'Mantenimiento'], ['agotado', 'Agotados']].map(([value, name]) => <button key={value} type="button" aria-pressed={statusFilter === value} className={statusFilter === value ? 'active' : ''} onClick={() => setStatusFilter(value)}>{name}<span>{value ? items.filter(item => item.estado === value).length : items.length}</span></button>)}
          {(search || selectedCategoria || statusFilter) && <button type="button" className="inventory-clear-filters" onClick={() => { setSearch(''); setSelectedCategoria(''); setStatusFilter(''); }}><FiX size={13} /> Limpiar filtros</button>}
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
                <tr><td className="text-center py-6 text-slate-500" colSpan={6}>{items.length ? 'No hay resultados con estos filtros. Prueba otra búsqueda.' : 'Aún no hay artículos. Usa «Nuevo artículo» para comenzar.'}</td></tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="inventory-item-name"><span className="inventory-item-icon"><FiPackage size={17} /></span><div><strong>{item.nombre}</strong><small>EQ-{String(item.id).padStart(3, '0')}</small></div></div>
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
      <p className="inventory-list-footnote">El stock se actualiza al registrar préstamos y devoluciones.</p>
      </div>
    </div>
  );
}

export function AdminProfesoresView() {
  const empty = { email: '', nombre: '', apellido: '', password: '', role: 'profesor', telefono: '', correo_personal: '', activo: true };
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const pageSize = 10;
  const [page, setPage] = useState(1);
  
  const { confirmDialog, ConfirmComponent } = useConfirmDialog();

  const fetchUsuarios = async () => {
    try {
      const response = await fetch('/api/usuarios');
      if (!response.ok) throw new Error(await readError(response));
      const data = await response.json();
      setUsuarios(data.usuarios || []);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchUsuarios().catch(() => setMessage({ type: 'error', text: 'Error al cargar usuarios' }));
  }, []);

  const filteredUsuarios = useMemo(() => {
    return usuarios.filter((u) => {
      const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const full = normalize(`${u.nombre} ${u.apellido} ${u.email} ${u.correo_personal || ''} ${u.area || ''}`);
      return full.includes(normalize(search.trim())) && (!statusFilter || u.activo === (statusFilter === 'activo')) && (!roleFilter || u.role === roleFilter);
    });
  }, [usuarios, search, statusFilter, roleFilter]);

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
    if (saving) return;
    setSaving(true);
    try {
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
    setShowForm(false);
    setMessage({ type: 'success', text: editingId ? 'Usuario actualizado con éxito' : 'Usuario creado con éxito' });
    await fetchUsuarios();
    } catch { setMessage({ type: 'error', text: 'No se pudieron guardar o actualizar los datos. Intenta nuevamente.' }); }
    finally { setSaving(false); }
  };

  const edit = (usuario: Usuario) => {
    setEditingId(usuario.id);
    setSelectedUser(null);
    setMessage(null);
    setShowForm(true);
    setForm({ email: usuario.email, nombre: usuario.nombre, apellido: usuario.apellido, password: '', role: usuario.role, telefono: usuario.telefono || '', correo_personal: usuario.correo_personal || '', activo: usuario.activo });
  };

  const deactivate = (id: number) => {
    const usuario = usuarios.find(user => user.id === id);
    if (!usuario) return;
    confirmDialog(`¿Deseas ${usuario.activo ? 'desactivar' : 'activar'} la cuenta de ${usuario.nombre} ${usuario.apellido}?`, async () => {
      setUpdatingId(id);
      try {
        const response = await fetch(`/api/usuarios/${id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activo: !usuario.activo, telefono: usuario.telefono }),
        });
        if (!response.ok) throw new Error(await readError(response));
        setUsuarios(previous => previous.map(user => user.id === id ? { ...user, activo: !usuario.activo } : user));
        setMessage({ type: 'success', text: usuario.activo ? 'Cuenta desactivada' : 'Cuenta activada' });
      } catch (error) { setMessage({ type: 'error', text: error instanceof Error ? error.message : 'No se pudo actualizar la cuenta' }); }
      finally { setUpdatingId(null); }
    }, usuario.activo);
  };

  return (
    <div className="inventory-manager teachers-manager">
      <div className="inventory-manager-inner">
      <header className="inventory-manager-header">
        <div><Link href="/admin/dashboard" className="inventory-breadcrumb">Administración <FiArrowRight size={12} /> Profesores</Link><h1>Profesores y usuarios</h1><p>Encuentra a tu equipo docente y administra sus cuentas en un solo lugar.</p></div>
        <button type="button" className="inventory-add-button" onClick={() => { setForm(empty); setEditingId(null); setMessage(null); setShowForm(true); }}><FiPlus size={18} /> Nuevo usuario</button>
      </header>
      <Notice message={message} />
      <ConfirmComponent />
      <div className="inventory-summary">
        {[{ label: 'Profesores', value: usuarios.filter(user => user.role === 'profesor').length, unit: 'docentes registrados', icon: FiUsers }, { label: 'Cuentas activas', value: usuarios.filter(user => user.activo).length, unit: 'con acceso al sistema', icon: FiUserCheck }, { label: 'Cuentas inactivas', value: usuarios.filter(user => !user.activo).length, unit: 'con acceso desactivado', icon: FiUserX }, { label: 'Administradores', value: usuarios.filter(user => user.role === 'admin').length, unit: 'usuarios de administración', icon: FiShield }].map(({ label, value, unit, icon: Icon }) => <div className="inventory-summary-card" key={label}><div><span>{label}</span><Icon size={20} /></div><strong>{loading ? '—' : value}</strong><small>{unit}</small></div>)}
      </div>
      {showForm && <InventoryEditorContainer floating saving={saving} titleId="teacher-editor-title" onClose={() => setShowForm(false)}>
      <form onSubmit={submit} className={`${panel} inventory-editor`}><fieldset disabled={saving} className="inventory-editor-fields">
        <div className="md:col-span-4 border-b border-slate-200 pb-2 flex justify-between items-center">
          <h2 id="teacher-editor-title" className="text-base font-bold text-slate-900 d-flex align-items-center gap-2">
            <span className="rounded d-flex align-items-center justify-content-center bg-purple-50 text-purple-700" style={{ width: '30px', height: '30px' }}>
              {editingId ? <FiEdit2 size={15} /> : <FiUser size={15} />}
            </span>
            {editingId ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
          </h2>
        </div>
        {message?.type === 'error' && <div className="inventory-edit-error" role="alert"><Notice message={message} /></div>}
        <div><label className={label}>Nombre</label><input className={input} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required /></div>
        <div><label className={label}>Apellido</label><input className={input} value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} required /></div>
        <div><label className={label}>DNI / Usuario</label><input className={input} type="text" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
        <div><label className={label}>Correo Personal Contacto</label><input className={input} type="email" value={form.correo_personal} onChange={(e) => setForm({ ...form, correo_personal: e.target.value })} placeholder="contacto@email.com" /></div>
        <div><label className={label}>Teléfono / WhatsApp</label><input className={input} value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="+51999999999" /></div>
        <div><label className={label}>Contraseña</label><input className={input} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editingId ? 'Opcional (dejar vacío para mantener)' : 'DNI por defecto'} /></div>
        <div><label className={label}>Rol de Acceso</label><select className={input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as any })}><option value="profesor">Profesor</option><option value="admin">Administrador</option></select></div>
        {editingId !== null && <div className="flex items-end mb-2">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} /> Cuenta activa
          </label>
        </div>}
        <div className="flex items-end gap-2 md:col-span-4 pt-2">
          <button className={`${primaryButton} d-inline-flex align-items-center gap-2`} type="submit">
            {editingId ? <FiSave size={15} /> : <FiUser size={15} />}
            {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear usuario'}
          </button>
          <button className={secondaryButton} type="button" onClick={() => setShowForm(false)}>Cancelar</button>
        </div>
      </fieldset></form>
      </InventoryEditorContainer>}

      <section className="inventory-panel inventory-list-panel">
        <div className="inventory-list-toolbar">
          <div><h2 className="loans-list-title">Directorio de usuarios</h2><span className="loans-count">{filteredUsuarios.length} usuarios</span></div>
          <label className="loans-search"><FiSearch size={17} /><input aria-label="Buscar usuarios" placeholder="Buscar nombre, DNI, correo o área…" value={search} onChange={event => handleSearch(event.target.value)} />{search && <button type="button" aria-label="Limpiar búsqueda" onClick={() => handleSearch('')}><FiX size={15} /></button>}</label>
        </div>
        <div className="inventory-state-tabs" role="group" aria-label="Filtrar usuarios">
          {[['', 'Todos'], ['activo', 'Activos'], ['inactivo', 'Inactivos']].map(([value, name]) => <button key={value} type="button" className={statusFilter === value ? 'active' : ''} aria-pressed={statusFilter === value} onClick={() => { setStatusFilter(value); setPage(1); }}>{name}<span>{usuarios.filter(user => !value || user.activo === (value === 'activo')).length}</span></button>)}
          <select aria-label="Filtrar por rol" className="teachers-role-filter" value={roleFilter} onChange={event => { setRoleFilter(event.target.value); setPage(1); }}><option value="">Todos los roles</option><option value="profesor">Profesores</option><option value="admin">Administradores</option></select>
          {(search || statusFilter || roleFilter) && <button type="button" onClick={() => { setSearch(''); setStatusFilter(''); setRoleFilter(''); setPage(1); }}><FiX size={13} /> Limpiar</button>}
        </div>

        {loading || filteredUsuarios.length === 0 ? (
          <div className="text-center py-8 text-slate-500 font-semibold">
            <FiUsers size={36} className="mx-auto mb-3 text-slate-300" />
            {loading ? 'Cargando usuarios…' : 'No hay usuarios con estos filtros.'}
          </div>
        ) : (
          <div className="teachers-table-scroll" role="region" aria-label="Directorio de usuarios" tabIndex={0}>
            <table className="inventory-table teachers-table">
              <thead><tr><th scope="col">Nombre y apellido</th><th scope="col">DNI / Usuario</th><th scope="col">Área / Cargo</th><th scope="col">Correo</th><th scope="col">Teléfono</th><th scope="col">Rol</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr></thead>
              <tbody>{paginatedUsuarios.map(usuario => <tr key={usuario.id}>
                <td><button type="button" className="teacher-directory-name" onClick={() => setSelectedUser(usuario)}>{usuario.nombre} {usuario.apellido}</button></td>
                <td className="teachers-table-id">{usuario.dni || usuario.email}</td>
                <td>{usuario.area || 'Sin asignar'}</td>
                <td>{usuario.correo_personal || 'Sin correo'}</td>
                <td>{usuario.telefono || 'Sin teléfono'}</td>
                <td><span className="category-chip">{usuario.role === 'admin' ? 'Administrador' : 'Profesor'}</span></td>
                <td><div className="teacher-directory-badges"><span className={usuario.activo ? 'is-active' : 'is-inactive'}>{usuario.activo ? <FiCheckCircle size={11} /> : <FiXCircle size={11} />}{usuario.activo ? 'Activa' : 'Inactiva'}</span></div></td>
                <td><div className="teacher-directory-actions"><button type="button" className={secondaryButton} onClick={() => setSelectedUser(usuario)}><FiEye size={13} /> Ver ficha</button><button type="button" className={secondaryButton} onClick={() => edit(usuario)}><FiEdit2 size={13} /> Editar</button><button type="button" disabled={updatingId !== null} className={`teacher-account-action ${usuario.activo ? '' : 'activate'}`} onClick={() => deactivate(usuario.id)}>{usuario.activo ? <FiUserX size={13} /> : <FiUserCheck size={13} />}{updatingId === usuario.id ? 'Actualizando…' : usuario.activo ? 'Desactivar' : 'Activar'}</button></div></td>
              </tr>)}</tbody>
            </table>
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
                      className={`d-inline-flex align-items-center justify-content-center rounded fw-bold ${currentPage === p ? 'teachers-page-active' : 'text-slate-600 bg-slate-100'}`}
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
      </section>

      {selectedUser && (
        <InventoryEditorContainer floating saving={false} titleId="teacher-profile-title" onClose={() => setSelectedUser(null)}>
              <div className="teacher-profile-content">
                <div className="modal-header border-b border-slate-200 p-4">
                  <h5 id="teacher-profile-title" className="modal-title font-bold text-slate-900 d-flex align-items-center gap-2">
                    <span className="rounded d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary" style={{ width: '30px', height: '30px' }}>
                      <FiEye size={15} />
                    </span>
                    Información del Usuario
                  </h5>

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
                        <span className="teacher-profile-status">{selectedUser.activo ? 'Cuenta activa' : 'Cuenta inactiva'}</span>
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
                      <span><span className="font-semibold text-slate-500">Usuario de acceso:</span> <strong className="text-slate-800">{selectedUser.email}</strong></span>
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
        </InventoryEditorContainer>
      )}
      </div>
    </div>
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
    const refresh = () => { fetchSolicitudes().catch(() => setMessage({ type: 'error', text: 'Error al cargar solicitudes' })); };
    refresh();
    window.addEventListener('admin-requests-updated', refresh);
    return () => window.removeEventListener('admin-requests-updated', refresh);
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
        }, 500);
      } else if (sol && sol.inventario_id) {
        setTimeout(() => {
          window.location.href = '/admin/prestamos';
        }, 500);
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
              <td className="text-xs text-slate-600">{solicitud.motivo || '-'}{formatRequestLocation(solicitud) && <div className="mt-1 fw-semibold">{formatRequestLocation(solicitud)}</div>}</td>
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
  const [requestLocation, setRequestLocation] = useState(emptyRequestLocation);
  const [items, setItems] = useState<Item[]>([]);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [form, setForm] = useState({ inventario_id: 0, cantidad_solicitada: 1, motivo: '' });
  const [message, setMessage] = useState<Message>(null);
  const [activeTab, setActiveTab] = useState<'todas' | 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada'>('todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleRequestCount, setVisibleRequestCount] = useState(2);
  useEffect(() => { setVisibleRequestCount(2); }, [activeTab, searchQuery]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showSubmittedNotice, setShowSubmittedNotice] = useState(false);
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
    if (!user?.id) return;
    void fetchData();
    const refresh = () => { void fetchData(); };
    window.addEventListener('teacher-requests-updated', refresh);
    return () => window.removeEventListener('teacher-requests-updated', refresh);
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

    if (solicitudType === 'equipo' && !requestLocation.seccion.trim() && !requestLocation.numero_aula.trim()) {
      setMessage({ type: 'error', text: 'Indica la sección o el número de aula donde lo usarás.' });
      return;
    }
    setSubmitting(true);
    
    const bodyPayload: any = {
      profesor_id: user?.id,
      ...(solicitudType === 'equipo' ? requestLocation : {}),
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

    setMessage(null);
    setShowSubmittedNotice(true);
    setForm({ inventario_id: 0, cantidad_solicitada: 1, motivo: '' });
    setRequestLocation(emptyRequestLocation);
    setShowNewForm(false);
    fetchData();
  };

  const handleCancel = async (id: number) => {
    confirmDialog('¿Estás seguro de que deseas cancelar esta solicitud?', async () => {
      const response = await fetch(`/api/solicitudes/${id}/cancelar`, { method: 'POST' });

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
    }).sort(compareRequests);
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
    <PageShell title="Mis solicitudes" subtitle="Todo lo que necesitas para tu próxima clase.">
      <div className="teacher-requests">
      <ConfirmComponent />
      {showSubmittedNotice && <RequestSubmittedNotice onAccept={() => setShowSubmittedNotice(false)} />}
      <div className="teacher-requests-intro">
        <span className="teacher-requests-intro-icon"><FiInbox size={24} /></span>
        <div><span className="teacher-requests-eyebrow">TU ACTIVIDAD</span><h2>Tus clases, en marcha</h2><p>{counts.pendiente ? `${counts.pendiente} solicitud${counts.pendiente > 1 ? 'es' : ''} en espera de revisión.` : 'Solicita equipos o reserva el aula de cómputo.'}</p></div>
      </div>
      <Notice message={message} />

      {/* TOP ACTIONS & NEW REQUEST TOGGLE */}
      <div className="teacher-requests-toolbar">
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            onClick={() => setShowNewForm(!showNewForm)}
            className="teacher-requests-create"
            aria-expanded={showNewForm}
            aria-controls="teacher-request-form"
          >
            {showNewForm ? <FiX size={16} /> : <FiPlus size={16} />}
            {showNewForm ? 'Ocultar Formulario' : 'Nueva Solicitud'}
          </button>
        </div>

        {/* SEARCH BAR */}
        <div className="position-relative" style={{ minWidth: '240px' }}>
          <FiSearch className="position-absolute text-secondary" size={15} style={{ left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="search"
            aria-label="Buscar solicitudes por artículo o motivo"
            className="inventory-form-input ps-5"
            placeholder="Buscar por artículo o motivo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* NEW REQUEST FORM (COLLAPSIBLE / ACCORDION) */}
      {showNewForm && (
        <form id="teacher-request-form" onSubmit={handleSubmit} className={`${panel} p-3 p-md-4 mb-4 border-2 border-primary`}>
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

            {solicitudType === 'equipo' && <div className="col-12"><RequestLocationFields value={requestLocation} onChange={setRequestLocation} /></div>}
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

      <div className="teacher-requests-filters" role="group" aria-label="Filtrar solicitudes por estado">
        {([
          ['todas', 'Todas'], ['pendiente', 'Pendientes'], ['aprobada', 'Aprobadas'],
          ['rechazada', 'Rechazadas'], ['cancelada', 'Canceladas'],
        ] as const).map(([value, label]) => (
          <button key={value} type="button" aria-pressed={activeTab === value}
            onClick={() => setActiveTab(value)} className={activeTab === value ? 'active' : ''}>
            {label}<span>{counts[value]}</span>
          </button>
        ))}
      </div>
      <p className="teacher-requests-results" aria-live="polite">{filteredSolicitudes.length} solicitud{filteredSolicitudes.length !== 1 ? 'es' : ''}{activeTab === 'todas' ? ' en tu historial' : ' en este estado'}</p>
      {filteredSolicitudes.length === 0 ? (
        <div className="teacher-requests-empty">
          <FiInbox size={36} aria-hidden="true" />
          <h3>{solicitudes.length ? 'No hay coincidencias' : 'Prepara tu próxima clase'}</h3>
          <p>{solicitudes.length ? 'Prueba otro estado o busca con otras palabras.' : 'Tus solicitudes de equipos y aula aparecerán aquí.'}</p>
          <button type="button" className="teacher-requests-create" onClick={() => {
            if (solicitudes.length) { setActiveTab('todas'); setSearchQuery(''); }
            else { setShowNewForm(true); }
          }}>{solicitudes.length ? 'Ver todas las solicitudes' : 'Crear mi primera solicitud'}</button>
        </div>
      ) : (
        <div className="teacher-requests-grid">
          {filteredSolicitudes.slice(0, visibleRequestCount).map((sol) => {
            const schedule = !sol.inventario_id ? sol.item_nombre?.match(/^(.*?) \((.*?)\)$/) : null;
            const title = schedule?.[1] || sol.item_nombre || 'Artículo sin especificar';
            const isClassroom = !sol.inventario_id;
            return (
              <article key={sol.id} className={`teacher-request-card is-${sol.estado}`}>
                <div className="teacher-request-card-top">
                  <span className={`teacher-request-icon ${isClassroom ? 'classroom' : ''}`}>
                    {isClassroom ? <FiCalendar size={21} /> : <FiPackage size={21} />}
                  </span>
                  <StatusBadge value={sol.estado} />
                </div>
                <span className="teacher-requests-eyebrow">{isClassroom ? 'RESERVA DE AULA' : 'PRÉSTAMO DE EQUIPO'}</span>
                <h3>{title}</h3>
                {schedule && <div className="teacher-request-schedule"><FiClock size={16} /><span>{schedule[2]}</span></div>}
                {!isClassroom && <div className="teacher-request-schedule"><FiLayers size={16} /><span>{sol.cantidad_solicitada} unidad{sol.cantidad_solicitada !== 1 ? 'es' : ''}</span></div>}
                <div className="teacher-request-reason"><span>Para tu clase</span><p>{sol.motivo || 'Sin motivo especificado'}</p></div>
                {formatRequestLocation(sol) && <div className="teacher-request-schedule"><FiMapPin size={16} /><span>{formatRequestLocation(sol)}</span></div>}
                {sol.comentarios && <div className="teacher-request-note"><FiMail size={16} /><div><strong>Administración</strong><p>{sol.comentarios}</p></div></div>}
                <footer>
                  <span>Enviada el <time dateTime={sol.fecha_solicitud}>{new Date(sol.fecha_solicitud).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}</time></span>
                  {sol.estado === 'pendiente' && <button type="button" onClick={() => handleCancel(sol.id)} aria-label={`Cancelar solicitud de ${title}`}><FiX size={16} />Cancelar solicitud</button>}
                </footer>
              </article>
            );
          })}
        </div>
      )}
      <RequestListControls total={filteredSolicitudes.length} visible={visibleRequestCount}
        onMore={() => setVisibleRequestCount(count => count + 2)} onLess={() => setVisibleRequestCount(2)} />
      </div>
    </PageShell>
  );
}

export function AdminPrestamosView() {
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [tab, setTab] = useState<'pendiente' | 'prestado' | 'devuelto'>('pendiente');
  const [message, setMessage] = useState<Message>(null);
  const [showNewLoan, setShowNewLoan] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [procesando, setProcesando] = useState<number | null>(null);

  const { confirmDialog, ConfirmComponent } = useConfirmDialog();

  const fetchData = async () => {
    try {
      const response = await fetch('/api/prestamos', { cache: 'no-store' });
      if (!response.ok) throw new Error(await readError(response));
      const data = await response.json();
      setPrestamos(data.prestamos || []);
    } catch {
      setMessage({ type: 'error', text: 'No se pudieron actualizar los préstamos. Intenta nuevamente.' });
    } finally { setLoading(false); }
  };

  useEffect(() => {
    void fetchData();
    const refresh = () => { void fetchData(); };
    window.addEventListener('admin-requests-updated', refresh);
    return () => window.removeEventListener('admin-requests-updated', refresh);
  }, []);

  const marcarPrestado = async (id: number) => {
    setProcesando(id);
    try {
      const response = await fetch(`/api/prestamos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'prestado' }),
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Equipo entregado al profesor' });
        setPrestamos((prev) =>
          prev.map((p) => (p.id === id ? { ...p, estado: 'prestado' } : p))
        );
      } else {
        const data = await response.json().catch(() => null);
        setMessage({ type: 'error', text: data?.error || 'Error' });
      }
    } catch {
      setMessage({ type: 'error', text: 'No se pudo registrar la entrega. Intenta nuevamente.' });
    } finally {
      setProcesando(null);
    }
  };

  const marcarDevuelto = async (id: number) => {
    confirmDialog('¿Confirmas que el/la profesor(a) devolvió el equipo?', async () => {
      setProcesando(id);
      try {
        const response = await fetch(`/api/prestamos/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: 'devuelto' }),
        });
        if (response.ok) {
          setMessage({ type: 'success', text: 'Equipo devuelto al inventario' });
          setPrestamos((prev) =>
            prev.map((p) =>
              p.id === id
                ? { ...p, estado: 'devuelto', fecha_devolucion: new Date().toISOString() }
                : p
            )
          );
        } else {
          const data = await response.json().catch(() => null);
          setMessage({ type: 'error', text: data?.error || 'No se pudo marcar como devuelto' });
        }
      } catch (error) {
        setMessage({ type: 'error', text: 'Error al marcar como devuelto' });
      } finally {
        setProcesando(null);
      }
    }, false);
  };

  const eliminar = (id: number) => {
    confirmDialog('¿Seguro que deseas eliminar este registro de devolución?', async () => {
      setProcesando(id);
      try {
        const response = await fetch(`/api/prestamos/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error(await readError(response));
        setMessage({ type: 'success', text: 'Registro eliminado' });
        setPrestamos(previous => previous.filter(loan => loan.id !== id));
      } catch (error) {
        setMessage({ type: 'error', text: error instanceof Error ? error.message : 'No se pudo eliminar el registro' });
      } finally { setProcesando(null); }
    }, true);
  };

  const pendientes = prestamos.filter((p) => p.estado === 'pendiente');
  const activos = prestamos.filter((p) => p.estado === 'prestado');
  const devueltos = prestamos.filter((p) => p.estado === 'devuelto');
  const currentLoans = tab === 'pendiente' ? pendientes : tab === 'prestado' ? activos : devueltos;
  const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const list = currentLoans.filter(loan => normalize(`${loan.item_nombre || ''} ${loan.profesor_nombre || ''} ${loan.apellido || ''} ${loan.detalle || ''} ${loan.id}`).includes(normalize(search.trim())));
  const borrowedUnits = activos.reduce((sum, loan) => sum + Number(loan.cantidad), 0);

  return (
    <div className="inventory-manager loans-manager">
      <div className="inventory-manager-inner">
      <header className="inventory-manager-header">
        <div><Link href="/admin/dashboard" className="inventory-breadcrumb">Administración <FiArrowRight size={12} /> Préstamos</Link><h1>Préstamos de equipos</h1><p>Controla las entregas, acompaña cada préstamo y registra las devoluciones.</p></div>
        <div className="loans-header-actions"><Link href="/admin/historial" className="btn-secondary-custom"><FiUsers size={16} /> Historial por profesor</Link><button type="button" className="inventory-add-button" onClick={() => setShowNewLoan(true)}><FiPlus size={18} /> Nuevo préstamo</button></div>
      </header>
      <Notice message={message} />
      <ConfirmComponent />
      {showNewLoan && <AdminQuickForm type="loan" onClose={() => setShowNewLoan(false)} onSaved={() => { setTab('prestado'); setSearch(''); void fetchData(); }} />}
      <div className="inventory-summary">
        {[{ label: 'Por recoger', value: pendientes.length, unit: 'entregas pendientes', icon: FiInbox }, { label: 'Préstamos activos', value: activos.length, unit: 'registros en préstamo', icon: FiClock }, { label: 'Equipos en uso', value: borrowedUnits, unit: 'unidades con profesores', icon: FiPackage }, { label: 'Devueltos', value: devueltos.length, unit: 'préstamos completados', icon: FiCheckCircle }].map(({ label, value, unit, icon: Icon }) => <div className="inventory-summary-card" key={label}><div><span>{label}</span><Icon size={20} /></div><strong>{loading ? '—' : value}</strong><small>{unit}</small></div>)}
      </div>
      <section className="inventory-panel inventory-list-panel">
        <div className="inventory-list-toolbar">
          <div><h2 className="loans-list-title">Registro de préstamos</h2><span className="loans-count">{list.length} registros</span></div>
          <label className="loans-search"><FiSearch size={17} /><input aria-label="Buscar préstamos" placeholder="Buscar profesor, equipo o detalle…" value={search} onChange={event => setSearch(event.target.value)} />{search && <button type="button" onClick={() => setSearch('')} aria-label="Limpiar búsqueda"><FiX size={15} /></button>}</label>
        </div>
        <div className="inventory-state-tabs" role="group" aria-label="Estado del préstamo">
          {([{ value: 'pendiente', label: 'Por recoger', count: pendientes.length }, { value: 'prestado', label: 'Prestados', count: activos.length }, { value: 'devuelto', label: 'Devueltos', count: devueltos.length }] as const).map(state => <button key={state.value} type="button" className={tab === state.value ? 'active' : ''} aria-pressed={tab === state.value} onClick={() => setTab(state.value)}>{state.label}<span>{state.count}</span></button>)}
        </div>
        <p className="loans-tab-hint">{tab === 'pendiente' ? 'Confirma la entrega cuando el profesor recoja sus equipos.' : tab === 'prestado' ? 'Registra la devolución cuando los equipos regresen al inventario.' : 'Consulta las entregas que ya fueron devueltas.'}</p>
        <div className="overflow-x-auto">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Equipo</th>
              <th>Profesor</th>
              <th>Cant.</th>
              <th>Detalle</th>
              <th>Fecha de Préstamo</th>
              {tab === 'devuelto' && <th>Fecha de devolución</th>}
              <th>Estado</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {!loading && list.map((prestamo) => (
              <tr key={prestamo.id}>
                <td><div className="inventory-item-name"><span className="inventory-item-icon"><FiPackage size={17} /></span><div><strong>{prestamo.item_nombre || 'Equipo'}</strong><small>PR-{String(prestamo.id).padStart(3, '0')}</small></div></div></td>
                <td>
                  <span className="d-inline-flex align-items-center gap-1 font-semibold text-slate-800">
                    <FiUser size={12} className="text-slate-400" />
                    {prestamo.profesor_nombre} {prestamo.apellido}
                  </span>
                </td>
                <td className="font-semibold">{prestamo.cantidad}</td>
                <td className="loans-detail">{prestamo.detalle || '-'}</td>
                <td className="text-xs text-slate-500">{new Date(prestamo.fecha_prestamo).toLocaleString('es-ES', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                {tab === 'devuelto' && <td className="text-xs text-slate-500">{prestamo.fecha_devolucion ? new Date(prestamo.fecha_devolucion).toLocaleString('es-ES', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</td>}
                <td><StatusBadge value={prestamo.estado} /></td>
                <td className="text-right">
                  {prestamo.estado === 'pendiente' ? (
                    <button className={`${primaryButton} d-inline-flex align-items-center gap-1`} disabled={procesando !== null} onClick={() => marcarPrestado(prestamo.id)}>
                      <FiCheckCircle size={13} />
                      {procesando === prestamo.id ? 'Guardando…' : 'Confirmar entrega'}
                    </button>
                  ) : prestamo.estado === 'prestado' ? (
                    <button className={`${primaryButton} d-inline-flex align-items-center gap-1`} disabled={procesando !== null} onClick={() => marcarDevuelto(prestamo.id)}>
                      <FiCheckCircle size={13} />
                      {procesando === prestamo.id ? 'Guardando…' : 'Registrar devolución'}
                    </button>
                  ) : (
                    <button className={`${dangerButton} d-inline-flex align-items-center gap-1`} disabled={procesando !== null} onClick={() => eliminar(prestamo.id)}>
                      <FiTrash2 size={13} />
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {(loading || list.length === 0) && (
              <tr>
                <td className="text-center py-6 text-slate-500" colSpan={tab === 'devuelto' ? 8 : 7}>
                  {loading ? 'Cargando préstamos…' : search ? 'No se encontraron préstamos. Prueba otro nombre, equipo o detalle.' : tab === 'pendiente' ? 'Todo al día. No hay equipos pendientes de recoger.' : tab === 'prestado' ? 'No hay equipos prestados actualmente.' : 'Aún no hay devoluciones registradas.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </section>
      <p className="inventory-list-footnote">Cada devolución repone automáticamente las unidades disponibles.</p>
      </div>
    </div>
  );
}
