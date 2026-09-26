'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
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
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
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

interface HorarioAula {
  id: number;
  sala_nombre: string;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
  reservado_por_nombre: string | null;
  reservado_por_apellido: string | null;
  motivo_reserva: string | null;
  fecha_reserva: string | null;
}

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const BLOQUES_AULA = [
  { hora_inicio: '08:00', hora_fin: '09:00' },
  { hora_inicio: '09:00', hora_fin: '10:00' },
  { hora_inicio: '10:00', hora_fin: '11:00' },
  { hora_inicio: '11:00', hora_fin: '12:00' },
  { hora_inicio: '12:00', hora_fin: '13:00' },
];

const toLocalDate = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().split('T')[0];
};

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
  const [solicitudType, setSolicitudType] = useState<'equipo' | 'aula'>('equipo');
  const [aulaForm, setAulaForm] = useState({ fecha_reserva: new Date().toISOString().split('T')[0], hora_inicio: '08:00', hora_fin: '10:00' });
  const [alertNotice, setAlertNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [horariosAula, setHorariosAula] = useState<HorarioAula[]>([]);
  const [calendarUpdatedAt, setCalendarUpdatedAt] = useState<Date | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => toLocalDate(new Date()));

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

  const fetchHorariosAula = async () => {
    setCalendarLoading(true);
    try {
      const response = await fetch('/api/disponibilidad');
      if (!response.ok) throw new Error('No se pudo cargar el horario');
      const data = await response.json();
      setHorariosAula(data.disponibilidades || []);
      setCalendarUpdatedAt(new Date());
    } catch (error) {
      console.error('Error al obtener el horario del aula:', error);
      setAlertNotice({ type: 'error', text: 'No se pudo actualizar el calendario del aula.' });
    } finally {
      setCalendarLoading(false);
    }
  };

  useEffect(() => {
    if (!showCalendar) return;
    fetchHorariosAula();
    const interval = setInterval(fetchHorariosAula, 30000);
    return () => clearInterval(interval);
  }, [showCalendar]);

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: 42 }, (_, index) => {
      const day = index - firstWeekday + 1;
      return day > 0 && day <= daysInMonth ? new Date(year, month, day) : null;
    });
  }, [calendarMonth]);

  const calendarBlocks = useMemo(() => {
    const blocks = new Map(BLOQUES_AULA.map((block) => [block.hora_inicio, block]));
    horariosAula.forEach((horario) => {
      blocks.set(horario.hora_inicio.slice(0, 5), {
        hora_inicio: horario.hora_inicio.slice(0, 5),
        hora_fin: horario.hora_fin.slice(0, 5),
      });
    });
    return Array.from(blocks.values()).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
  }, [horariosAula]);

  const selectedDateObject = useMemo(
    () => new Date(`${selectedCalendarDate}T12:00:00`),
    [selectedCalendarDate]
  );

  const selectedDayName = DIAS_SEMANA[selectedDateObject.getDay()];

  const getReservationForBlock = (horaInicio: string, horaFin: string) => horariosAula.find((horario) => {
    const sameDay = horario.dia_semana === selectedDayName;
    const reservationDate = horario.fecha_reserva?.split('T')[0];
    const appliesToDate = reservationDate ? reservationDate === selectedCalendarDate : sameDay;
    const occupied = ['separado', 'pendiente'].includes(horario.estado);
    return appliesToDate && occupied && horario.hora_inicio.slice(0, 5) < horaFin && horario.hora_fin.slice(0, 5) > horaInicio;
  });

  const selectFreeBlock = (horaInicio: string, horaFin: string) => {
    setSolicitudType('aula');
    setAulaForm({ fecha_reserva: selectedCalendarDate, hora_inicio: horaInicio, hora_fin: horaFin });
    setShowCalendar(false);
    setShowRequestModal(true);
  };

  const changeCalendarMonth = (offset: number) => {
    const nextMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + offset, 1);
    setCalendarMonth(nextMonth);
    setSelectedCalendarDate(toLocalDate(nextMonth));
  };

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
  const handleSolicitar = async () => {
    if (solicitudType === 'equipo' && !selectedItem) {
      setAlertNotice({ type: 'error', text: 'Selecciona un artículo antes de continuar.' });
      return;
    }
    if (solicitudType === 'equipo' && cantidad < 1) {
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
      const bodyPayload: any = {
        profesor_id: user.id,
        motivo: motivo.trim() || 'Uso docente en clase',
      };

      if (solicitudType === 'equipo') {
        bodyPayload.inventario_id = selectedItem;
        bodyPayload.cantidad_solicitada = cantidad;
        bodyPayload.tipo_solicitud = 'equipo';
      } else {
        bodyPayload.tipo_solicitud = 'aula';
        bodyPayload.fecha_reserva = aulaForm.fecha_reserva;
        bodyPayload.hora_inicio = aulaForm.hora_inicio;
        bodyPayload.hora_fin = aulaForm.hora_fin;
      }

      const response = await fetch('/api/solicitudes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyPayload),
      });

      if (response.ok) {
        setAlertNotice({
          type: 'success',
          text: '¡Solicitud registrada con éxito! Administración la evaluará a la brevedad.',
        });

        setSelectedItem(null);
        setCantidad(1);
        setMotivo('');
        setAulaForm({ fecha_reserva: new Date().toISOString().split('T')[0], hora_inicio: '08:00', hora_fin: '10:00' });
        setShowRequestModal(false);

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
      <main className="profesor-dashboard-main container-fluid py-3 py-md-4">
        
        {/* MOBILE HERO BANNER */}
        <section className="mobile-hero-banner mb-3 mb-md-4">
          <div className="mobile-hero-content">
            <div className="mobile-hero-copy">
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="mobile-hero-badge">
                  <FiStar className="me-1" size={11} />
                  Docente activo
                </span>
                {user?.area && (
                  <span className="mobile-hero-area">
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

            <div className="mobile-hero-avatar" aria-label="Avatar del profesor">
              {user?.nombre ? user.nombre.charAt(0).toUpperCase() : 'P'}
            </div>
          </div>
        </section>

        {/* ACCESOS RÁPIDOS MÓVILES */}
        <div className="row g-2 g-md-3 mb-3 mb-md-4">
          <div className="col-12 col-md-4">
            <Link href="/profesor/perfil" className="mobile-action-card">
              <div className="action-icon-wrap bg-secondary bg-opacity-10 text-secondary">
                <FiUser size={22} />
              </div>
              <div className="flex-grow-1 min-w-0">
                <h2 className="h6 fw-bold text-dark mb-0">Mi Perfil & Seguridad</h2>
                <p className="mobile-action-description">
                  DNI, contacto y cambio de clave
                </p>
              </div>
              <FiArrowRight className="text-secondary flex-shrink-0" size={18} />
            </Link>
          </div>

          <div className="col-12 col-md-4">
            <button type="button" className="mobile-action-card w-100 text-start" onClick={() => setShowCalendar(true)}>
              <div className="action-icon-wrap calendar-action-icon">
                <FiCalendar size={22} />
              </div>
              <div className="flex-grow-1 min-w-0">
                <h2 className="h6 fw-bold text-dark mb-0">Calendario del Aula</h2>
                <p className="mobile-action-description">Consulta horarios libres y separa un turno</p>
              </div>
              <FiArrowRight className="text-primary flex-shrink-0" size={18} />
            </button>
          </div>

          <div className="col-12 col-md-4">
            <button type="button" className="mobile-action-card w-100 text-start" onClick={() => setShowRequestModal(true)}>
              <div className="action-icon-wrap request-action-icon">
                <FiSend size={22} />
              </div>
              <div className="flex-grow-1 min-w-0">
                <h2 className="h6 fw-bold text-dark mb-0">Nueva Solicitud</h2>
                <p className="mobile-action-description">Solicita equipos o separa el aula</p>
              </div>
              <FiArrowRight className="text-primary flex-shrink-0" size={18} />
            </button>
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

        {/* SOLICITUD DE ARTÍCULOS O AULAS */}
        {showRequestModal && (
          <div className="request-modal-layer" role="presentation" onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowRequestModal(false);
          }}>
        <section id="solicitud-aula" className="request-modal-card card border-0 overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="request-modal-title">
          <header className="request-modal-header">
            <div>
              <span>Gestión docente</span>
              <h2 id="request-modal-title">Nueva solicitud</h2>
            </div>
            <button type="button" onClick={() => setShowRequestModal(false)} aria-label="Cerrar formulario"><FiX size={20} /></button>
          </header>
          <div className="d-flex w-100">
            <button
              className={`flex-fill py-3 fw-bold border-0 ${solicitudType === 'equipo' ? 'bg-white text-primary border-bottom border-primary border-3' : 'bg-light text-secondary'}`}
              onClick={() => setSolicitudType('equipo')}
            >
              <FiPackage className="me-2" /> Solicitar Equipo
            </button>
            <button
              className={`flex-fill py-3 fw-bold border-0 ${solicitudType === 'aula' ? 'bg-white text-primary border-bottom border-primary border-3' : 'bg-light text-secondary'}`}
              onClick={() => setSolicitudType('aula')}
            >
              <FiClock className="me-2" /> Solicitar Aula
            </button>
          </div>

          <div className="card-body p-3 p-md-4 bg-white">
            {solicitudType === 'equipo' ? (
              <>
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
            </>
            ) : (
              <div className="row g-3 mb-3 animate__animated animate__fadeIn">
                <div className="col-12 col-md-4">
                  <label className="inventory-form-label">Fecha de reserva</label>
                  <input
                    type="date"
                    className="form-control border-slate-300"
                    value={aulaForm.fecha_reserva}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setAulaForm({ ...aulaForm, fecha_reserva: e.target.value })}
                    required
                  />
                </div>
                <div className="col-6 col-md-4">
                  <label className="inventory-form-label">Hora inicio</label>
                  <input
                    type="time"
                    className="form-control border-slate-300"
                    value={aulaForm.hora_inicio}
                    onChange={(e) => setAulaForm({ ...aulaForm, hora_inicio: e.target.value })}
                  />
                </div>
                <div className="col-6 col-md-4">
                  <label className="inventory-form-label">Hora fin</label>
                  <input
                    type="time"
                    className="form-control border-slate-300"
                    value={aulaForm.hora_fin}
                    onChange={(e) => setAulaForm({ ...aulaForm, hora_fin: e.target.value })}
                  />
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
              disabled={loading || enviando || (solicitudType === 'equipo' && !selectedItem)}
              className="btn btn-primary w-100 py-2 py-md-3 fw-bold rounded-3 d-flex align-items-center justify-content-center gap-2 shadow-sm mt-4"
              style={{ fontSize: '0.95rem' }}
            >
              <FiSend size={18} />
              {enviando ? 'Enviando solicitud...' : 'Enviar Solicitud'}
            </button>
          </div>
        </section>
          </div>
        )}

        {/* FEED DE ÚLTIMAS SOLICITUDES RECIENTES */}
        <section className="recent-requests-panel card border-0 mb-4">
          <div className="recent-requests-header">
            <div>
              <span className="recent-requests-eyebrow">Actividad reciente</span>
              <h2>Mis solicitudes</h2>
            </div>

            <Link href="/profesor/solicitudes" className="recent-requests-link">
              Ver historial
              <FiArrowRight size={15} />
            </Link>
          </div>

          <div className="recent-requests-body">
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
              <div className="recent-requests-list">
                {misSolicitudes.slice(0, 3).map((sol) => {
                  const isClassroom = sol.item_nombre?.toLowerCase().includes('aula de cómputo');
                  return (
                    <article key={sol.id} className={`recent-request-item status-${sol.estado}`}>
                      <div className={`recent-request-icon ${isClassroom ? 'classroom' : 'equipment'}`}>
                        {isClassroom ? <FiCalendar size={19} /> : <FiPackage size={19} />}
                      </div>

                      <div className="recent-request-copy">
                        <div className="recent-request-title-row">
                          <h3>{sol.item_nombre || 'Artículo sin especificar'}</h3>
                          <span className={`status-badge ${sol.estado}`}>{sol.estado}</span>
                        </div>
                        <div className="recent-request-meta">
                          <span><FiTag size={12} /> {sol.motivo || 'Sin motivo especificado'}</span>
                          <span><FiPackage size={12} /> {sol.cantidad_solicitada} {sol.cantidad_solicitada === 1 ? 'unidad' : 'unidades'}</span>
                          <time dateTime={sol.fecha_solicitud}>
                            <FiClock size={12} />
                            {new Date(sol.fecha_solicitud).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </time>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {showCalendar && (
          <div className="classroom-calendar-layer" role="presentation" onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowCalendar(false);
          }}>
            <section className="classroom-calendar-card" role="dialog" aria-modal="true" aria-labelledby="calendar-title">
              <header className="classroom-calendar-header">
                <div>
                  <span className="classroom-calendar-eyebrow">Sala de cómputo</span>
                  <h2 id="calendar-title">Calendario de horarios</h2>
                </div>
                <button type="button" className="classroom-calendar-close" onClick={() => setShowCalendar(false)} aria-label="Cerrar calendario">
                  <FiX size={20} />
                </button>
              </header>

              <div className="classroom-calendar-month-heading">
                <button type="button" onClick={() => changeCalendarMonth(-1)} aria-label="Mes anterior"><FiChevronLeft /></button>
                <strong>{calendarMonth.toLocaleDateString('es-PE', { month: 'long' })}</strong>
                <span>{calendarMonth.getFullYear()}</span>
                <button type="button" onClick={() => changeCalendarMonth(1)} aria-label="Mes siguiente"><FiChevronRight /></button>
              </div>

              <div className="classroom-calendar-weekdays" aria-hidden="true">
                {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((day) => <span key={day}>{day}</span>)}
              </div>

              <div className="classroom-calendar-days" role="grid" aria-label="Días del mes">
                {calendarDays.map((date, index) => {
                  if (!date) return <span className="classroom-calendar-empty" key={`empty-${index}`} />;
                  const value = toLocalDate(date);
                  const selected = value === selectedCalendarDate;
                  const today = value === toLocalDate(new Date());
                  const reservations = horariosAula.filter((horario) => {
                    const reservationDate = horario.fecha_reserva?.split('T')[0];
                    return ['separado', 'pendiente'].includes(horario.estado)
                      && (reservationDate ? reservationDate === value : horario.dia_semana === DIAS_SEMANA[date.getDay()]);
                  }).length;
                  return (
                    <button
                      key={value}
                      type="button"
                      className={selected ? 'active' : ''}
                      onClick={() => setSelectedCalendarDate(value)}
                      role="gridcell"
                      aria-label={`${date.toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })}${reservations ? `, ${reservations} horarios ocupados` : ''}`}
                    >
                      <strong>{date.getDate()}</strong>
                      {today && <small>Hoy</small>}
                      {reservations > 0 && <i>{reservations}</i>}
                    </button>
                  );
                })}
              </div>

              <div className="classroom-calendar-status">
                <span><i className="available" /> Disponible</span>
                <span><i className="occupied" /> Ocupado</span>
                <button type="button" onClick={fetchHorariosAula} disabled={calendarLoading}>
                  <FiRefreshCw className={calendarLoading ? 'calendar-spin' : ''} />
                  {calendarUpdatedAt ? `Actualizado ${calendarUpdatedAt.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}` : 'Actualizar'}
                </button>
              </div>

              <div className="classroom-calendar-slots">
                <h3>{selectedDateObject.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
                {calendarLoading && horariosAula.length === 0 ? (
                  <div className="classroom-calendar-loading"><span className="spinner-border spinner-border-sm" /> Cargando horarios...</div>
                ) : calendarBlocks.map((block) => {
                  const reservation = getReservationForBlock(block.hora_inicio, block.hora_fin);
                  const past = new Date(`${selectedCalendarDate}T${block.hora_fin}:00`) < new Date();
                  return (
                    <button
                      key={block.hora_inicio}
                      type="button"
                      className={`classroom-calendar-slot ${reservation ? 'occupied' : 'available'}`}
                      disabled={Boolean(reservation) || past}
                      onClick={() => selectFreeBlock(block.hora_inicio, block.hora_fin)}
                    >
                      <span className="slot-time"><FiClock /> {block.hora_inicio} - {block.hora_fin}</span>
                      {reservation ? (
                        <span className="slot-detail">
                          <strong>{reservation.reservado_por_nombre} {reservation.reservado_por_apellido}</strong>
                          <small>{reservation.motivo_reserva || 'Aula separada'}</small>
                        </span>
                      ) : (
                        <span className="slot-detail">
                          <strong>{past ? 'Turno finalizado' : 'Disponible'}</strong>
                          <small>{past ? 'Selecciona otro horario' : 'Toca para solicitar el aula'}</small>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        )}

      </main>
    </div>
  );
}
