'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
};

type Profesor = {
  id: number;
  nombre: string;
  apellido: string;
};

type Message = { type: 'success' | 'error'; text: string } | null;

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function AdminHorarioView() {
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidad[]>([]);
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Message>(null);

  const [slotReservando, setSlotReservando] = useState<Disponibilidad | null>(null);
  const [reservando, setReservando] = useState(false);
  const [liberandoId, setLiberandoId] = useState<number | null>(null);
  const [profesorId, setProfesorId] = useState(0);
  const [motivo, setMotivo] = useState('');

  const fetchData = async () => {
    const [dispRes, profRes] = await Promise.all([
      fetch('/api/disponibilidad'),
      fetch('/api/usuarios?role=profesor&activo=true'),
    ]);

    if (dispRes.ok) {
      const data = await dispRes.json();
      setDisponibilidades(data.disponibilidades || []);
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

  const abrirReserva = (slot: Disponibilidad) => {
    setSlotReservando(slot);
    setProfesorId(0);
    setMotivo('');
  };

  const confirmarReserva = async () => {
    if (!slotReservando || !profesorId) {
      setMessage({ type: 'error', text: 'Selecciona un profesor para reservar' });
      return;
    }

    setReservando(true);

    try {
      const response = await fetch(`/api/disponibilidad/${slotReservando.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: 'separado',
          reservado_por: profesorId,
          motivo_reserva: motivo || `Reserva de sala de cómputo`,
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Horario reservado correctamente' });
        setSlotReservando(null);
        fetchData();
      } else {
        const data = await response.json().catch(() => null);
        setMessage({ type: 'error', text: data?.error || 'No se pudo reservar el horario' });
      }
    } catch (error) {
      console.error('Error al reservar:', error);
      setMessage({ type: 'error', text: 'Error al reservar el horario' });
    } finally {
      setReservando(false);
    }
  };

  const liberar = async (id: number) => {
    if (!confirm('¿Liberar este horario?')) return;

    setLiberandoId(id);

    try {
      const response = await fetch(`/api/disponibilidad/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'disponible' }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Horario liberado correctamente' });
        fetchData();
      } else {
        const data = await response.json().catch(() => null);
        setMessage({ type: 'error', text: data?.error || 'No se pudo liberar el horario' });
      }
    } catch (error) {
      console.error('Error al liberar:', error);
      setMessage({ type: 'error', text: 'Error al liberar el horario' });
    } finally {
      setLiberandoId(null);
    }
  };

  const porDia = DIAS.map((dia) => ({
    dia,
    slots: disponibilidades
      .filter((d) => d.dia_semana === dia)
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio)),
  }));

  const total = disponibilidades.length;
  const disponibles = disponibilidades.filter((d) => d.estado === 'disponible').length;
  const separados = disponibilidades.filter((d) => d.estado === 'separado').length;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm font-semibold ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">Horario Semanal</h1>
          <p className="mt-1 text-sm text-slate-600">
            Matriz de uso de la Sala de Cómputo. Asigna profesores o libera bloques horarios.
          </p>
        </div>

        <Link href="/admin/disponibilidad" className="btn-secondary-custom text-decoration-none">
          Gestionar bloques disponibles
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="inventory-panel p-4 border-l-4 border-l-slate-700">
          <p className="text-xs font-bold uppercase text-slate-500">Total de Horarios Registrados</p>
          <h3 className="text-2xl font-black text-slate-900 mt-1">{loading ? '...' : total}</h3>
        </div>

        <div className="inventory-panel p-4 border-l-4 border-l-green-600">
          <p className="text-xs font-bold uppercase text-slate-500">Bloques Libres</p>
          <h3 className="text-2xl font-black text-green-600 mt-1">{loading ? '...' : disponibles}</h3>
        </div>

        <div className="inventory-panel p-4 border-l-4 border-l-red-600">
          <p className="text-xs font-bold uppercase text-slate-500">Bloques Reservados</p>
          <h3 className="text-2xl font-black text-red-600 mt-1">{loading ? '...' : separados}</h3>
        </div>
      </div>

      {loading ? (
        <div className="inventory-panel p-8 text-center text-slate-500 font-semibold">
          Cargando matriz semanal...
        </div>
      ) : total === 0 ? (
        <div className="inventory-panel p-8 text-center">
          <h3 className="text-lg font-bold text-slate-900">No hay horarios registrados</h3>
          <p className="text-sm text-slate-500 mt-1">
            Crea bloques de tiempo desde "Gestionar disponibilidad".
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-7">
          {porDia.map(({ dia, slots }) => (
            <div key={dia} className="inventory-panel flex flex-col">
              <div className="bg-slate-100 border-b border-slate-200 p-3 text-center">
                <h2 className="text-sm font-bold text-slate-900">{dia}</h2>
                <span className="text-xs font-semibold text-slate-500">{slots.length} bloque{slots.length !== 1 ? 's' : ''}</span>
              </div>

              <div className="p-2 space-y-2 flex-1">
                {slots.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Sin turnos</p>
                ) : (
                  slots.map((slot) => {
                    const isDisponible = slot.estado === 'disponible';

                    return (
                      <div
                        key={slot.id}
                        className={`rounded-lg p-2.5 border text-xs ${
                          isDisponible
                            ? 'border-green-200 bg-green-50 text-green-950'
                            : 'border-red-200 bg-red-50 text-red-950'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-slate-900">{slot.hora_inicio} - {slot.hora_fin}</span>
                        </div>

                        <div className="font-semibold text-slate-600 text-xs">
                          {slot.sala_nombre}
                        </div>

                        {!isDisponible && (
                          <div className="text-xs text-slate-700 mt-1 border-t border-red-200 pt-1">
                            <div className="font-bold">{slot.reservado_por_nombre} {slot.reservado_por_apellido}</div>
                            {slot.motivo_reserva && <div className="text-slate-600 truncate">{slot.motivo_reserva}</div>}
                          </div>
                        )}

                        <div className="mt-2">
                          {isDisponible ? (
                            <button
                              onClick={() => abrirReserva(slot)}
                              className="btn-primary-custom w-full text-xs py-1"
                            >
                              Reservar
                            </button>
                          ) : (
                            <button
                              onClick={() => liberar(slot.id)}
                              disabled={liberandoId === slot.id}
                              className="btn-danger-custom w-full text-xs py-1"
                            >
                              {liberandoId === slot.id ? 'Liberando...' : 'Liberar'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {slotReservando && (
        <>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog">
            <div className="modal-dialog" role="document">
              <div className="modal-content border-0 shadow-lg">
                <div className="modal-header border-b border-slate-200 p-4">
                  <h5 className="modal-title font-bold text-slate-900">Reservar Bloque Horario</h5>
                  <button type="button" className="btn-close" onClick={() => setSlotReservando(null)} />
                </div>

                <div className="modal-body p-4 space-y-4">
                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-900">
                    <strong>{slotReservando.sala_nombre}</strong> — {slotReservando.dia_semana}{' '}
                    {slotReservando.hora_inicio} - {slotReservando.hora_fin}
                  </div>

                  <div>
                    <label className="inventory-form-label">Profesor Asignado</label>
                    <select
                      value={profesorId}
                      onChange={(e) => setProfesorId(Number(e.target.value))}
                      className="inventory-form-select"
                    >
                      <option value="0">Seleccionar profesor...</option>
                      {profesores.map((profesor) => (
                        <option key={profesor.id} value={profesor.id}>
                          {profesor.nombre} {profesor.apellido}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="inventory-form-label">Motivo de Reserva (Opcional)</label>
                    <input
                      type="text"
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      className="inventory-form-input"
                      placeholder="Ej. Clase de Computación"
                    />
                  </div>
                </div>

                <div className="modal-footer border-t border-slate-200 p-3 flex justify-end gap-2">
                  <button
                    className="btn-secondary-custom"
                    onClick={() => setSlotReservando(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    className="btn-primary-custom"
                    disabled={reservando || !profesorId}
                    onClick={confirmarReserva}
                  >
                    {reservando ? 'Reservando...' : 'Confirmar Reserva'}
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