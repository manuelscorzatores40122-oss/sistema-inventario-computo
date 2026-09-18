'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FiCalendar,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiSettings,
  FiPlus,
  FiTrash2,
  FiBookOpen,
  FiUser,
  FiSave,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
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
};

type Profesor = {
  id: number;
  nombre: string;
  apellido: string;
};

type Message = { type: 'success' | 'error'; text: string } | null;

const SALA_HORARIO = 'Horario de Clases';
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const PERIODOS = [
  { inicio: '09:00', fin: '10:00' },
  { inicio: '10:00', fin: '11:00' },
  { inicio: '11:00', fin: '12:00' },
  { inicio: '12:00', fin: '13:00' },
];

const weekStartOf = (date: Date) => {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

export default function AdminHorarioView() {
  const [clases, setClases] = useState<Clase[]>([]);
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Message>(null);

  const [weekStart, setWeekStart] = useState<Date>(() => weekStartOf(new Date()));
  const [autoFollow, setAutoFollow] = useState(true);
  const [now, setNow] = useState<Date>(() => new Date());
  const [dayModal, setDayModal] = useState<{ diaNombre: string; label: string } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editClase, setEditClase] = useState<Clase | null>(null);
  const [form, setForm] = useState({ hora_inicio: '09:00', hora_fin: '10:00', materia: '', profesor_id: 0 });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchData = async () => {
    const [claseRes, profRes] = await Promise.all([
      fetch(`/api/disponibilidad?sala_nombre=${encodeURIComponent(SALA_HORARIO)}`),
      fetch('/api/usuarios?role=profesor&activo=true'),
    ]);

    if (claseRes.ok) {
      const data = await claseRes.json();
      setClases(data.disponibilidades || []);
    }

    if (profRes.ok) {
      const data = await profRes.json();
      setProfesores(data.usuarios || []);
    }
  };

  useEffect(() => {
    fetchData()
      .catch(() => setMessage({ type: 'error', text: 'Error al cargar el horario' }))
      .finally(() => setLoading(false));
  }, []);

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

  const clasesByDay = useMemo(() => {
    const map = new Map<string, Clase[]>();
    DIAS.forEach((d) => map.set(d, []));
    clases
      .filter((c) => DIAS.includes(c.dia_semana))
      .forEach((c) => map.get(c.dia_semana)?.push(c));
    map.forEach((arr) => arr.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio)));
    return map;
  }, [clases]);

  const total = clases.length;
  const libre = DIAS.length * PERIODOS.length - total;
  const profesoresConClase = new Set(clases.map((c) => c.reservado_por)).size;

  const year = weekStart.getFullYear();
  const month = weekStart.getMonth();
  const today = now;
  const weekDates = Array.from({ length: 6 }, (_, i) => new Date(year, month, weekStart.getDate() + i));

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

  const openDay = (date: Date) => {
    const diaNombre = DIAS_SEMANA[date.getDay()];
    if (!DIAS.includes(diaNombre)) return;

    const label = date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    setDayModal({ diaNombre, label });
    setFormOpen(false);
    setEditClase(null);
  };

  const openAdd = () => {
    setEditClase(null);
    setForm({ hora_inicio: '09:00', hora_fin: '10:00', materia: '', profesor_id: 0 });
    setFormOpen(true);
  };

  const openEdit = (c: Clase) => {
    setEditClase(c);
    setForm({
      hora_inicio: c.hora_inicio,
      hora_fin: c.hora_fin,
      materia: c.motivo_reserva || '',
      profesor_id: c.reservado_por || 0,
    });
    setFormOpen(true);
  };

  const handleHoraChange = (inicio: string) => {
    const p = PERIODOS.find((x) => x.inicio === inicio);
    setForm((f) => ({ ...f, hora_inicio: inicio, hora_fin: p ? p.fin : f.hora_fin }));
  };

  const save = async () => {
    if (!dayModal) return;
    if (!form.materia.trim()) {
      setMessage({ type: 'error', text: 'Escribe la clase/materia que toca en este horario' });
      return;
    }
    if (!form.profesor_id) {
      setMessage({ type: 'error', text: 'Selecciona el profesor a cargo' });
      return;
    }

    const payload = {
      sala_nombre: SALA_HORARIO,
      dia_semana: dayModal.diaNombre,
      hora_inicio: form.hora_inicio,
      hora_fin: form.hora_fin,
      estado: 'separado',
      reservado_por: form.profesor_id,
      motivo_reserva: form.materia.trim(),
    };

    setSaving(true);
    try {
      const url = editClase ? `/api/disponibilidad/${editClase.id}` : '/api/disponibilidad';
      const method = editClase ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: editClase ? 'Clase actualizada correctamente' : 'Clase asignada correctamente' });
        setFormOpen(false);
        setEditClase(null);
        await fetchData();
      } else {
        const data = await response.json().catch(() => null);
        setMessage({ type: 'error', text: data?.error || 'No se pudo guardar la clase' });
      }
    } catch (error) {
      console.error('Error al guardar clase:', error);
      setMessage({ type: 'error', text: 'Error al guardar la clase' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (clase: Clase) => {
    if (!confirm(`¿Eliminar "${clase.motivo_reserva}" del horario?`)) return;

    setDeletingId(clase.id);
    try {
      const response = await fetch(`/api/disponibilidad/${clase.id}`, { method: 'DELETE' });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Clase eliminada del horario' });
        await fetchData();
      } else {
        const data = await response.json().catch(() => null);
        setMessage({ type: 'error', text: data?.error || 'No se pudo eliminar la clase' });
      }
    } catch (error) {
      console.error('Error al eliminar clase:', error);
      setMessage({ type: 'error', text: 'Error al eliminar la clase' });
    } finally {
      setDeletingId(null);
    }
  };

  const diaClases = dayModal ? (clasesByDay.get(dayModal.diaNombre) || []) : [];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm font-semibold d-flex align-items-center gap-2 ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {message.type === 'success' ? <FiCheckCircle size={18} /> : <FiXCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight d-flex align-items-center gap-2">
            <FiCalendar className="text-primary" size={26} />
            Horario Semanal
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Muestra la semana actual de Lunes a Sábado y se actualiza sola cada lunes. Presiona un día para editar sus clases.
          </p>
        </div>

        <Link href="/admin/disponibilidad" className="btn-secondary-custom text-decoration-none d-inline-flex align-items-center gap-2">
          <FiSettings size={15} />
          Gestionar bloques disponibles
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="inventory-panel p-4 border-l-4 border-l-slate-700">
          <div className="d-flex align-items-center gap-2 mb-2">
            <div className="rounded d-flex align-items-center justify-content-center bg-slate-100 text-slate-600" style={{ width: '34px', height: '34px' }}>
              <FiBookOpen size={16} />
            </div>
            <p className="text-xs font-bold uppercase text-slate-500 mb-0">Clases Asignadas</p>
          </div>
          <h3 className="text-2xl font-black text-slate-900 mt-1">{loading ? '...' : total}</h3>
        </div>

        <div className="inventory-panel p-4 border-l-4 border-l-green-600">
          <div className="d-flex align-items-center gap-2 mb-2">
            <div className="rounded d-flex align-items-center justify-content-center bg-green-50 text-green-600" style={{ width: '34px', height: '34px' }}>
              <FiClock size={16} />
            </div>
            <p className="text-xs font-bold uppercase text-slate-500 mb-0">Bloques Libres</p>
          </div>
          <h3 className="text-2xl font-black text-green-600 mt-1">{loading ? '...' : libre}</h3>
        </div>

        <div className="inventory-panel p-4 border-l-4 border-l-blue-600">
          <div className="d-flex align-items-center gap-2 mb-2">
            <div className="rounded d-flex align-items-center justify-content-center bg-blue-50 text-blue-600" style={{ width: '34px', height: '34px' }}>
              <FiUser size={16} />
            </div>
            <p className="text-xs font-bold uppercase text-slate-500 mb-0">Profesores con Clase</p>
          </div>
          <h3 className="text-2xl font-black text-blue-600 mt-1">{loading ? '...' : profesoresConClase}</h3>
        </div>
      </div>

      {loading ? (
        <div className="inventory-panel p-8 text-center text-slate-500 font-semibold">
          Cargando horario semanal...
        </div>
      ) : (
        <div className="inventory-panel p-3">
          <div className="d-flex flex-column gap-2 flex-md-row align-items-md-center justify-content-md-between border-b border-slate-200 pb-3">
            <div className="d-flex align-items-center gap-3">
              <div className="rounded d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary" style={{ width: '34px', height: '34px' }}>
                <FiCalendar size={16} />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-950 mb-0" style={{ fontSize: '1.05rem' }}>{weekTitle}</h2>
                <p className="text-xs font-semibold text-primary mb-0 d-flex align-items-center gap-1">
                  <span className={autoFollow ? 'text-success' : 'text-warning'} style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: autoFollow ? '#16a34a' : '#d97706', display: 'inline-block' }} />
                  {autoFollow ? 'Se actualiza automáticamente a la semana actual' : 'Estás viendo otra semana, presiona "Semana actual"'}
                </p>
              </div>
            </div>
            <div className="d-flex align-items-center gap-1">
              <button className="btn-secondary-custom text-xs d-inline-flex align-items-center gap-1" onClick={prevWeek}>
                <FiChevronLeft size={14} />Semana anterior
              </button>
              <button className="btn-primary-custom text-xs" onClick={goCurrentWeek}>Semana actual</button>
              <button className="btn-secondary-custom text-xs d-inline-flex align-items-center gap-1" onClick={nextWeek}>
                Semana siguiente<FiChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="d-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
            {weekDates.map((date) => {
              const diaNombre = DIAS_SEMANA[date.getDay()];
              const isToday = date.toDateString() === today.toDateString();
              const dayClases = clasesByDay.get(diaNombre) || [];
              const shown = dayClases.slice(0, 3);
              const extra = dayClases.length - shown.length;

              return (
                <button
                  key={date.toDateString()}
                  onClick={() => openDay(date)}
                  className="rounded p-2 d-flex flex-column text-start"
                  style={{
                    minHeight: '150px',
                    border: isToday ? '1.5px solid var(--color-primary)' : '1px solid #e2e8f0',
                    background: isToday ? 'var(--color-primary-light)' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'box-shadow 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <span className="text-xs font-bold uppercase text-slate-500">
                      {DIAS_SEMANA[date.getDay()].slice(0, 3)}
                    </span>
                    <span
                      className="rounded-circle fw-bold d-inline-flex align-items-center justify-content-center"
                      style={{
                        width: '28px',
                        height: '28px',
                        fontSize: '0.8rem',
                        color: isToday ? '#ffffff' : '#334155',
                        backgroundColor: isToday ? 'var(--color-primary)' : '#f1f5f9',
                      }}
                    >
                      {date.getDate()}
                    </span>
                  </div>

                  {date.getMonth() !== month && (
                    <span className="text-xs font-semibold text-slate-400 mb-1">{MESES[date.getMonth()]}</span>
                  )}

                  {isToday && (
                    <span className="badge rounded-pill mb-1 align-self-start" style={{ backgroundColor: 'var(--color-primary)', fontSize: '0.58rem', fontWeight: 700 }}>
                      HOY
                    </span>
                  )}

                  <div className="mt-auto mb-0 d-flex flex-column" style={{ gap: '2px' }}>
                    {dayClases.length === 0 ? (
                      <span className="text-xs text-slate-300 font-semibold">Sin clases</span>
                    ) : (
                      <>
                        {shown.map((c) => (
                          <span key={c.id} className="cal-chip">
                            <b>{c.hora_inicio.slice(0, 5)}</b> {c.motivo_reserva}
                          </span>
                        ))}
                        {extra > 0 && <span className="cal-chip more">+{extra} más</span>}
                      </>
                    )}
                    <span className="cal-chip more mt-1">+ Agregar</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {dayModal && (
        <>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" style={{ zIndex: 1055 }}>
            <div className="modal-dialog" role="document">
              <div className="modal-content border-0 shadow-lg">
                <div className="modal-header border-b border-slate-200 p-4">
                  <h5 className="modal-title font-bold text-slate-900 d-flex align-items-center gap-2 text-capitalize">
                    <span className="rounded d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary" style={{ width: '30px', height: '30px' }}>
                      <FiBookOpen size={15} />
                    </span>
                    {dayModal.label}
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setDayModal(null)} />
                </div>

                <div className="modal-body p-4 space-y-3">
                  {!formOpen ? (
                    <>
                      {diaClases.length === 0 ? (
                        <p className="text-sm text-slate-500 font-semibold text-center py-3">
                          Este día no tiene clases asignadas.
                        </p>
                      ) : (
                        diaClases.map((clase) => (
                          <div key={clase.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <div className="d-flex align-items-center justify-content-between gap-2 mb-1">
                              <span className="font-mono text-xs font-bold text-primary">
                                <FiClock size={11} className="me-1" />
                                {clase.hora_inicio} - {clase.hora_fin}
                              </span>
                              <div className="d-flex align-items-center gap-1">
                                <button className="btn-icon" title="Editar" onClick={() => openEdit(clase)}>
                                  <FiEdit2 size={14} />
                                </button>
                                <button className="btn-icon text-danger" title="Eliminar" disabled={deletingId === clase.id} onClick={() => remove(clase)}>
                                  <FiTrash2 size={14} />
                                </button>
                              </div>
                            </div>
                            <div className="font-bold text-slate-900 d-flex align-items-center gap-1">
                              <FiBookOpen size={12} className="text-primary" />
                              {clase.motivo_reserva}
                            </div>
                            <div className="text-xs text-slate-500 d-flex align-items-center gap-1">
                              <FiUser size={11} />
                              {clase.reservado_por_nombre} {clase.reservado_por_apellido}
                            </div>
                          </div>
                        ))
                      )}

                      <button className="btn-primary-custom w-100 d-inline-flex align-items-center justify-content-center gap-1" onClick={openAdd}>
                        <FiPlus size={13} />
                        Agregar clase a este día
                      </button>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="inventory-form-label">Hora de Inicio</label>
                          <select value={form.hora_inicio} onChange={(e) => handleHoraChange(e.target.value)} className="inventory-form-select">
                            {PERIODOS.map((p) => (
                              <option key={p.inicio} value={p.inicio}>{p.inicio}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-6">
                          <label className="inventory-form-label">Hora de Fin</label>
                          <input type="text" value={form.hora_fin} readOnly className="inventory-form-input bg-slate-50" />
                        </div>
                      </div>

                      <div>
                        <label className="inventory-form-label">Clase / Materia que toca</label>
                        <input
                          type="text"
                          value={form.materia}
                          onChange={(e) => setForm({ ...form, materia: e.target.value })}
                          className="inventory-form-input"
                          placeholder="Ej. Matemática, Comunicación, C y T..."
                        />
                      </div>

                      <div>
                        <label className="inventory-form-label">Profesor a cargo</label>
                        <select
                          value={form.profesor_id}
                          onChange={(e) => setForm({ ...form, profesor_id: Number(e.target.value) })}
                          className="inventory-form-select"
                        >
                          <option value="0">Seleccionar profesor...</option>
                          {profesores.map((profesor) => (
                            <option key={profesor.id} value={profesor.id}>
                              {profesor.apellido}, {profesor.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-footer border-t border-slate-200 p-3 flex justify-end gap-2">
                  {formOpen ? (
                    <>
                      <button className="btn-secondary-custom" onClick={() => { setFormOpen(false); setEditClase(null); }}>
                        Cancelar
                      </button>
                      <button className="btn-primary-custom d-inline-flex align-items-center gap-1" disabled={saving} onClick={save}>
                        <FiSave size={13} />
                        {saving ? 'Guardando...' : 'Guardar'}
                      </button>
                    </>
                  ) : (
                    <button className="btn-secondary-custom" onClick={() => setDayModal(null)}>
                      Cerrar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      )}
    </div>
  );
}