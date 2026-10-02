'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FiCalendar,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiUser,
  FiChevronLeft,
  FiChevronRight,
  FiSend,
  FiBookOpen,
  FiX,
  FiPlus,
  FiArrowLeft,
} from 'react-icons/fi';

type Clase = {
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
  fecha_reserva?: string | null;
};

type Message = { type: 'success' | 'error'; text: string } | null;
type Bloque = { hora_inicio: string; hora_fin: string };

const SALA_HORARIO = 'Horario de Clases';
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const TEMPLATE_KEY = 'horarioTemplate';

const FORMATO_DEFECTO: Bloque[] = [
  { hora_inicio: '09:00', hora_fin: '10:00' },
  { hora_inicio: '10:00', hora_fin: '11:00' },
  { hora_inicio: '11:00', hora_fin: '12:00' },
  { hora_inicio: '12:00', hora_fin: '13:00' },
];

const weekStartOf = (date: Date) => {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

export default function ProfesorHorarioView() {
  const [user, setUser] = useState<any>(null);
  const [clases, setClases] = useState<Clase[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Message>(null);
  const [template, setTemplate] = useState<Bloque[]>(FORMATO_DEFECTO);

  const [weekStart, setWeekStart] = useState<Date>(() => weekStartOf(new Date()));
  const [autoFollow, setAutoFollow] = useState(true);
  const [now, setNow] = useState<Date>(() => new Date());

  // Modal para solicitar reserva de aula en un turno libre
  const [requestSlot, setRequestSlot] = useState<{
    date: Date;
    diaNombre: string;
    hora_inicio: string;
    hora_fin: string;
    dateStr: string;
  } | null>(null);

  const [motivo, setMotivo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      try {
        const u = JSON.parse(rawUser);
        setUser(u);
        if (u.area) setMotivo(u.area);
      } catch (e) {}
    }

    try {
      const rawTpl = localStorage.getItem(TEMPLATE_KEY);
      if (rawTpl) {
        const parsed = JSON.parse(rawTpl);
        if (Array.isArray(parsed) && parsed.length) {
          setTemplate(parsed.map((b: Bloque) => ({ hora_inicio: b.hora_inicio, hora_fin: b.hora_fin })));
        }
      }
    } catch (e) {}

    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/disponibilidad');
      if (res.ok) {
        const data = await res.json();
        setClases(data.disponibilidades || []);
      }
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: 'Error al cargar el horario' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const current = new Date();
      setNow(current);
      setWeekStart((prev) => {
        const monday = weekStartOf(current);
        const diff = Math.round((monday.getTime() - prev.getTime()) / 86400000);
        if (autoFollow && diff > 0) return monday;
        return prev;
      });
    }, 30000);
    return () => clearInterval(timer);
  }, [autoFollow]);

  const year = weekStart.getFullYear();
  const month = weekStart.getMonth();
  const today = now;
  const weekDates = useMemo(() => Array.from({ length: 6 }, (_, i) => new Date(year, month, weekStart.getDate() + i)), [year, month, weekStart]);

  const claseMap = useMemo(() => {
    const map = new Map<string, Clase>();
    // Horario base
    clases.forEach((c) => {
      if (!c.fecha_reserva && c.sala_nombre === SALA_HORARIO) {
        map.set(`${c.dia_semana}|${c.hora_inicio}`, c);
      }
    });
    // Superponer reservas especificas de la semana
    clases.forEach((c) => {
      if (c.fecha_reserva && (c.estado === 'separado' || c.estado === 'pendiente')) {
        const dateStr = c.fecha_reserva.split('T')[0];
        const isInWeek = weekDates.some((d) => {
          const tzoffset = d.getTimezoneOffset() * 60000;
          const localISOTime = new Date(d.getTime() - tzoffset).toISOString().split('T')[0];
          return localISOTime === dateStr;
        });
        if (isInWeek) {
          map.set(`${c.dia_semana}|${c.hora_inicio}`, c);
        }
      }
    });
    return map;
  }, [clases, weekDates]);

  const displayBlocks = useMemo(() => {
    const blocksMap = new Map<string, Bloque>();
    template.forEach((b) => blocksMap.set(b.hora_inicio, b));

    claseMap.forEach((c) => {
      if (!blocksMap.has(c.hora_inicio)) {
        blocksMap.set(c.hora_inicio, { hora_inicio: c.hora_inicio, hora_fin: c.hora_fin });
      }
    });

    return Array.from(blocksMap.values()).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
  }, [template, claseMap]);

  const prevWeek = () => {
    setAutoFollow(false);
    setWeekStart(new Date(year, month, weekStart.getDate() - 7));
  };
  const nextWeek = () => {
    setAutoFollow(false);
    setWeekStart(new Date(year, month, weekStart.getDate() + 7));
  };
  const goCurrentWeek = () => {
    setWeekStart(weekStartOf(today));
    setAutoFollow(true);
  };

  const startD = weekDates[0];
  const endD = weekDates[5];
  const startPart = `${startD.getDate()}${startD.getMonth() !== endD.getMonth() ? ' de ' + MESES[startD.getMonth()] : ''}`;
  const weekTitle = `Semana del ${startPart} al ${endD.getDate()} de ${MESES[endD.getMonth()]} del ${endD.getFullYear()}`;

  const openRequestModal = (date: Date, diaNombre: string, hora_inicio: string, hora_fin: string) => {
    const tzoffset = date.getTimezoneOffset() * 60000;
    const dateStr = new Date(date.getTime() - tzoffset).toISOString().split('T')[0];
    setRequestSlot({ date, diaNombre, hora_inicio, hora_fin, dateStr });
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestSlot || !user?.id) return;
    if (!motivo.trim()) {
      setMessage({ type: 'error', text: 'Ingresa el motivo o materia de tu clase.' });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/solicitudes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profesor_id: user.id,
          tipo_solicitud: 'aula',
          fecha_reserva: requestSlot.dateStr,
          hora_inicio: requestSlot.hora_inicio,
          hora_fin: requestSlot.hora_fin,
          motivo: motivo.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'No se pudo enviar la solicitud.' });
        setSubmitting(false);
        return;
      }

      setMessage({ type: 'success', text: '¡Solicitud enviada con éxito! El administrador revisará y confirmará tu reserva.' });
      setRequestSlot(null);
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al comunicarse con el servidor.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm font-semibold d-flex align-items-center justify-content-between gap-2 ${
            message.type === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <div className="d-flex align-items-center gap-2">
            {message.type === 'success' ? <FiCheckCircle size={18} /> : <FiXCircle size={18} />}
            <span>{message.text}</span>
          </div>
          <button type="button" className="btn-close" onClick={() => setMessage(null)} />
        </div>
      )}

      <div className="d-flex flex-column gap-3 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-4">
        <div className="d-flex align-items-center gap-3">
          <Link href="/profesor/dashboard" className="btn-secondary-custom d-inline-flex align-items-center justify-content-center p-2" style={{ width: '40px', height: '40px' }} title="Volver al inicio">
            <FiArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight d-flex align-items-center gap-2 mb-0">
              <FiCalendar className="text-primary" size={26} />
              Horario del Aula de Cómputo
            </h1>
            <p className="mt-1 text-sm text-slate-600 mb-0">
              Consulta la disponibilidad semanal y solicita el aula de cómputo en los horarios libres.
            </p>
          </div>
        </div>

        <Link href="/profesor/solicitudes" className="btn-primary-custom text-decoration-none d-inline-flex align-items-center gap-2">
          <FiBookOpen size={16} /> Mis Solicitudes
        </Link>
      </div>

      {loading ? (
        <div className="inventory-panel p-8 text-center text-slate-500 font-semibold">
          Cargando disponibilidad del aula...
        </div>
      ) : (
        <div className="inventory-panel p-4 rounded-4 border-0 shadow-sm bg-white">
          <div className="d-flex flex-column gap-2 flex-md-row align-items-md-center justify-content-md-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="font-extrabold text-slate-950 mb-0" style={{ fontSize: '1.15rem' }}>{weekTitle}</h2>
              <p className="text-xs font-semibold mb-0 d-flex align-items-center gap-1 text-slate-500">
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: autoFollow ? '#16a34a' : '#d97706', display: 'inline-block' }} />
                {autoFollow ? 'Sincronizado con la semana actual' : 'Viendo otra semana'}
              </p>
            </div>
            <div className="d-flex align-items-center gap-1">
              <button className="btn-secondary-custom text-xs d-inline-flex align-items-center gap-1" onClick={prevWeek}>
                <FiChevronLeft size={14} />Anterior
              </button>
              <button className="btn-primary-custom text-xs" onClick={goCurrentWeek}>Semana actual</button>
              <button className="btn-secondary-custom text-xs d-inline-flex align-items-center gap-1" onClick={nextWeek}>
                Siguiente<FiChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="d-grid" style={{ gridTemplateColumns: '120px repeat(6, 1fr)', gap: '8px', marginTop: '16px', overflowX: 'auto' }}>
            <div />

            {weekDates.map((date) => {
              const isToday = date.toDateString() === today.toDateString();
              return (
                <div key={date.toDateString()} className="text-center">
                  <div
                    className="d-inline-flex align-items-center justify-content-center rounded-circle fw-bold"
                    style={{
                      width: '34px',
                      height: '34px',
                      fontSize: '0.9rem',
                      color: isToday ? '#ffffff' : '#334155',
                      backgroundColor: isToday ? 'var(--color-primary)' : '#f1f5f9',
                    }}
                  >
                    {date.getDate()}
                  </div>
                  <div className="text-xs font-bold uppercase text-slate-600 mt-1">
                    {DIAS_SEMANA[date.getDay()].slice(0, 3)}
                  </div>
                  {date.getMonth() !== month && (
                    <div className="font-semibold text-slate-400" style={{ fontSize: '0.65rem' }}>{MESES[date.getMonth()].slice(0, 3)}</div>
                  )}
                  {isToday && (
                    <span className="badge rounded-pill mt-1" style={{ backgroundColor: 'var(--color-primary)', fontSize: '0.55rem', fontWeight: 700 }}>
                      HOY
                    </span>
                  )}
                </div>
              );
            })}

            {displayBlocks.map((bloque, idx) => (
              <FragmentProfesorDias
                key={idx}
                bloque={bloque}
                idx={idx}
                weekDates={weekDates}
                claseMap={claseMap}
                openRequestModal={openRequestModal}
              />
            ))}
          </div>

          <div className="d-flex align-items-center justify-content-between border-t border-slate-200 pt-3 mt-4 flex-wrap gap-2 text-xs text-slate-600">
            <div className="d-flex align-items-center gap-3">
              <span className="d-flex align-items-center gap-1">
                <span className="rounded-circle bg-success d-inline-block" style={{ width: '10px', height: '10px' }} />
                <strong>Disponible:</strong> Presiona para solicitar el aula
              </span>
              <span className="d-flex align-items-center gap-1">
                <span className="rounded-circle bg-primary d-inline-block" style={{ width: '10px', height: '10px' }} />
                <strong>Ocupado / Reservado:</strong> Asignado por Administración
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Solicitud de Reserva para Turno Libre */}
      {requestSlot && (
        <div className="modal fade show d-block" tabIndex={-1} role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-b p-4">
                <h5 className="modal-title font-bold text-slate-900 d-flex align-items-center gap-2">
                  <span className="rounded d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary" style={{ width: '34px', height: '34px' }}>
                    <FiCalendar size={18} />
                  </span>
                  Solicitar Reserva del Aula de Cómputo
                </h5>
                <button type="button" className="btn-close" disabled={submitting} onClick={() => setRequestSlot(null)} />
              </div>
              <form onSubmit={handleSendRequest}>
                <div className="modal-body p-4 space-y-3">
                  <div className="bg-primary bg-opacity-10 border border-blue-200 text-blue-900 p-3 rounded-3 mb-3">
                    <div className="fw-bold text-sm">Detalles del Turno Seleccionado:</div>
                    <div className="d-flex align-items-center gap-2 mt-1 font-semibold text-slate-800" style={{ fontSize: '0.9rem' }}>
                      <FiClock className="text-primary" size={16} />
                      <span>{requestSlot.diaNombre}, {requestSlot.date.getDate()} de {MESES[requestSlot.date.getMonth()]}</span>
                      <span>·</span>
                      <span className="font-mono text-primary fw-bold">{requestSlot.hora_inicio} - {requestSlot.hora_fin}</span>
                    </div>
                  </div>

                  <div>
                    <label className="fw-bold text-slate-800 mb-1" style={{ fontSize: '0.9rem' }}>
                      Materia / Asignatura o Motivo de la Clase
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ borderRadius: '10px', padding: '12px' }}
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder="Ej. Computación 5° A / Examen Práctico / Robótica"
                      required
                    />
                  </div>
                </div>

                <div className="modal-footer border-top p-3 d-flex justify-between">
                  <button type="button" className="btn-secondary-custom" disabled={submitting} onClick={() => setRequestSlot(null)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary-custom d-inline-flex align-items-center gap-2" disabled={submitting || !motivo.trim()}>
                    <FiSend size={15} />
                    {submitting ? 'Enviando solicitud...' : 'Enviar Solicitud al Admin'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FragmentProfesorDias({
  bloque,
  idx,
  weekDates,
  claseMap,
  openRequestModal,
}: {
  bloque: Bloque;
  idx: number;
  weekDates: Date[];
  claseMap: Map<string, Clase>;
  openRequestModal: (date: Date, diaNombre: string, hora_inicio: string, hora_fin: string) => void;
}) {
  const ordinals = ['1ª', '2ª', '3ª', '4ª', '5ª', '6ª', '7ª', '8ª', '9ª', '10ª'];

  return (
    <>
      <div className="rounded-lg bg-slate-100 border border-slate-200 px-2 py-1 d-flex flex-column justify-content-center" style={{ minHeight: '86px' }}>
        <span className="font-bold uppercase text-slate-400" style={{ fontSize: '0.62rem' }}>{ordinals[idx] || `Turno ${idx + 1}`}</span>
        <span className="font-mono font-bold text-slate-800" style={{ fontSize: '0.9rem' }}>{bloque.hora_inicio} - {bloque.hora_fin}</span>
      </div>

      {weekDates.map((date) => {
        const diaNombre = DIAS_SEMANA[date.getDay()];
        const key = `${diaNombre}|${bloque.hora_inicio}`;
        const clase = claseMap.get(key);

        return (
          <div key={key}>
            {clase ? (
              <div
                className="rounded p-2 d-flex flex-column align-items-center justify-content-center text-center h-100"
                style={{
                  minHeight: '86px',
                  border: '1px solid #bfdbfe',
                  background: 'linear-gradient(135deg, #eff6ff, #e0edff)',
                }}
              >
                <span className="fw-bold text-slate-900 text-truncate" style={{ fontSize: '0.82rem', maxWidth: '100%' }}>
                  {clase.motivo_reserva}
                </span>
                <span className="text-slate-600 text-truncate d-inline-flex align-items-center gap-1 mt-1" style={{ fontSize: '0.72rem', maxWidth: '100%' }}>
                  <FiUser size={11} className="flex-shrink-0 text-primary" />
                  {clase.reservado_por_apellido || clase.reservado_por_nombre || 'Docente'}
                </span>
                <span className="badge bg-primary mt-1" style={{ fontSize: '0.6rem' }}>
                  {clase.estado === 'separado' ? 'Reservado' : 'Pendiente'}
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openRequestModal(date, diaNombre, bloque.hora_inicio, bloque.hora_fin)}
                className="w-100 rounded p-2 d-flex flex-column align-items-center justify-content-center text-center"
                style={{
                  minHeight: '86px',
                  border: '1.5px dashed #86efac',
                  backgroundColor: '#f0fdf4',
                  color: '#166534',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#dcfce7';
                  e.currentTarget.style.borderColor = '#22c55e';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0fdf4';
                  e.currentTarget.style.borderColor = '#86efac';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <span className="fw-bold d-inline-flex align-items-center gap-1" style={{ fontSize: '0.78rem' }}>
                  <FiPlus size={13} /> Libre
                </span>
                <span className="text-xs text-slate-500 font-semibold mt-1">Solicitar</span>
              </button>
            )}
          </div>
        );
      })}
    </>
  );
}
