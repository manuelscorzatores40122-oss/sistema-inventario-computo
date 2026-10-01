'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import RequestListControls from './RequestListControls';
import { compareRequests } from '@/app/lib/request-order';
import RequestLocationFields, { emptyRequestLocation, formatRequestLocation } from './RequestLocationFields';
import RequestActions from './RequestActions';
import RequestSubmittedNotice from './RequestSubmittedNotice';
import ArticleAutocomplete from './ArticleAutocomplete';
import { useRouter } from 'next/navigation';
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
  seccion?: string | null;
  numero_aula?: string | null;
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
const toLocalDate = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().split('T')[0];
};

export default function ProfesorDashboard({ openArticleRequest = false }: { openArticleRequest?: boolean }) {
  const router = useRouter();
  const [inventario, setInventario] = useState<Item[]>([]);
  const [misSolicitudes, setMisSolicitudes] = useState<Solicitud[]>([]);
  const [visibleRequestCount, setVisibleRequestCount] = useState(2);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showGreeting, setShowGreeting] = useState(true);
  const [hiddenRequests, setHiddenRequests] = useState<number[]>([]);

  useEffect(() => {
    setHiddenRequests([]);
    if (!user?.id) return;
    try {
      const saved = JSON.parse(localStorage.getItem(`hiddenRequests:${user.id}`) || '[]');
      if (Array.isArray(saved)) setHiddenRequests(saved.filter(id => Number.isInteger(id)));
    } catch { /* La vista funciona aunque el almacenamiento no esté disponible. */ }
  }, [user?.id]);

  const visibleRequests = misSolicitudes.filter(sol => sol.estado !== 'cancelada' || !hiddenRequests.includes(sol.id)).sort(compareRequests);
  const hideRequest = (id: number) => {
    const next = Array.from(new Set([...hiddenRequests, id]));
    setHiddenRequests(next);
    try {
      localStorage.setItem(`hiddenRequests:${user.id}`, JSON.stringify(next));
      setAlertNotice({ type: 'success', text: 'Solicitud ocultada del panel. Sigue disponible en tu historial.' });
    } catch {
      setAlertNotice({ type: 'success', text: 'Solicitud ocultada por ahora. Este navegador no permite recordar la ocultación.' });
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setShowGreeting(false), 3000);
    return () => window.clearTimeout(timer);
  }, []);
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [articleSearch, setArticleSearch] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [motivo, setMotivo] = useState('');
  const [requestLocation, setRequestLocation] = useState(emptyRequestLocation);
  const [solicitudType, setSolicitudType] = useState<'equipo' | 'aula'>('equipo');
  const [aulaForm, setAulaForm] = useState({ fecha_reserva: new Date().toISOString().split('T')[0], hora_inicio: '08:00', hora_fin: '10:00' });
  const [alertNotice, setAlertNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(openArticleRequest);
  const [showSubmittedNotice, setShowSubmittedNotice] = useState(false);

  const closeRequestModal = () => {
    setShowRequestModal(false);
    if (openArticleRequest) router.push('/profesor/dashboard');
  };
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [horariosAula, setHorariosAula] = useState<HorarioAula[]>([]);
  const [calendarUpdatedAt, setCalendarUpdatedAt] = useState<Date | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedCalendarDate, setSelectedCalendarDate] = useState('');

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

  useEffect(() => {
    if (!user?.id) return;
    const refresh = () => { void fetchData(user.id); };
    window.addEventListener('teacher-requests-updated', refresh);
    return () => window.removeEventListener('teacher-requests-updated', refresh);
  }, [user?.id]);

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
    return Array.from({ length: Math.ceil((firstWeekday + daysInMonth) / 7) * 7 }, (_, index) => {
      const day = index - firstWeekday + 1;
      return day > 0 && day <= daysInMonth ? new Date(year, month, day) : null;
    });
  }, [calendarMonth]);

  const selectedReservations = useMemo(() => {
    if (!selectedCalendarDate) return [];
    const dayName = DIAS_SEMANA[new Date(`${selectedCalendarDate}T12:00:00`).getDay()];
    return horariosAula.filter((horario) => {
      const date = horario.fecha_reserva?.split('T')[0];
      return ['separado', 'pendiente'].includes(horario.estado)
        && (date ? date === selectedCalendarDate : horario.dia_semana === dayName);
    }).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
  }, [horariosAula, selectedCalendarDate]);

  const createClassroomSchedule = () => {
    setSolicitudType('aula');
    setMotivo('');
    setAlertNotice(null);
    setAulaForm({ fecha_reserva: selectedCalendarDate, hora_inicio: '', hora_fin: '' });
    setShowCalendar(false);
    setShowRequestModal(true);
  };

  const changeCalendarMonth = (offset: number) => {
    const nextMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + offset, 1);
    setCalendarMonth(nextMonth);
    setSelectedCalendarDate('');
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

  const filteredItems = useMemo(() => {
    const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const search = normalize(articleSearch);
    return inventario.filter(item => item.cantidad_disponible > 0 && item.estado === 'disponible' && normalize(item.nombre).includes(search));
  }, [inventario, articleSearch]);

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

    if (solicitudType === 'equipo' && itemSeleccionado && cantidad > itemSeleccionado.cantidad_disponible) {
      setAlertNotice({
        type: 'error',
        text: `Solo hay ${itemSeleccionado.cantidad_disponible} unidad(es) disponible(s).`,
      });
      return;
    }

    if (solicitudType === 'aula') {
      if (!aulaForm.fecha_reserva || !aulaForm.hora_inicio || !aulaForm.hora_fin || aulaForm.hora_inicio >= aulaForm.hora_fin) {
        setAlertNotice({ type: 'error', text: 'Selecciona una fecha y una hora de fin posterior a la hora de inicio.' });
        return;
      }
      if (new Date(`${aulaForm.fecha_reserva}T${aulaForm.hora_inicio}:00`) <= new Date()) {
        setAlertNotice({ type: 'error', text: 'Elige un horario futuro para solicitar el aula.' });
        return;
      }
    }
    if (solicitudType === 'equipo' && !requestLocation.seccion.trim() && !requestLocation.numero_aula.trim()) {
      setAlertNotice({ type: 'error', text: 'Indica la sección o el número de aula donde lo usarás.' });
      return;
    }
    setEnviando(true);
    setAlertNotice(null);

    try {
      const bodyPayload: any = {
        profesor_id: user.id,
        ...(solicitudType === 'equipo' ? requestLocation : {}),
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
        setAlertNotice(null);
        setShowSubmittedNotice(true);

        setSelectedItem(null);
        setArticleSearch('');
        setCantidad(1);
        setMotivo('');
        setRequestLocation(emptyRequestLocation);
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
      {showSubmittedNotice && <RequestSubmittedNotice onAccept={() => setShowSubmittedNotice(false)} />}
      <main className="profesor-dashboard-main container-fluid py-3 py-md-4">
        
        {/* MOBILE HERO BANNER */}
        {showGreeting && <section className="mobile-hero-banner d-none d-md-block mb-3 mb-md-4">
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

        }
        <section className="teacher-app-hero d-md-none" aria-label="Bienvenida">
          <div className="teacher-app-greeting">
            <span className="teacher-app-avatar" aria-hidden="true">{user?.nombre?.charAt(0).toUpperCase() || 'P'}</span>
            <span>Hola, {user?.nombre?.split(' ')[0] || 'profe'}</span>
          </div>
          <h1>Todo listo para<br />tu próxima clase</h1>
          <p>Reserva tu aula y solicita lo que necesitas.</p>
        </section>
        {/* ACCESOS RÁPIDOS MÓVILES */}
        <div className="dashboard-quick-actions row g-2 g-md-3 mb-3 mb-md-4">
          <div className="col-12 col-md-4">
            <Link href="/profesor/perfil" className="mobile-action-card dashboard-action-profile">
              <div className="action-icon-wrap">
                <FiUser size={22} />
              </div>
              <div className="flex-grow-1 min-w-0">
                <h2 className="h6 fw-bold text-dark mb-0">Perfil</h2>
                <p className="mobile-action-description">
                  Actualiza tus datos y contraseña
                </p>
              </div>
              <FiArrowRight className="action-arrow flex-shrink-0" size={18} />
            </Link>
          </div>

          <div className="col-12 col-md-4">
            <button type="button" className="mobile-action-card dashboard-action-classroom w-100 text-start" onClick={() => { setSelectedCalendarDate(''); setShowCalendar(true); }}>
              <div className="action-icon-wrap calendar-action-icon">
                <FiCalendar size={22} />
              </div>
              <div className="flex-grow-1 min-w-0">
                <h2 className="h6 fw-bold text-dark mb-0">Separar aula</h2>
                <p className="mobile-action-description">Elige un horario y reserva el aula de cómputo</p>
              </div>
              <FiArrowRight className="action-arrow flex-shrink-0" size={18} />
            </button>
          </div>

          <div className="col-12 col-md-4">
            <button type="button" className="mobile-action-card dashboard-action-supplies w-100 text-start" onClick={() => { setSolicitudType('equipo'); setAlertNotice(null); setShowRequestModal(true); }}>
              <div className="action-icon-wrap request-action-icon">
                <FiPackage size={22} />
              </div>
              <div className="flex-grow-1 min-w-0">
                <h2 className="h6 fw-bold text-dark mb-0">Solicitar artículos</h2>
                <p className="mobile-action-description">Solicita los equipos y materiales que necesitas</p>
              </div>
              <FiArrowRight className="action-arrow flex-shrink-0" size={18} />
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
            if (event.target === event.currentTarget) closeRequestModal();
          }}>
        <section id="solicitud-aula" className="request-modal-card card border-0 overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="request-modal-title">
          <header className="request-modal-header">
            <div>
              <span>Gestión docente</span>
              <h2 id="request-modal-title">{solicitudType === 'aula' ? 'Solicitar aula' : 'Solicitar artículos'}</h2>
            </div>
            <button type="button" onClick={closeRequestModal} aria-label="Cerrar formulario"><FiX size={20} /></button>
          </header>
          <div className="request-form-body card-body p-3 p-md-4 bg-white">
            <p className="request-form-intro">{solicitudType === 'equipo' ? 'Elige un artículo y cuéntanos para qué lo usarás.' : 'Elige el horario y cuéntanos para qué usarás el aula.'}</p>
            {solicitudType === 'equipo' ? (
              <>
            <div className="request-form-step mb-3">
              <label htmlFor="request-item" className="inventory-form-label request-step-title">
                <span className="request-step-number" aria-hidden="true">1</span>
                ¿Qué artículo necesitas?
              </label>
              <ArticleAutocomplete
                items={filteredItems}
                value={articleSearch}
                selectedId={selectedItem}
                loading={loading}
                onChange={value => {
                  setArticleSearch(value);
                  setSelectedItem(null);
                  setCantidad(1);
                }}
                onSelect={item => {
                  setArticleSearch(item.nombre);
                  setSelectedItem(item.id);
                  setCantidad(1);
                }}
              />
            </div>

            <div className="request-form-step request-quantity-step mb-3">
              <div>
                <h3 className="inventory-form-label request-step-title" id="request-quantity-label">
                  <span className="request-step-number" aria-hidden="true">2</span>
                  ¿Cuántas unidades?
                </h3>
                <p className="request-step-help" id="request-stock" aria-live="polite">
                  {itemSeleccionado ? `${maxStock} disponibles` : 'Primero elige un artículo.'}
                </p>
              </div>
              <div className="mobile-stepper" role="group" aria-labelledby="request-quantity-label" aria-describedby="request-stock">
                <button type="button" className="mobile-stepper-btn"
                  onClick={() => setCantidad((prev) => Math.max(1, prev - 1))}
                  disabled={!itemSeleccionado || cantidad <= 1} aria-label="Disminuir cantidad">
                  <FiMinus size={16} />
                </button>
                <span className="mobile-stepper-val" aria-live="polite">{cantidad}</span>
                <button type="button" className="mobile-stepper-btn"
                  onClick={() => setCantidad((prev) => Math.min(maxStock, prev + 1))}
                  disabled={!itemSeleccionado || cantidad >= maxStock} aria-label="Aumentar cantidad">
                  <FiPlus size={16} />
                </button>
              </div>
            </div>
            </>
            ) : (
              <div className="row g-3 mb-3 animate__animated animate__fadeIn">
                <div className="col-12 col-md-4">
                  <label className="inventory-form-label">Fecha de reserva</label>
                  <input
                    type="date"
                    className="form-control border-slate-300"
                    value={aulaForm.fecha_reserva}
                    min={toLocalDate(new Date())}
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

            {solicitudType === 'equipo' && <RequestLocationFields value={requestLocation} onChange={setRequestLocation} />}
            <div className="request-form-step mb-3">
              <label htmlFor="request-reason" className="inventory-form-label request-step-title">
                {solicitudType === 'equipo' && <span className="request-step-number" aria-hidden="true">3</span>}
                ¿Para qué lo necesitas?
              </label>
              <textarea
                id="request-reason"
                rows={2}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="form-control rounded-3 border-slate-300"
                placeholder="Ej.: Proyectar una presentación en clase"
                style={{ fontSize: '1rem', padding: '0.65rem 0.85rem' }}
              />
              <details className="request-reason-suggestions">
                <summary>Usar un motivo sugerido</summary>
                <div className="request-reason-options d-flex flex-wrap gap-1 mb-2">
                  {motivosPredefinidos.map((preset) => (
                    <button key={preset} type="button" onClick={() => setMotivo(preset)}
                      aria-pressed={motivo === preset}
                      className={`reason-preset-chip ${motivo === preset ? 'active' : ''}`}>
                      {preset}
                    </button>
                  ))}
                </div>
              </details>
            </div>

            {alertNotice?.type === 'error' && <div className="alert alert-danger" role="alert">{alertNotice.text}</div>}
            <div className="request-form-footer">
            {solicitudType === 'equipo' && (
              <p className="request-submit-hint" aria-live="polite">
                {itemSeleccionado ? `${cantidad} ${cantidad === 1 ? 'unidad' : 'unidades'} · ${itemSeleccionado.nombre}` : 'Selecciona un artículo para continuar.'}
              </p>
            )}
            {/* BOTÓN ENVIAR */}
            <button
              onClick={handleSolicitar}
              disabled={loading || enviando || (solicitudType === 'equipo' && !selectedItem)}
              className="request-submit btn btn-primary w-100 py-2 py-md-3 fw-bold rounded-3 d-flex align-items-center justify-content-center gap-2 shadow-sm mt-4"
              style={{ fontSize: '0.95rem' }}
            >
              <FiSend size={18} />
              {enviando ? 'Enviando solicitud...' : 'Enviar solicitud'}
            </button>
            </div>
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
            ) : visibleRequests.length === 0 ? (
              <div className="text-center py-4 text-secondary">
                <FiPackage className="text-slate-300 mb-2" size={32} />
                <p className="small mb-0">No hay solicitudes para mostrar en este panel.</p>
              </div>
            ) : (
              <div className="recent-requests-list">
                {visibleRequests.slice(0, visibleRequestCount).map((sol) => {
                  const isClassroom = sol.item_nombre?.toLowerCase().includes('aula de cómputo');
                  const classroomDetails = isClassroom ? sol.item_nombre?.match(/^(.+?)\s*\((.*)\)$/) : null;
                  const card = (
                    <article key={sol.id} className={`recent-request-item status-${sol.estado}`}>
                      <div className={`recent-request-icon ${isClassroom ? 'classroom' : 'equipment'}`}>
                        {isClassroom ? <FiCalendar size={19} /> : <FiPackage size={19} />}
                      </div>

                      <div className="recent-request-copy">
                        <div className="recent-request-title-row">
                          <h3>{classroomDetails?.[1] || sol.item_nombre || 'Artículo sin especificar'}</h3>
                          <span className={`status-badge ${sol.estado}`}>{sol.estado}</span>
                        </div>
                        {classroomDetails && <p className="recent-request-schedule"><FiCalendar size={13} />{classroomDetails[2]}</p>}
                        <div className="recent-request-meta">
                          <span><FiTag size={12} /> {sol.motivo || 'Sin motivo especificado'}</span>
                          {formatRequestLocation(sol) && <span>{formatRequestLocation(sol)}</span>}
                          {!isClassroom && <span><FiPackage size={12} /> {sol.cantidad_solicitada} {sol.cantidad_solicitada === 1 ? 'unidad' : 'unidades'}</span>}
                          <time dateTime={sol.fecha_solicitud}>
                            <FiClock size={12} />
                            {new Date(sol.fecha_solicitud).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </time>
                        </div>
                      </div>
                    </article>
                  );
                  return ['pendiente', 'cancelada'].includes(sol.estado) ? (
                    <RequestActions key={sol.id} id={sol.id} name={sol.item_nombre || 'Solicitud'} onHide={sol.estado === 'cancelada' ? () => hideRequest(sol.id) : undefined} onCancelled={() => {
                      setMisSolicitudes(current => current.map(item => item.id === sol.id ? { ...item, estado: 'cancelada' } : item));
                      setAlertNotice({ type: 'success', text: 'Solicitud cancelada correctamente.' });
                    }}>{card}</RequestActions>
                  ) : card;
                })}
              </div>
            )}
            {!loading && <RequestListControls total={visibleRequests.length} visible={visibleRequestCount}
              onMore={() => setVisibleRequestCount(count => count + 2)} onLess={() => setVisibleRequestCount(2)} />}
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
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => <span key={day}>{day}</span>)}
              </div>

              <div className="classroom-calendar-days" role="group" aria-label="Días del mes">
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
                      className={`${selected ? 'active' : ''} ${today ? 'is-today' : ''}`}
                      aria-pressed={selected}
                      aria-current={today ? 'date' : undefined}
                      onClick={() => setSelectedCalendarDate(value)}
                      aria-label={`${date.toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })}${reservations ? `, ${reservations} horarios ocupados` : ''}`}
                    >
                      <strong>{date.getDate()}</strong>

                      {reservations > 0 && <i aria-hidden="true" />}
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

              {selectedCalendarDate ? (
                <div className="classroom-calendar-slots">
                  <h3>{new Date(`${selectedCalendarDate}T12:00:00`).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
                  {calendarLoading ? (
                    <p role="status">Actualizando horarios…</p>
                  ) : selectedReservations.length ? selectedReservations.map((reservation) => (
                    <article key={reservation.id} className="classroom-calendar-slot occupied">
                      <span className="slot-time"><FiClock /> {reservation.hora_inicio.slice(0, 5)} – {reservation.hora_fin.slice(0, 5)}</span>
                      <span className="slot-detail">
                        <strong>{[reservation.reservado_por_nombre, reservation.reservado_por_apellido].filter(Boolean).join(' ') || 'Docente asignado'}</strong>
                        <small>{reservation.estado === 'pendiente' ? 'Pendiente de aprobación' : 'Ocupado'}{reservation.motivo_reserva ? ` · ${reservation.motivo_reserva}` : ''}</small>
                      </span>
                    </article>
                  )) : <p className="small text-secondary">No hay reservas registradas para este día.</p>}
                  <button type="button" className="btn btn-primary rounded-pill mt-2" onClick={createClassroomSchedule} disabled={selectedCalendarDate < toLocalDate(new Date())}>
                    <FiPlus /> Crear horario para este día
                  </button>
                  <p className="small text-secondary mb-0">Elige tu hora de inicio y fin. La solicitud será revisada por administración.</p>
                </div>
              ) : <p className="small text-center text-secondary p-3 mb-0">Selecciona un día para ver sus reservas o crear un horario.</p>}

            </section>
          </div>
        )}

      </main>
    </div>
  );
}
