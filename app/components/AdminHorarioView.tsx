'use client';

import { useEffect, useState } from 'react';
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

const PERIODOS = [
  { inicio: '09:00', fin: '10:00' },
  { inicio: '10:00', fin: '11:00' },
  { inicio: '11:00', fin: '12:00' },
  { inicio: '12:00', fin: '13:00' },
];

export default function AdminHorarioView() {
  const [clases, setClases] = useState<Clase[]>([]);
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Message>(null);

  const [editing, setEditing] = useState<{ clase: Clase | null } | null>(null);
  const [form, setForm] = useState({
    dia: 'Lunes',
    hora_inicio: '09:00',
    hora_fin: '10:00',
    materia: '',
    profesor_id: 0,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const openAdd = (dia: string, periodo: { inicio: string; fin: string }) => {
    setForm({ dia, hora_inicio: periodo.inicio, hora_fin: periodo.fin, materia: '', profesor_id: 0 });
    setEditing({ clase: null });
  };

  const openEdit = (clase: Clase) => {
    setForm({
      dia: clase.dia_semana,
      hora_inicio: clase.hora_inicio,
      hora_fin: clase.hora_fin,
      materia: clase.motivo_reserva || '',
      profesor_id: clase.reservado_por || 0,
    });
    setEditing({ clase });
  };

  const closeModal = () => {
    if (saving || deleting) return;
    setEditing(null);
  };

  const save = async () => {
    if (editing === null) return;
    if (!form.materia.trim()) {
      setMessage({ type: 'error', text: 'Escribe la clase/materia que toca en este bloque' });
      return;
    }
    if (!form.profesor_id) {
      setMessage({ type: 'error', text: 'Selecciona el profesor a cargo' });
      return;
    }

    const payload = {
      sala_nombre: SALA_HORARIO,
      dia_semana: form.dia,
      hora_inicio: form.hora_inicio,
      hora_fin: form.hora_fin,
      estado: 'separado',
      reservado_por: form.profesor_id,
      motivo_reserva: form.materia.trim(),
    };

    setSaving(true);
    try {
      const url = editing.clase ? `/api/disponibilidad/${editing.clase.id}` : '/api/disponibilidad';
      const method = editing.clase ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: editing.clase ? 'Clase actualizada correctamente' : 'Clase asignada correctamente' });
        setEditing(null);
        fetchData();
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

  const remove = async () => {
    if (!editing?.clase) return;
    if (!confirm('¿Eliminar esta clase del horario?')) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/disponibilidad/${editing.clase.id}`, { method: 'DELETE' });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Clase eliminada del horario' });
        setEditing(null);
        fetchData();
      } else {
        const data = await response.json().catch(() => null);
        setMessage({ type: 'error', text: data?.error || 'No se pudo eliminar la clase' });
      }
    } catch (error) {
      console.error('Error al eliminar clase:', error);
      setMessage({ type: 'error', text: 'Error al eliminar la clase' });
    } finally {
      setDeleting(false);
    }
  };

  const claseMap = new Map<string, Clase>();
  clases.forEach((c) => claseMap.set(`${c.dia_semana}|${c.hora_inicio}`, c));

  const total = clases.length;
  const libre = DIAS.length * PERIODOS.length - total;
  const profesoresConClase = new Set(clases.map((c) => c.reservado_por)).size;

  const handleHoraChange = (inicio: string) => {
    const p = PERIODOS.find((x) => x.inicio === inicio);
    setForm((f) => ({ ...f, hora_inicio: inicio, hora_fin: p ? p.fin : f.hora_fin }));
  };

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
            Horario de Clases
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Plan semanal de Lunes a Sábado. Toca cualquier casilla para asignar o editar qué clase toca en ese horario.
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
          Cargando horario de clases...
        </div>
      ) : (
        <div className="inventory-panel p-3">
          <div className="overflow-x-auto">
            <table className="table table-bordered align-middle mb-0" style={{ minWidth: '880px', borderCollapse: 'separate', borderSpacing: '6px 0' }}>
              <thead>
                <tr>
                  <th className="text-center text-xs font-bold uppercase text-slate-500 border-0" style={{ width: '110px' }}>
                    Horario
                  </th>
                  {DIAS.map((dia) => (
                    <th key={dia} className="text-center border-0" style={{ minWidth: '125px' }}>
                      <span className="text-sm font-bold text-slate-900">{dia}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIODOS.map((periodo) => (
                  <tr key={periodo.inicio}>
                    <td className="text-center border-0 py-2">
                      <span className="font-mono text-sm font-bold text-slate-600">{periodo.inicio} - {periodo.fin}</span>
                    </td>
                    {DIAS.map((dia) => {
                      const key = `${dia}|${periodo.inicio}`;
                      const clase = claseMap.get(key);

                      return (
                        <td key={key} className="border-0 p-1 align-middle" style={{ height: '72px' }}>
                          {clase ? (
                            <button className="timetable-cell filled w-100 h-100" onClick={() => openEdit(clase)}>
                              <span className="d-block fw-bold text-slate-900 text-truncate">
                                <FiBookOpen size={11} className="me-1 text-primary" />
                                {clase.motivo_reserva}
                              </span>
                              <span className="d-block text-slate-500 text-truncate">
                                <FiUser size={10} className="me-1" />
                                {clase.reservado_por_nombre} {clase.reservado_por_apellido}
                              </span>
                            </button>
                          ) : (
                            <button className="timetable-cell empty w-100 h-100" onClick={() => openAdd(dia, periodo)}>
                              <FiPlus size={14} />
                              <span>Agregar clase</span>
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog">
            <div className="modal-dialog" role="document">
              <div className="modal-content border-0 shadow-lg">
                <div className="modal-header border-b border-slate-200 p-4">
                  <h5 className="modal-title font-bold text-slate-900 d-flex align-items-center gap-2">
                    <span className="rounded d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary" style={{ width: '30px', height: '30px' }}>
                      <FiBookOpen size={15} />
                    </span>
                    {editing.clase ? 'Editar Clase' : 'Asignar Clase'}
                  </h5>
                  <button type="button" className="btn-close" onClick={closeModal} />
                </div>

                <div className="modal-body p-4 space-y-4">
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="inventory-form-label">Día</label>
                      <select
                        value={form.dia}
                        onChange={(e) => setForm({ ...form, dia: e.target.value })}
                        className="inventory-form-select"
                      >
                        {DIAS.map((dia) => (
                          <option key={dia} value={dia}>{dia}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="inventory-form-label">Hora de Inicio</label>
                      <select value={form.hora_inicio} onChange={(e) => handleHoraChange(e.target.value)} className="inventory-form-select">
                        {PERIODOS.map((p) => (
                          <option key={p.inicio} value={p.inicio}>{p.inicio}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
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

                <div className="modal-footer border-t border-slate-200 p-3 flex justify-end gap-2">
                  {editing.clase && (
                    <button className="btn-danger-custom d-inline-flex align-items-center gap-1" disabled={saving || deleting} onClick={remove}>
                      <FiTrash2 size={13} />
                      {deleting ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  )}
                  <button className="btn-secondary-custom" onClick={closeModal}>
                    Cancelar
                  </button>
                  <button className="btn-primary-custom d-inline-flex align-items-center gap-1" disabled={saving} onClick={save}>
                    <FiSave size={13} />
                    {saving ? 'Guardando...' : 'Guardar'}
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