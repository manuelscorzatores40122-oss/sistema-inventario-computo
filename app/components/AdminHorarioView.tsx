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
  FiCheck,
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

type Profesor = {
  id: number;
  nombre: string;
  apellido: string;
  area?: string | null;
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

export const FORMATO_DEFECTO: Bloque[] = [
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

const cargarFormato = (): Bloque[] => {
  try {
    const raw = localStorage.getItem(TEMPLATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        return parsed.map((b: Bloque) => ({ hora_inicio: b.hora_inicio, hora_fin: b.hora_fin }));
      }
    }
  } catch (error) {
    console.error('Error al leer formato de horario:', error);
  }
  return FORMATO_DEFECTO;
};

export default function AdminHorarioView() {
  const [clases, setClases] = useState<Clase[]>([]);
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Message>(null);

  const [template, setTemplate] = useState<Bloque[]>(FORMATO_DEFECTO);
  const [showTemplate, setShowTemplate] = useState(false);

  const [weekStart, setWeekStart] = useState<Date>(() => weekStartOf(new Date()));
  const [autoFollow, setAutoFollow] = useState(true);
  const [now, setNow] = useState<Date>(() => new Date());

  const [assign, setAssign] = useState<{ diaNombre: string; label: string; clase: Clase | null } | null>(null);
  const [form, setForm] = useState({ materia: '', profesor_id: 0, hora_inicio: '', hora_fin: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    const [claseRes, profRes] = await Promise.all([
      fetch(`/api/disponibilidad`),
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
    const saved = localStorage.getItem(TEMPLATE_KEY);
    setTemplate(cargarFormato());
    if (!saved) setShowTemplate(true);

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
  const year = weekStart.getFullYear();
  const month = weekStart.getMonth();
  const today = now;
  const weekDates = useMemo(() => Array.from({ length: 6 }, (_, i) => new Date(year, month, weekStart.getDate() + i)), [year, month, weekStart]);

  const claseMap = useMemo(() => {
    const map = new Map<string, Clase>();
    // Primero, cargar el horario base
    clases.forEach((c) => {
      if (!c.fecha_reserva && c.sala_nombre === SALA_HORARIO) {
        map.set(`${c.dia_semana}|${c.hora_inicio}`, c);
      }
    });
    // Luego, superponer las reservas específicas si caen en la semana actual y están aprobadas
    clases.forEach((c) => {
      if (c.fecha_reserva && c.estado === 'separado') {
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

  const total = claseMap.size;
  const libres = DIAS.length * displayBlocks.length - total;
  const profesoresConClase = new Set(Array.from(claseMap.values()).map((c) => c.reservado_por)).size;

  const addBloque = () => {
    setTemplate((prev) => {
      const last = prev[prev.length - 1];
      const inicio = last ? last.hora_fin : '09:00';
      const [h, m] = inicio.split(':').map(Number);
      const fin = `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      return [...prev, { hora_inicio: inicio, hora_fin: fin }];
    });
  };

  const updateBloque = (idx: number, campo: keyof Bloque, valor: string) => {
    setTemplate((prev) => prev.map((b, i) => (i === idx ? { ...b, [campo]: valor } : b)));
  };

  const removeBloque = (idx: number) => {
    setTemplate((prev) => prev.filter((_, i) => i !== idx));
  };

  const guardarFormato = () => {
    const clean = template
      .map((b) => ({ hora_inicio: b.hora_inicio, hora_fin: b.hora_fin }))
      .filter((b) => b.hora_inicio && b.hora_fin);
    setTemplate(clean);
    localStorage.setItem(TEMPLATE_KEY, JSON.stringify(clean));
    setShowTemplate(false);
    setMessage({ type: 'success', text: 'Formato de horario guardado para todos los días y semanas' });
  };

  const openAssign = (diaNombre: string, hora_inicio: string) => {
    const date = weekDates.find((d) => DIAS_SEMANA[d.getDay()] === diaNombre);
    const label = date ? date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : diaNombre;
    const clase = claseMap.get(`${diaNombre}|${hora_inicio}`) || null;

    setForm({
      materia: clase?.motivo_reserva || '',
      profesor_id: clase?.reservado_por || 0,
      hora_inicio,
      hora_fin: displayBlocks.find((b) => b.hora_inicio === hora_inicio)?.hora_fin || '',
    });
    setAssign({ diaNombre, label, clase });
  };

  const handleProfesorChange = (id: number) => {
    const prof = profesores.find((p) => p.id === id);
    setForm((f) => ({
      ...f,
      profesor_id: id,
      materia: prof?.area || f.materia,
    }));
  };

  const save = async () => {
    if (!assign) return;

    const bloque = displayBlocks.find((b) => b.hora_inicio === form.hora_inicio);
    if (!bloque) {
      setMessage({ type: 'error', text: 'Horario no válido' });
      return;
    }

    if (!form.materia.trim()) {
      setMessage({ type: 'error', text: 'Escribe qué materia/clase toca en este turno' });
      return;
    }
    if (!form.profesor_id) {
      setMessage({ type: 'error', text: 'Selecciona qué profesor dará el turno' });
      return;
    }

    const payload = {
      sala_nombre: SALA_HORARIO,
      dia_semana: assign.diaNombre,
      hora_inicio: bloque.hora_inicio,
      hora_fin: bloque.hora_fin,
      estado: 'separado',
      reservado_por: form.profesor_id,
      motivo_reserva: form.materia.trim(),
    };

    setSaving(true);
    try {
      const url = assign.clase ? `/api/disponibilidad/${assign.clase.id}` : '/api/disponibilidad';
      const method = assign.clase ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: assign.clase ? 'Turno actualizado correctamente' : 'Profesor asignado al turno' });
        setAssign(null);
        await fetchData();
      } else {
        const data = await response.json().catch(() => null);
        setMessage({ type: 'error', text: data?.error || 'No se pudo guardar el turno' });
      }
    } catch (error) {
      console.error('Error al guardar turno:', error);
      setMessage({ type: 'error', text: 'Error al guardar el turno' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!assign?.clase) return;
    if (!confirm('¿Quitar al profesor de este turno?')) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/disponibilidad/${assign.clase.id}`, { method: 'DELETE' });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Turno liberado' });
        setAssign(null);
        await fetchData();
      } else {
        const data = await response.json().catch(() => null);
        setMessage({ type: 'error', text: data?.error || 'No se pudo liberar el turno' });
      }
    } catch (error) {
      console.error('Error al liberar turno:', error);
      setMessage({ type: 'error', text: 'Error al liberar el turno' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm font-semibold d-flex align-items-center gap-2 ${message.type === 'success'
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
            Semana {startPart} al {endD.getDate()} de {MESES[endD.getMonth()]} (Lun–Sáb). Define el formato de turnos y asigna el profesor de cada hora.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button className="btn-primary-custom text-decoration-none d-inline-flex align-items-center gap-1" onClick={() => setShowTemplate(true)}>
            <FiSettings size={15} />
            Agregar / Editar Horario
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="inventory-panel p-4 border-l-4 border-l-slate-700">
          <div className="d-flex align-items-center gap-2 mb-2">
            <div className="rounded d-flex align-items-center justify-content-center bg-slate-100 text-slate-600" style={{ width: '34px', height: '34px' }}>
              <FiClock size={16} />
            </div>
            <p className="text-xs font-bold uppercase text-slate-500 mb-0">Turnos de Clase Definidos</p>
          </div>
          <h3 className="text-2xl font-black text-slate-900 mt-1">{loading ? '...' : displayBlocks.length}</h3>
        </div>

        <div className="inventory-panel p-4 border-l-4 border-l-green-600">
          <div className="d-flex align-items-center gap-2 mb-2">
            <div className="rounded d-flex align-items-center justify-content-center bg-green-50 text-green-600" style={{ width: '34px', height: '34px' }}>
              <FiCheck size={16} />
            </div>
            <p className="text-xs font-bold uppercase text-slate-500 mb-0">Turnos con Profesor</p>
          </div>
          <h3 className="text-2xl font-black text-green-600 mt-1">{loading ? '...' : total}</h3>
        </div>

        <div className="inventory-panel p-4 border-l-4 border-l-blue-600">
          <div className="d-flex align-items-center gap-2 mb-2">
            <div className="rounded d-flex align-items-center justify-content-center bg-blue-50 text-blue-600" style={{ width: '34px', height: '34px' }}>
              <FiUser size={16} />
            </div>
            <p className="text-xs font-bold uppercase text-slate-500 mb-0">Bloques por Asignar</p>
          </div>
          <h3 className="text-2xl font-black text-blue-600 mt-1">{loading ? '...' : libres}</h3>
        </div>
      </div>

      {loading ? (
        <div className="inventory-panel p-8 text-center text-slate-500 font-semibold">
          Cargando horario semanal...
        </div>
      ) : (
        <div className="inventory-panel p-3">
          <div className="d-flex flex-column gap-2 flex-md-row align-items-md-center justify-content-md-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="font-extrabold text-slate-950 mb-0" style={{ fontSize: '1.1rem' }}>{weekTitle}</h2>
              <p className="text-xs font-semibold mb-0 d-flex align-items-center gap-1">
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: autoFollow ? '#16a34a' : '#d97706', display: 'inline-block' }} />
                {autoFollow ? 'Se actualiza automáticamente a la semana actual' : 'Viendo otra semana — presiona "Semana actual"'}
              </p>
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

          <div className="d-grid" style={{ gridTemplateColumns: '120px repeat(6, 1fr)', gap: '8px', marginTop: '12px' }}>
            <div />

            {weekDates.map((date) => {
              const isToday = date.toDateString() === today.toDateString();
              return (
                <div key={date.toDateString()} className="text-center">
                  <div
                    className="d-inline-flex align-items-center justify-content-center rounded-circle fw-bold"
                    style={{
                      width: '32px',
                      height: '32px',
                      fontSize: '0.85rem',
                      color: isToday ? '#ffffff' : '#334155',
                      backgroundColor: isToday ? 'var(--color-primary)' : '#f1f5f9',
                    }}
                  >
                    {date.getDate()}
                  </div>
                  <div className="text-xs font-bold uppercase text-slate-500 mt-1">
                    {DIAS_SEMANA[date.getDay()].slice(0, 3)}
                  </div>
                  {date.getMonth() !== month && (
                    <div className="font-semibold text-slate-400" style={{ fontSize: '0.6rem' }}>{MESES[date.getMonth()].slice(0, 3)}</div>
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
              <FragmentDias key={idx} bloque={bloque} idx={idx} weekDates={weekDates} claseMap={claseMap} openAssign={openAssign} />
            ))}
          </div>

          <div className="d-flex align-items-center justify-content-between border-t border-slate-200 pt-3 mt-3">
            <span className="text-xs font-semibold text-slate-500">
              Presiona un turno (ej. 9:00 - 10:00) para asignar qué profesor da esa hora.
            </span>
          </div>
        </div>
      )}

      {showTemplate && (
        <>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-lg" role="document">
              <div className="modal-content border-0 shadow-lg">
                <div className="modal-header border-b border-slate-200 p-4">
                  <h5 className="modal-title font-bold text-slate-900 d-flex align-items-center gap-2">
                    <span className="rounded d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary" style={{ width: '30px', height: '30px' }}>
                      <FiClock size={15} />
                    </span>
                    Agregar / Editar Formato de Horario
                  </h5>
                  <button type="button" className="btn-close" disabled={saving} onClick={() => setShowTemplate(false)} />
                </div>

                <div className="modal-body p-4 space-y-3">
                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-900">
                    Define el formato diario de turnos (ej. 1ª clase 09:00–10:00, 2ª clase 10:00–11:00...).
                    Este formato se guarda y aplica a <strong>todos los días y semanas futuras</strong>.
                  </div>

                  {template.map((bloque, idx) => (
                    <div key={idx} className="d-flex align-items-center gap-2">
                      <span className="rounded d-flex align-items-center justify-content-center bg-slate-100 text-slate-600 fw-bold flex-shrink-0" style={{ width: '30px', height: '30px', fontSize: '0.7rem' }}>
                        {idx + 1}ª
                      </span>
                      <input
                        type="time"
                        value={bloque.hora_inicio}
                        onChange={(e) => updateBloque(idx, 'hora_inicio', e.target.value)}
                        className="inventory-form-input"
                      />
                      <span className="text-slate-400 font-bold">—</span>
                      <input
                        type="time"
                        value={bloque.hora_fin}
                        onChange={(e) => updateBloque(idx, 'hora_fin', e.target.value)}
                        className="inventory-form-input"
                      />
                      <button className="btn-icon text-danger" title="Quitar turno" onClick={() => removeBloque(idx)}>
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  ))}

                  <button className="btn-secondary-custom w-100 d-inline-flex align-items-center justify-content-center gap-1" onClick={addBloque}>
                    <FiPlus size={13} />
                    Agregar turno
                  </button>
                </div>

                <div className="modal-footer border-t border-slate-200 p-3 flex justify-end gap-2">
                  <button className="btn-secondary-custom" onClick={() => setShowTemplate(false)}>
                    Cancelar
                  </button>
                  <button className="btn-primary-custom d-inline-flex align-items-center gap-1" onClick={guardarFormato}>
                    <FiSave size={13} />
                    Guardar formato
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      )}

      {assign && (
        <>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" style={{ zIndex: 1055 }}>
            <div className="modal-dialog" role="document">
              <div className="modal-content border-0 shadow-lg">
                <div className="modal-header border-b border-slate-200 p-4">
                  <h5 className="modal-title font-bold text-slate-900 d-flex align-items-center gap-2 text-capitalize">
                    <span className="rounded d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary" style={{ width: '30px', height: '30px' }}>
                      <FiBookOpen size={15} />
                    </span>
                    Turno {form.hora_inicio} - {form.hora_fin} · {assign.label}
                  </h5>
                  <button type="button" className="btn-close" disabled={saving || deleting} onClick={() => setAssign(null)} />
                </div>

                <div className="modal-body p-4 space-y-3">
                  <div>
                    <label className="inventory-form-label">Materia / Clase que toca</label>
                    <input
                      type="text"
                      value={form.materia}
                      onChange={(e) => setForm({ ...form, materia: e.target.value })}
                      className="inventory-form-input"
                      placeholder="Tabién deja vacío y elige el profesor (se llena con su curso)"
                    />
                  </div>

                  <div>
                    <label className="inventory-form-label">Profesor que dará el turno</label>
                    <select
                      value={form.profesor_id}
                      onChange={(e) => handleProfesorChange(Number(e.target.value))}
                      className="inventory-form-select"
                    >
                      <option value="0">Seleccionar profesor...</option>
                      {profesores.map((profesor) => (
                        <option key={profesor.id} value={profesor.id}>
                          {profesor.apellido}, {profesor.nombre}
                        </option>
                      ))}
                    </select>
                    {(() => {
                      const prof = profesores.find((p) => p.id === form.profesor_id);
                      if (!prof) return null;
                      return (
                        <div className="rounded bg-sky-50 border border-sky-200 px-2 py-1 mt-1 text-xs text-sky-800 d-inline-flex align-items-center gap-1">
                          <FiBookOpen size={12} />
                          Curso asignado: <strong className="fw-semibold">{prof.area || 'Sin área registrada'}</strong>
                        </div>
                      );
                    })()}
                  </div>

                  {assign.clase && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 d-flex align-items-center gap-2">
                      <FiUser size={14} />
                      Actualmente asignado a <strong>{assign.clase.reservado_por_nombre} {assign.clase.reservado_por_apellido}</strong>
                    </div>
                  )}
                </div>

                <div className="modal-footer border-t border-slate-200 p-3 flex justify-end gap-2">
                  {assign.clase && (
                    <button className="btn-danger-custom d-inline-flex align-items-center gap-1" disabled={saving || deleting} onClick={remove}>
                      <FiTrash2 size={13} />
                      {deleting ? 'Quitando...' : 'Quitar profesor'}
                    </button>
                  )}
                  <button className="btn-secondary-custom" onClick={() => setAssign(null)}>
                    Cancelar
                  </button>
                  <button className="btn-primary-custom d-inline-flex align-items-center gap-1" disabled={saving} onClick={save}>
                    <FiSave size={13} />
                    {saving ? 'Guardando...' : 'Asignar'}
                  </button>
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

function FragmentDias({
  bloque,
  idx,
  weekDates,
  claseMap,
  openAssign,
}: {
  bloque: Bloque;
  idx: number;
  weekDates: Date[];
  claseMap: Map<string, Clase>;
  openAssign: (diaNombre: string, hora_inicio: string) => void;
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
          <button
            key={key}
            onClick={() => openAssign(diaNombre, bloque.hora_inicio)}
            className="rounded p-2 d-flex flex-column align-items-center justify-content-center text-center"
            style={{
              minHeight: '86px',
              border: clase ? '1px solid #bfdbfe' : '1.5px dashed #cbd5e1',
              background: clase ? 'linear-gradient(135deg, #eff6ff, #e0edff)' : '#f8fafc',
              cursor: 'pointer',
              transition: 'box-shadow 0.15s, border-color 0.15s, transform 0.1s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 3px 10px rgba(37, 99, 235, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {clase ? (
              <>
                <span className="fw-bold text-slate-900 text-truncate" style={{ fontSize: '0.82rem', maxWidth: '100%' }}>
                  {clase.motivo_reserva}
                </span>
                <span className="text-slate-600 text-truncate d-inline-flex align-items-center gap-1" style={{ fontSize: '0.72rem', maxWidth: '100%' }}>
                  <FiUser size={11} className="flex-shrink-0" />
                  {clase.reservado_por_apellido || clase.reservado_por_nombre}
                </span>
                <span className="text-primary text-xs fw-semibold mt-1">
                  <FiEdit2 size={10} /> Editar
                </span>
              </>
            ) : (
              <span className="text-slate-400 fw-semibold d-inline-flex align-items-center gap-1" style={{ fontSize: '0.75rem' }}>
                <FiPlus size={13} />
                Asignar
              </span>
            )}
          </button>
        );
      })}
    </>
  );
}