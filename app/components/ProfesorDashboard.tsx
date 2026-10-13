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
  FiSearch,
  FiArrowLeft,
  FiCheck,
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
  const [misPrestamosVencidos, setMisPrestamosVencidos] = useState<{ id: number; item_nombre: string; cantidad: number; fecha_prestamo: string }[]>([]);
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
  const [requestStep, setRequestStep] = useState(1);
  const [equipoCategory, setEquipoCategory] = useState('Todos');
  const [aulaForm, setAulaForm] = useState({ fecha_reserva: new Date().toISOString().split('T')[0], hora_inicio: '08:00', hora_fin: '10:00' });
  const [alertNotice, setAlertNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(openArticleRequest);
  const [showSubmittedNotice, setShowSubmittedNotice] = useState(false);

  const closeRequestModal = () => {
    setShowRequestModal(false);
    setRequestStep(1);
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
        const [solRes, prestRes] = await Promise.all([
          fetch(`/api/solicitudes?profesor_id=${profId}`),
          fetch(`/api/prestamos?profesor_id=${profId}`)
        ]);
        if (solRes.ok) {
          const solData = await solRes.json();
          setMisSolicitudes(solData.solicitudes || []);
        }
        if (prestRes.ok) {
          const prestData = await prestRes.json();
          const prestamos = prestData.prestamos || [];
          const now = new Date();
          const vencidos = prestamos.filter((p: any) => {
            if (p.estado !== 'prestado') return false;
            const loanDate = new Date(p.fecha_prestamo);
            const diffHours = (now.getTime() - loanDate.getTime()) / (1000 * 60 * 60);
            const isPreviousDay = loanDate.toDateString() !== now.toDateString() && loanDate < now;
            return diffHours >= 24 || isPreviousDay;
          });
          setMisPrestamosVencidos(vencidos);
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
    return inventario.filter(item => 
      item.cantidad_disponible > 0 && 
      item.estado === 'disponible' && 
      normalize(item.nombre).includes(search) &&
      (equipoCategory === 'Todos' || (item.categoria && item.categoria.toLowerCase() === equipoCategory.toLowerCase()))
    );
  }, [inventario, articleSearch, equipoCategory]);

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
        setRequestStep(1);
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
        {/* ALERTA DE PRÉSTAMOS VENCIDOS / EQUIPOS NO DEVUELTOS */}
        {misPrestamosVencidos.length > 0 && (
          <div className="alert alert-danger shadow-sm border-danger rounded-3 p-3 mb-4 d-flex align-items-center justify-content-between flex-wrap gap-3" style={{ background: '#fff5f5' }}>
            <div className="d-flex align-items-center gap-3">
              <div className="bg-danger text-white p-2 rounded-circle d-inline-flex align-items-center justify-content-center shadow-sm">
                <FiAlertCircle size={22} />
              </div>
              <div>
                <h6 className="fw-bold mb-1 text-danger">
                  Préstamo Vencido / Equipo No Devuelto
                </h6>
                <p className="small mb-0 text-slate-700">
                  Tienes {misPrestamosVencidos.length === 1 ? '1 equipo pendiente' : `${misPrestamosVencidos.length} equipos pendientes`} de devolución: {misPrestamosVencidos.map(p => `${(p.item_nombre || 'Equipo').replace(/\s*\([^)]*\)/g, '').trim()} (x${p.cantidad})`).join(', ')}. Por favor entrégalos a la brevedad en el Centro de Cómputo.
                </p>
              </div>
            </div>
            <button className="btn btn-sm btn-danger text-white font-semibold d-inline-flex align-items-center gap-1 px-3 py-2 rounded-2 shadow-sm" onClick={() => router.push('/profesor/solicitudes?tab=prestamos')}>
              Ver mis préstamos
            </button>
          </div>
        )}

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
            <Link href="/profesor/horario" className="mobile-action-card dashboard-action-classroom text-decoration-none">
              <div className="action-icon-wrap calendar-action-icon">
                <FiCalendar size={22} />
              </div>
              <div className="flex-grow-1 min-w-0">
                <h2 className="h6 fw-bold text-dark mb-0">Horario del aula</h2>
                <p className="mobile-action-description">Ver disponibilidad semanal y separar turno</p>
              </div>
              <FiArrowRight className="action-arrow flex-shrink-0" size={18} />
            </Link>
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
          <div className="request-modal-layer d-flex align-items-end align-items-md-center justify-content-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)', position: 'fixed', inset: 0, zIndex: 1050, padding: 0 }} role="presentation" onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeRequestModal();
          }}>
        <section id="solicitud-aula" className="profesor-request-card card border-0 overflow-hidden shadow-lg w-100 mx-auto" style={{ maxWidth: '450px', height: '90vh', maxHeight: '850px', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, display: 'flex', flexDirection: 'column' }} role="dialog" aria-modal="true" aria-labelledby="request-modal-title">
          <header className="profesor-request-header text-white px-3 py-3 d-flex align-items-center" style={{ background: '#028271' }}>
            <button type="button" onClick={closeRequestModal} className="btn text-white p-2 border-0 bg-transparent rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: 'rgba(255,255,255,0.15)' }} aria-label="Atrás"><FiArrowLeft size={22} /></button>
            <h2 id="request-modal-title" className="m-0 ms-3 fw-semibold" style={{ fontSize: '1.1rem' }}>{solicitudType === 'aula' ? 'Reservar aula' : 'Solicitar equipo'}</h2>
          </header>
          
          <div className="bg-white flex-grow-1 overflow-auto d-flex flex-column">
            {solicitudType === 'equipo' && (
              <div className="profesor-stepper px-4 pt-4 pb-2 bg-white">
                <div className="position-relative d-flex justify-content-between">
                  <div className="position-absolute top-50 start-0 w-100 translate-middle-y" style={{ height: '3px', backgroundColor: '#e2e8f0', zIndex: 1 }}>
                    <div style={{ height: '100%', backgroundColor: '#028271', width: `${((requestStep - 1) / 3) * 100}%`, transition: 'width 0.3s ease' }}></div>
                  </div>
                  {[
                    { num: 1, label: 'Equipo' },
                    { num: 2, label: 'Cantidad' },
                    { num: 3, label: 'Detalles' },
                    { num: 4, label: 'Confirmar' }
                  ].map(step => {
                    const isActive = requestStep >= step.num;
                    return (
                      <div key={step.num} className="d-flex flex-column align-items-center position-relative" style={{ zIndex: 2, width: '60px' }}>
                        <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm mb-2" style={{ width: '32px', height: '32px', fontSize: '0.85rem', backgroundColor: isActive ? '#028271' : '#f1f5f9', color: isActive ? '#fff' : '#94a3b8', transition: 'all 0.3s ease', border: isActive ? 'none' : '1px solid #cbd5e1' }}>
                          {step.num}
                        </div>
                        <span style={{ fontSize: '0.65rem', fontWeight: isActive ? 700 : 500, color: isActive ? '#0f172a' : '#94a3b8' }}>{step.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="request-form-body p-4 d-flex flex-column flex-grow-1">
            {solicitudType === 'equipo' ? (
              <>
                {requestStep === 1 && (
                  <div className="step-content animate__animated animate__fadeIn">
                    <h3 className="fw-bold mb-3 text-dark" style={{ fontSize: '1.25rem', letterSpacing: '-0.5px' }}>1. ¿Qué artículo necesitas?</h3>
                    <div className="search-bar mb-3 position-relative">
                      <FiSearch className="position-absolute text-slate-400" style={{ left: '16px', top: '14px' }} size={18} />
                      <input 
                        type="text" 
                        className="form-control rounded-pill border-slate-300 shadow-sm"
                        placeholder="Buscar equipo (ej. proyector, laptop...)"
                        value={articleSearch}
                        onChange={(e) => setArticleSearch(e.target.value)}
                        style={{ paddingLeft: '44px', height: '48px', fontSize: '0.95rem' }}
                      />
                    </div>
                    
                    <div className="category-pills d-flex gap-2 overflow-auto pb-2 mb-3 no-scrollbar" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
                       {['Todos', 'Proyectores', 'Laptops', 'Audio'].map(cat => (
                         <button 
                           key={cat} 
                           type="button" 
                           onClick={() => setEquipoCategory(cat)}
                           className={`btn rounded-pill px-3 py-1 ${equipoCategory === cat ? 'text-white' : 'text-slate-600 bg-white border-slate-200'}`}
                           style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', fontWeight: equipoCategory === cat ? 600 : 500, backgroundColor: equipoCategory === cat ? '#028271' : 'transparent', border: equipoCategory === cat ? 'none' : '1px solid #e2e8f0' }}
                         >
                           {cat}
                         </button>
                       ))}
                    </div>

                    <div className="equipment-list d-flex flex-column gap-3 mb-4">
                      {filteredItems.map(item => {
                        const isSelected = selectedItem === item.id;
                        return (
                          <div 
                            key={item.id} 
                            onClick={() => { setSelectedItem(item.id); setCantidad(1); setRequestStep(2); }}
                            className={`equipment-card p-3 d-flex align-items-center gap-3 rounded-4 border shadow-sm ${isSelected ? 'bg-orange-50' : 'bg-white'}`}
                            style={{ cursor: 'pointer', transition: 'all 0.2s', borderColor: isSelected ? '#ea580c' : '#e2e8f0' }}
                          >
                             <div className="equipment-img bg-white rounded-3 d-flex align-items-center justify-content-center overflow-hidden flex-shrink-0" style={{ width: '60px', height: '60px' }}>
                               {(item as any).imagen_url ? <img src={(item as any).imagen_url} alt={item.nombre} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <FiPackage size={28} className="text-slate-300" />}
                             </div>
                             <div className="flex-grow-1">
                               <h4 className="mb-1 text-dark fw-bold" style={{ fontSize: '0.95rem', letterSpacing: '-0.3px' }}>{item.nombre}</h4>
                               <span className="badge rounded-pill fw-semibold px-2 py-1" style={{ fontSize: '0.7rem', backgroundColor: '#dcfce7', color: '#15803d' }}>
                                 {item.cantidad_disponible} disponibles
                               </span>
                             </div>
                             <div className="pe-1 flex-shrink-0">
                               {isSelected ? <div className="rounded-circle d-flex align-items-center justify-content-center text-white" style={{ width: '24px', height: '24px', backgroundColor: '#ea580c' }}><FiCheck size={14} /></div> : <FiChevronRight className="text-slate-400" size={20} />}
                             </div>
                          </div>
                        );
                      })}
                      {filteredItems.length === 0 && (
                        <div className="text-center py-5 text-slate-400">
                          <FiPackage size={32} className="mb-2 opacity-50" />
                          <p>No hay equipos disponibles con esos filtros.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {requestStep === 2 && (
                  <div className="step-content animate__animated animate__fadeIn flex-grow-1 d-flex flex-column">
                    <h3 className="fw-bold mb-4 text-dark" style={{ fontSize: '1.25rem', letterSpacing: '-0.5px' }}>2. ¿Cuántas unidades?</h3>
                    <div className="d-flex flex-column align-items-center justify-content-center py-5 mb-4 bg-slate-50 rounded-4 border border-slate-100">
                      <div className="mobile-stepper d-flex align-items-center bg-white rounded-pill border border-slate-200 p-2 shadow-sm mb-3">
                        <button type="button" className="btn rounded-circle text-slate-500 d-flex align-items-center justify-content-center border-0" style={{ width: '48px', height: '48px', background: '#f8fafc' }}
                          onClick={() => setCantidad((prev) => Math.max(1, prev - 1))} disabled={cantidad <= 1}>
                          <FiMinus size={22} />
                        </button>
                        <span className="fw-bold text-dark px-4" style={{ minWidth: '80px', textAlign: 'center', fontSize: '1.5rem' }}>{cantidad}</span>
                        <button type="button" className="btn rounded-circle text-slate-500 d-flex align-items-center justify-content-center border-0" style={{ width: '48px', height: '48px', background: '#f8fafc' }}
                          onClick={() => setCantidad((prev) => Math.min(maxStock, prev + 1))} disabled={cantidad >= maxStock}>
                          <FiPlus size={22} />
                        </button>
                      </div>
                      <p className="text-slate-500 fw-medium m-0">{maxStock} disponibles en total</p>
                    </div>
                    <div className="mt-auto">
                      <button type="button" className="btn text-slate-500 w-100 mb-2 py-2 fw-medium" onClick={() => setRequestStep(1)}>Volver</button>
                    </div>
                  </div>
                )}

                {requestStep === 3 && (
                  <div className="step-content animate__animated animate__fadeIn flex-grow-1 d-flex flex-column">
                    <h3 className="fw-bold mb-3 text-dark" style={{ fontSize: '1.25rem', letterSpacing: '-0.5px' }}>3. ¿Dónde lo usarás?</h3>
                    <p className="text-slate-500 small mb-3">Completa la sección o el número de aula.</p>
                    <div className="bg-slate-50 p-3 rounded-4 border border-slate-100 mb-4">
                      <RequestLocationFields value={requestLocation} onChange={setRequestLocation} />
                    </div>
                    
                    <h3 className="fw-bold mb-3 mt-2 text-dark" style={{ fontSize: '1.25rem', letterSpacing: '-0.5px' }}>¿Para qué lo necesitas?</h3>
                    <textarea
                      id="request-reason"
                      rows={3}
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      className="form-control rounded-4 border-slate-300 shadow-sm mb-2"
                      placeholder="Ej.: Proyectar una presentación en clase"
                      style={{ fontSize: '0.95rem', padding: '1rem' }}
                    />
                    <details className="request-reason-suggestions">
                      <summary className="text-slate-500 fw-medium d-flex align-items-center gap-1" style={{ fontSize: '0.85rem' }}><FiChevronRight /> Usar un motivo sugerido</summary>
                      <div className="request-reason-options d-flex flex-wrap gap-2 mt-2 pb-2">
                        {motivosPredefinidos.map((preset) => (
                          <button key={preset} type="button" onClick={() => setMotivo(preset)}
                            className={`btn btn-sm rounded-pill border ${motivo === preset ? 'bg-orange-50 border-orange text-orange-700 fw-semibold' : 'bg-white border-slate-200 text-slate-600'}`}>
                            {preset}
                          </button>
                        ))}
                      </div>
                    </details>
                    <div className="mt-auto pt-3">
                      <button type="button" className="btn text-slate-500 w-100 mb-2 py-2 fw-medium" onClick={() => setRequestStep(2)}>Volver</button>
                    </div>
                  </div>
                )}
                
                {requestStep === 4 && (
                  <div className="step-content animate__animated animate__fadeIn flex-grow-1 d-flex flex-column">
                     <h3 className="fw-bold mb-4 text-dark" style={{ fontSize: '1.25rem', letterSpacing: '-0.5px' }}>4. Confirmar solicitud</h3>
                     <div className="bg-slate-50 rounded-4 p-4 border border-slate-100 mb-4">
                        <div className="d-flex align-items-center gap-3 mb-4 pb-3 border-bottom border-slate-200">
                             <div className="equipment-img bg-white border border-slate-200 rounded-3 d-flex align-items-center justify-content-center overflow-hidden flex-shrink-0" style={{ width: '64px', height: '64px' }}>
                               {(itemSeleccionado as any)?.imagen_url ? <img src={(itemSeleccionado as any).imagen_url} alt="img" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <FiPackage size={24} className="text-slate-300" />}
                             </div>
                             <div>
                               <h4 className="fw-bold text-dark mb-1 h5">{itemSeleccionado ? inventario.find(i => i.id === selectedItem)?.nombre : ''}</h4>
                               <span className="text-orange-600 fw-semibold">{cantidad} {cantidad === 1 ? 'unidad' : 'unidades'}</span>
                             </div>
                        </div>
                        <div className="mb-3">
                           <small className="d-block text-slate-500 fw-medium mb-1">Destino</small>
                           <strong className="text-dark">{formatRequestLocation({ seccion: requestLocation.seccion, numero_aula: requestLocation.numero_aula } as any) || 'No especificado'}</strong>
                        </div>
                        <div>
                           <small className="d-block text-slate-500 fw-medium mb-1">Motivo</small>
                           <strong className="text-dark">{motivo || 'Uso docente en clase'}</strong>
                        </div>
                     </div>
                     <div className="mt-auto">
                      <button type="button" className="btn text-slate-500 w-100 mb-2 py-2 fw-medium" onClick={() => setRequestStep(3)}>Volver</button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="row g-3 mb-3 animate__animated animate__fadeIn">
                <p className="text-slate-500 mb-2">Elige el horario y cuéntanos para qué usarás el aula.</p>
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

            {alertNotice?.type === 'error' && <div className="alert alert-danger mt-3" role="alert">{alertNotice.text}</div>}
            </div>

            {/* BOTONES DE NAVEGACIÓN PASOS */}
            <div className="request-form-footer p-3 bg-white mt-auto border-top border-slate-100 shadow-sm" style={{ zIndex: 10 }}>
              {solicitudType === 'equipo' ? (
                requestStep < 4 ? (
                  <button 
                    type="button" 
                    className="btn btn-primary w-100 py-3 rounded-pill fw-bold text-white shadow-sm d-flex justify-content-center gap-2 align-items-center border-0"
                    style={{ backgroundColor: '#ea580c', fontSize: '1rem', display: requestStep === 1 ? 'none' : 'flex' }}
                    onClick={() => {
                      if (requestStep === 3) {
                         if (!requestLocation.seccion.trim() && !requestLocation.numero_aula.trim()) {
                            setAlertNotice({ type: 'error', text: 'Indica la sección o el número de aula.' });
                            return;
                         }
                         setAlertNotice(null);
                      }
                      setRequestStep(s => s + 1);
                    }}
                    disabled={requestStep === 1 && !selectedItem}
                  >
                    Siguiente <FiChevronRight size={18} />
                  </button>
                ) : (
                  <button
                    onClick={handleSolicitar}
                    disabled={loading || enviando}
                    className="btn btn-primary w-100 py-3 rounded-pill fw-bold text-white shadow-sm d-flex align-items-center justify-content-center gap-2 border-0"
                    style={{ backgroundColor: '#ea580c', fontSize: '1rem' }}
                  >
                    <FiSend size={18} />
                    {enviando ? 'Enviando solicitud...' : 'Enviar solicitud'}
                  </button>
                )
              ) : (
                <button
                  onClick={handleSolicitar}
                  disabled={loading || enviando}
                  className="request-submit btn btn-primary w-100 py-3 fw-bold rounded-pill shadow-sm border-0"
                  style={{ backgroundColor: '#028271', fontSize: '1rem' }}
                >
                  <FiSend size={18} /> {enviando ? 'Enviando...' : 'Reservar aula'}
                </button>
              )}
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
