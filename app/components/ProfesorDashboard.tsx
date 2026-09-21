'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  FiFileText,
  FiUser,
  FiArrowRight,
  FiPackage,
  FiSend,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiPlus,
  FiMinus,
  FiFilter,
  FiCalendar,
  FiTag,
  FiTrendingUp,
  FiStar,
} from 'react-icons/fi';

interface Item {
  id: number;
  nombre: string;
  categoria: string;
  cantidad_disponible: number;
  cantidad_total: number;
  estado: string;
}

interface Solicitud {
  id: number;
  item_nombre: string | null;
  cantidad_solicitada: number;
  motivo: string | null;
  estado: string;
  fecha_solicitud: string;
  comentarios: string | null;
}

export default function ProfesorDashboard() {
  const [inventario, setInventario] = useState<Item[]>([]);
  const [misSolicitudes, setMisSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [cantidad, setCantidad] = useState(1);
  const [motivo, setMotivo] = useState('');
  const [alertNotice, setAlertNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setUser(parsed);
        fetchData(parsed.id);
      } catch (error) {
        console.error('Error al leer usuario:', error);
        fetchData();
      }
    } else {
      fetchData();
    }
  }, []);

  const fetchData = async (profesorId?: number) => {
    setLoading(true);
    try {
      const invRes = await fetch('/api/inventario');
      if (invRes.ok) {
        const invData = await invRes.json();
        setInventario(invData.items || []);
      }

      const profId = profesorId || user?.id;
      if (profId) {
        const solRes = await fetch(`/api/solicitudes?profesor_id=${profId}`);
        if (solRes.ok) {
          const solData = await solRes.json();
          setMisSolicitudes(solData.solicitudes || []);
        }
      }
    } catch (error) {
      console.error('Error al obtener datos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    inventario.forEach((item) => {
      if (item.categoria) set.add(item.categoria);
    });
    return ['Todas', ...Array.from(set)];
  }, [inventario]);

  // Filtered inventory items
  const filteredItems = useMemo(() => {
    if (selectedCategory === 'Todas') return inventario;
    return inventario.filter((item) => item.categoria === selectedCategory);
  }, [inventario, selectedCategory]);

  const itemSeleccionado = useMemo(() => {
    return inventario.find((item) => item.id === selectedItem) || null;
  }, [inventario, selectedItem]);

  const maxStock = itemSeleccionado ? itemSeleccionado.cantidad_disponible : 1;

  // Stats
  const totalDisponibles = inventario.reduce(
    (total, item) => total + (item.cantidad_disponible || 0),
    0
  );
  const pendientesCount = misSolicitudes.filter((s) => s.estado === 'pendiente').length;
  const aprobadasCount = misSolicitudes.filter((s) => s.estado === 'aprobada').length;

  const handleSolicitar = async () => {
    if (!selectedItem || !user) {
      setAlertNotice({ type: 'error', text: 'Selecciona un artículo antes de continuar.' });
      return;
    }

    if (cantidad < 1) {
      setAlertNotice({ type: 'error', text: 'La cantidad debe ser al menos 1.' });
      return;
    }

    if (itemSeleccionado && cantidad > itemSeleccionado.cantidad_disponible) {
      setAlertNotice({
        type: 'error',
        text: `Solo hay ${itemSeleccionado.cantidad_disponible} unidad(es) disponible(s).`,
      });
      return;
    }

    setEnviando(true);
    setAlertNotice(null);

    try {
      const response = await fetch('/api/solicitudes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profesor_id: user.id,
          inventario_id: selectedItem,
          cantidad_solicitada: cantidad,
          motivo: motivo.trim() || 'Uso docente en clase',
        }),
      });

      if (response.ok) {
        setAlertNotice({
          type: 'success',
          text: '¡Solicitud registrada con éxito! Administración la evaluará a la brevedad.',
        });

        setSelectedItem(null);
        setCantidad(1);
        setMotivo('');

        // Refresh requests
        if (user?.id) {
          fetchData(user.id);
        }
      } else {
        const data = await response.json().catch(() => null);
        setAlertNotice({
          type: 'error',
          text: data?.error || data?.message || 'No se pudo registrar la solicitud.',
        });
      }
    } catch (error) {
      console.error('Error:', error);
      setAlertNotice({
        type: 'error',
        text: 'Ocurrió un error de conexión al enviar la solicitud.',
      });
    } finally {
      setEnviando(false);
    }
  };

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '¡Buenos días';
    if (hour < 19) return '¡Buenas tardes';
    return '¡Buenas noches';
  };

  const getFormattedDate = () => {
    return new Date().toLocaleDateString('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const motivosPredefinidos = [
    'Clase práctica de cómputo',
    'Examen / Evaluación',
    'Presentación / Proyección',
    'Taller docente',
  ];

  return (
    <div className="min-vh-100 bg-slate-50">
      <main className="container-xl py-3 py-md-4" style={{ maxWidth: '1080px' }}>
        
        {/* MOBILE HERO BANNER */}
        <section className="mobile-hero-banner mb-3 mb-md-4">
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className="badge bg-white bg-opacity-25 text-white text-capitalize px-2 py-1" style={{ fontSize: '0.7rem' }}>
                  <FiStar className="me-1" size={11} />
                  Docente Activo
                </span>
                {user?.area && (
                  <span className="badge bg-white bg-opacity-20 text-white px-2 py-1" style={{ fontSize: '0.7rem' }}>
                    {user.area}
                  </span>
                )}
              </div>

              <h1 className="h4 fw-bold text-white mb-1">
                {getGreeting()}, {user?.nombre ? `Prof. ${user.nombre}` : 'Profesor'}!
              </h1>
              
              <p className="small text-white-50 mb-0 d-flex align-items-center gap-1 text-capitalize">
                <FiCalendar size={13} />
                {getFormattedDate()}
              </p>
            </div>

            <div
              className="rounded-circle bg-white bg-opacity-20 d-flex align-items-center justify-content-center text-white fw-bold shadow-sm"
              style={{ width: '48px', height: '48px', fontSize: '1.25rem', flexShrink: 0 }}
            >
              {user?.nombre ? user.nombre.charAt(0).toUpperCase() : 'P'}
            </div>
          </div>
        </section>

        {/* STATS TILES GRID */}
        <div className="row g-2 g-md-3 mb-3 mb-md-4">
          <div className="col-4">
            <div className="mobile-stat-tile">
              <div className="mobile-stat-icon bg-primary bg-opacity-10 text-primary">
                <FiPackage size={18} />
              </div>
              <div className="mobile-stat-value">{loading ? '...' : totalDisponibles}</div>
              <div className="mobile-stat-label">Disponibles</div>
            </div>
          </div>

          <div className="col-4">
            <Link href="/profesor/solicitudes" className="text-decoration-none">
              <div className="mobile-stat-tile">
                <div className="mobile-stat-icon bg-warning bg-opacity-10 text-warning">
                  <FiClock size={18} />
                </div>
                <div className="mobile-stat-value text-warning">{loading ? '...' : pendientesCount}</div>
                <div className="mobile-stat-label">Pendientes</div>
              </div>
            </Link>
          </div>

          <div className="col-4">
            <Link href="/profesor/solicitudes" className="text-decoration-none">
              <div className="mobile-stat-tile">
                <div className="mobile-stat-icon bg-success bg-opacity-10 text-success">
                  <FiCheckCircle size={18} />
                </div>
                <div className="mobile-stat-value text-success">{loading ? '...' : aprobadasCount}</div>
                <div className="mobile-stat-label">Aprobadas</div>
              </div>
            </Link>
          </div>
        </div>

        {/* ACCESOS RÁPIDOS MÓVILES */}
        <div className="row g-2 g-md-3 mb-3 mb-md-4">
          <div className="col-12 col-md-6">
            <Link href="/profesor/solicitudes" className="mobile-action-card">
              <div className="action-icon-wrap bg-primary bg-opacity-10 text-primary">
                <FiFileText size={22} />
              </div>
              <div className="flex-grow-1 min-w-0">
                <div className="d-flex align-items-center justify-content-between">
                  <h2 className="h6 fw-bold text-dark mb-0">Mis Solicitudes</h2>
                  {pendientesCount > 0 && (
                    <span className="badge bg-warning text-dark rounded-pill px-2 py-1" style={{ fontSize: '0.65rem' }}>
                      {pendientesCount} pendiente{pendientesCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <p className="text-secondary small mb-0 text-truncate">
                  Historial de préstamos y estado en tiempo real
                </p>
              </div>
              <FiArrowRight className="text-primary flex-shrink-0" size={18} />
            </Link>
          </div>

          <div className="col-12 col-md-6">
            <Link href="/profesor/perfil" className="mobile-action-card">
              <div className="action-icon-wrap bg-secondary bg-opacity-10 text-secondary">
                <FiUser size={22} />
              </div>
              <div className="flex-grow-1 min-w-0">
                <h2 className="h6 fw-bold text-dark mb-0">Mi Perfil & Seguridad</h2>
                <p className="text-secondary small mb-0 text-truncate">
                  DNI, contacto y cambio de clave
                </p>
              </div>
              <FiArrowRight className="text-secondary flex-shrink-0" size={18} />
            </Link>
          </div>
        </div>

        {/* FEEDBACK NOTICE */}
        {alertNotice && (
          <div
            className={`alert d-flex align-items-center gap-2 mb-3 rounded-3 shadow-sm ${
              alertNotice.type === 'success'
                ? 'alert-success border-success'
                : 'alert-danger border-danger'
            }`}
            role="alert"
          >
            {alertNotice.type === 'success' ? (
              <FiCheckCircle size={20} className="text-success flex-shrink-0" />
            ) : (
              <FiAlertCircle size={20} className="text-danger flex-shrink-0" />
            )}
            <div className="small fw-semibold">{alertNotice.text}</div>
          </div>
        )}

        {/* SOLICITUD RÁPIDA DE ARTÍCULOS */}
        <section className="card border-0 shadow-sm rounded-4 mb-4">
          <div className="card-header bg-white border-bottom p-3 p-md-4">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h2 className="h6 fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                  <span className="rounded-3 d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary" style={{ width: '32px', height: '32px' }}>
                    <FiSend size={16} />
                  </span>
                  Solicitar Artículo de Inventario
                </h2>
                <p className="small text-secondary mb-0">
                  Selecciona el material necesario para tus clases.
                </p>
              </div>
            </div>
          </div>

          <div className="card-body p-3 p-md-4">
            {/* Categorías pill horizontal scroll */}
            <div className="mb-3">
              <label className="inventory-form-label d-flex align-items-center gap-1 mb-2">
                <FiFilter size={12} />
                Filtrar por categoría
              </label>
              <div className="mobile-pill-scroll">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`mobile-filter-pill ${selectedCategory === cat ? 'active' : ''}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Selector de artículo visual */}
            <div className="mb-3">
              <label className="inventory-form-label d-flex align-items-center gap-1 mb-2">
                <FiPackage size={12} />
                Selecciona el equipo o accesorio
              </label>

              {/* Selector desplegable estilizado */}
              <select
                value={selectedItem || ''}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  setSelectedItem(val);
                  setCantidad(1);
                }}
                className="form-select form-select-lg rounded-3 fw-semibold text-dark shadow-none border-slate-300"
                style={{ fontSize: '0.95rem' }}
              >
                <option value="">-- Toca aquí para elegir un artículo --</option>
                {filteredItems.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                    disabled={item.cantidad_disponible <= 0}
                  >
                    {item.nombre} ({item.cantidad_disponible} disponibles) {item.categoria ? `• ${item.categoria}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* DETALLES CUANDO HAY ARTÍCULO SELECCIONADO */}
            {itemSeleccionado && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-3 mb-3 animate__animated animate__fadeIn">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="badge bg-primary text-white text-uppercase" style={{ fontSize: '0.65rem' }}>
                    {itemSeleccionado.categoria}
                  </span>
                  <span className="small fw-bold text-primary">
                    {itemSeleccionado.cantidad_disponible} unidades disponibles
                  </span>
                </div>

                <div className="fw-bold text-dark h6 mb-3">
                  {itemSeleccionado.nombre}
                </div>

                {/* STEPPER DE CANTIDAD TOUCH-FRIENDLY */}
                <div className="d-flex flex-column flex-sm-row sm:align-items-center justify-content-between gap-3 pt-2 border-top border-blue-200">
                  <div>
                    <div className="small fw-bold text-slate-700">Cantidad a solicitar:</div>
                    <div className="small text-slate-500" style={{ fontSize: '0.72rem' }}>
                      Máximo disponible: {maxStock}
                    </div>
                  </div>

                  <div className="mobile-stepper">
                    <button
                      type="button"
                      className="mobile-stepper-btn"
                      onClick={() => setCantidad((prev) => Math.max(1, prev - 1))}
                      disabled={cantidad <= 1}
                      title="Disminuir"
                    >
                      <FiMinus size={14} />
                    </button>

                    <span className="mobile-stepper-val">{cantidad}</span>

                    <button
                      type="button"
                      className="mobile-stepper-btn"
                      onClick={() => setCantidad((prev) => Math.min(maxStock, prev + 1))}
                      disabled={cantidad >= maxStock}
                      title="Aumentar"
                    >
                      <FiPlus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MOTIVO DE SOLICITUD */}
            <div className="mb-3">
              <label className="inventory-form-label d-flex align-items-center gap-1 mb-2">
                <FiTag size={12} />
                Motivo / Justificación
              </label>

              {/* Chips de motivos rápidos */}
              <div className="d-flex flex-wrap gap-1 mb-2">
                {motivosPredefinidos.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setMotivo(preset)}
                    className={`reason-preset-chip ${motivo === preset ? 'active' : ''}`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="form-control rounded-3 border-slate-300"
                placeholder="Escribe el motivo o selecciona una sugerencia arriba..."
                style={{ fontSize: '0.9rem', padding: '0.65rem 0.85rem' }}
              />
            </div>

            {/* BOTÓN ENVIAR */}
            <button
              onClick={handleSolicitar}
              disabled={!selectedItem || loading || enviando}
              className="btn btn-primary w-100 py-2 py-md-3 fw-bold rounded-3 d-flex align-items-center justify-content-center gap-2 shadow-sm"
              style={{ fontSize: '0.95rem' }}
            >
              <FiSend size={18} />
              {enviando ? 'Enviando solicitud...' : 'Enviar Solicitud'}
            </button>
          </div>
        </section>

        {/* FEED DE ÚLTIMAS SOLICITUDES RECIENTES */}
        <section className="card border-0 shadow-sm rounded-4 mb-4">
          <div className="card-header bg-white border-bottom p-3 p-md-4 d-flex align-items-center justify-content-between">
            <h2 className="h6 fw-bold text-dark mb-0 d-flex align-items-center gap-2">
              <span className="rounded-3 d-flex align-items-center justify-content-center bg-slate-100 text-slate-700" style={{ width: '32px', height: '32px' }}>
                <FiClock size={16} />
              </span>
              Mis Solicitudes Recientes
            </h2>

            <Link href="/profesor/solicitudes" className="small fw-bold text-primary text-decoration-none d-flex align-items-center gap-1">
              Ver todas
              <FiArrowRight size={14} />
            </Link>
          </div>

          <div className="card-body p-3">
            {loading ? (
              <div className="text-center py-4 text-secondary">
                <div className="spinner-border spinner-border-sm text-primary mb-2" role="status" />
                <div className="small">Cargando tus solicitudes...</div>
              </div>
            ) : misSolicitudes.length === 0 ? (
              <div className="text-center py-4 text-secondary">
                <FiPackage className="text-slate-300 mb-2" size={32} />
                <p className="small mb-0">Aún no has registrado solicitudes de material.</p>
              </div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {misSolicitudes.slice(0, 3).map((sol) => (
                  <div
                    key={sol.id}
                    className={`mobile-solicitud-card status-${sol.estado}`}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-1">
                      <div className="fw-bold text-dark text-truncate pe-2">
                        {sol.item_nombre || 'Artículo sin especificar'}
                      </div>
                      <span className={`status-badge ${sol.estado}`}>
                        {sol.estado}
                      </span>
                    </div>

                    <div className="d-flex align-items-center justify-content-between text-secondary small" style={{ fontSize: '0.75rem' }}>
                      <div>
                        Cant: <strong className="text-dark">{sol.cantidad_solicitada}</strong> • {sol.motivo || 'Sin motivo'}
                      </div>
                      <div className="text-slate-400">
                        {new Date(sol.fecha_solicitud).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}