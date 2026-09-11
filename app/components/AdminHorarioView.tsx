'use client';

import { FormEvent, useEffect, useState } from 'react';

type Disponibilidad = {
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
  fecha_reserva: string | null;
};

type Profesor = {
  id: number;
  nombre: string;
  apellido: string;
};

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function AdminHorarioView() {
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidad[]>([]);
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState({
    sala_nombre: 'Sala de Cómputo',
    dia_semana: 'Lunes',
    hora_inicio: '08:00',
    hora_fin: '12:00',
    estado: 'disponible',
    reservado_por: '',
    motivo_reserva: '',
  });

  const fetchDisponibilidades = async () => {
    const res = await fetch('/api/disponibilidad');
    const data = await res.json();
    setDisponibilidades(data.disponibilidades || []);
  };

  const fetchProfesores = async () => {
    const res = await fetch('/api/usuarios?role=profesor');
    const data = await res.json();
    setProfesores(data.usuarios || []);
  };

  useEffect(() => {
    Promise.all([fetchDisponibilidades(), fetchProfesores()])
      .catch(() => console.error('Error al cargar'))
      .finally(() => setLoading(false));
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      const body = {
        sala_nombre: form.sala_nombre,
        dia_semana: form.dia_semana,
        hora_inicio: form.hora_inicio,
        hora_fin: form.hora_fin,
        estado: form.estado,
        reservado_por: form.estado === 'separado' && form.reservado_por ? Number(form.reservado_por) : null,
        motivo_reserva: form.estado === 'separado' ? form.motivo_reserva : null,
      };
      const res = await fetch('/api/disponibilidad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setMessage({ type: 'error', text: data?.error || 'Error al crear el horario' });
        return;
      }
      setForm({ ...form, hora_inicio: '08:00', hora_fin: '12:00', reservado_por: '', motivo_reserva: '' });
      setMessage({ type: 'success', text: 'Horario creado correctamente' });
      fetchDisponibilidades();
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión' });
    }
  };

  const remove = async (id: number) => {
    const res = await fetch(`/api/disponibilidad/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setMessage({ type: 'error', text: data?.error || 'Error al eliminar' });
      return;
    }
    setMessage({ type: 'success', text: 'Horario eliminado' });
    fetchDisponibilidades();
  };

  const porDia = DIAS.map(dia => ({
    dia,
    slots: disponibilidades
      .filter(d => d.dia_semana === dia)
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio)),
  }));

  return (
    <div className="min-vh-100 bg-light p-4">
      <div className="mb-4">
        <h1 className="h4 fw-bold text-dark mb-1">Horario Semanal</h1>
        <p className="text-secondary small mb-0">
          Agrega horarios de la sala y ve qué profesor reservó cada hora.
        </p>
        <a className="btn btn-outline-primary btn-sm mt-2" href="/admin/dashboard">Volver al panel</a>
      </div>

      {message && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'} py-2`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="p-5 text-center">
          <div className="spinner-border text-primary" role="status" />
          <div className="text-secondary mt-3">Cargando horario...</div>
        </div>
      ) : (
        <>
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-header bg-white p-4">
              <h2 className="h6 fw-bold text-dark mb-0">Agregar horario</h2>
            </div>
            <div className="card-body p-4">
              <form onSubmit={submit}>
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">Sala</label>
                    <input
                      className="form-control"
                      value={form.sala_nombre}
                      onChange={e => setForm({ ...form, sala_nombre: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">Día</label>
                    <select
                      className="form-select"
                      value={form.dia_semana}
                      onChange={e => setForm({ ...form, dia_semana: e.target.value })}
                    >
                      {DIAS.map(dia => <option key={dia}>{dia}</option>)}
                    </select>
                  </div>
                  <div className="col-md-2">
                    <label className="form-label small fw-semibold">Hora inicio</label>
                    <input
                      className="form-control"
                      type="time"
                      value={form.hora_inicio}
                      onChange={e => setForm({ ...form, hora_inicio: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label small fw-semibold">Hora fin</label>
                    <input
                      className="form-control"
                      type="time"
                      value={form.hora_fin}
                      onChange={e => setForm({ ...form, hora_fin: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">Estado</label>
                    <select
                      className="form-select"
                      value={form.estado}
                      onChange={e => setForm({ ...form, estado: e.target.value, reservado_por: '', motivo_reserva: '' })}
                    >
                      <option value="disponible">Disponible</option>
                      <option value="separado">Reservado / Separado</option>
                    </select>
                  </div>
                  {form.estado === 'separado' && (
                    <>
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold">Profesor que reserva</label>
                        <select
                          className="form-select"
                          value={form.reservado_por}
                          onChange={e => setForm({ ...form, reservado_por: e.target.value })}
                          required
                        >
                          <option value="">Seleccione profesor</option>
                          {profesores.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.nombre} {p.apellido}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold">Motivo / Curso</label>
                        <input
                          className="form-control"
                          value={form.motivo_reserva}
                          onChange={e => setForm({ ...form, motivo_reserva: e.target.value })}
                        />
                      </div>
                    </>
                  )}
                  <div className="col-12 d-flex align-items-end">
                    <button className="btn btn-primary" type="submit">Agregar horario</button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-bordered align-middle bg-white mb-0">
              <thead className="table-light">
                <tr>
                  {DIAS.map(d => <th key={d} className="text-center small text-secondary">{d}</th>)}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {porDia.map(({ dia, slots }) => (
                    <td key={dia} className="align-top" style={{ minWidth: 130 }}>
                      {slots.length === 0 ? (
                        <p className="text-secondary small m-0">Sin horarios</p>
                      ) : (
                        slots.map(slot => (
                          <div key={slot.id} className="border rounded p-2 mb-2">
                            <div className="fw-bold small">{slot.hora_inicio} – {slot.hora_fin}</div>
                            <div className="text-secondary small">{slot.sala_nombre}</div>
                            {slot.estado === 'separado' ? (
                              <>
                                <div className="small">
                                  <span className="badge bg-warning text-dark">RESERVADO</span>
                                </div>
                                <div className="small fw-semibold text-dark">
                                  {slot.reservado_por_nombre} {slot.reservado_por_apellido}
                                </div>
                                {slot.motivo_reserva && (
                                  <div className="text-secondary small">{slot.motivo_reserva}</div>
                                )}
                              </>
                            ) : (
                              <span className="badge bg-success">DISPONIBLE</span>
                            )}
                            <div className="mt-2">
                              <button className="btn btn-outline-danger btn-sm" type="button" onClick={() => remove(slot.id)}>Eliminar</button>
                            </div>
                          </div>
                        ))
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}