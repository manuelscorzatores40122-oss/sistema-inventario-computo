'use client';

import { useEffect, useState } from 'react';
import { FiUser, FiSearch, FiPackage, FiBookOpen, FiArrowLeft } from 'react-icons/fi';
import Link from 'next/link';
import { StatusBadge } from './CrudViews';

type Profesor = {
  id: number;
  nombre: string;
  apellido: string;
  area: string;
};

type Prestamo = {
  id: number;
  item_nombre: string;
  cantidad: number;
  fecha_prestamo: string;
  fecha_devolucion: string | null;
  estado: string;
  detalle: string;
};

type Clase = {
  id: number;
  sala_nombre: string;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  fecha_reserva: string | null;
  motivo_reserva: string;
  estado: string;
};

export default function AdminHistorialView() {
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfesor, setSelectedProfesor] = useState<number | null>(null);

  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [clases, setClases] = useState<Clase[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetch('/api/usuarios?role=profesor&activo=true')
      .then((res) => res.json())
      .then((data) => setProfesores(data.usuarios || []))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedProfesor) {
      setPrestamos([]);
      setClases([]);
      return;
    }

    setLoadingHistory(true);
    Promise.all([
      fetch(`/api/prestamos?profesor_id=${selectedProfesor}`).then(r => r.json()),
      fetch(`/api/disponibilidad?reservado_por=${selectedProfesor}`).then(r => r.json())
    ])
      .then(([prestamosData, clasesData]) => {
        setPrestamos(prestamosData.prestamos || []);
        setClases(clasesData.disponibilidades || []);
      })
      .catch(e => console.error(e))
      .finally(() => setLoadingHistory(false));
  }, [selectedProfesor]);

  const profesorObj = profesores.find(p => p.id === selectedProfesor);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="d-flex align-items-center gap-3 border-b border-slate-200 pb-4">
        <Link href="/admin/dashboard" className="btn-secondary-custom d-inline-flex align-items-center justify-content-center p-2" style={{ width: '40px', height: '40px' }} title="Volver al inicio">
          <FiArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight d-flex align-items-center gap-2">
            <FiUser className="text-primary" size={26} />
            Historial por Profesor
          </h1>
          <p className="mt-1 text-sm text-slate-600 mb-0">
            Busca a un profesor para ver todos sus equipos prestados y sus reservas del aula de cómputo.
          </p>
        </div>
      </div>

      <div className="inventory-panel p-4 mb-4">
        <label className="inventory-form-label d-flex align-items-center gap-2">
          <FiSearch className="text-slate-500" /> Buscar Profesor
        </label>
        <select
          className="inventory-form-select"
          value={selectedProfesor || ''}
          onChange={(e) => setSelectedProfesor(e.target.value ? Number(e.target.value) : null)}
          disabled={loading}
        >
          <option value="">-- Seleccionar un profesor --</option>
          {profesores.map((p) => (
            <option key={p.id} value={p.id}>
              {p.apellido}, {p.nombre} {p.area ? `(${p.area})` : ''}
            </option>
          ))}
        </select>
      </div>

      {selectedProfesor && (
        <div className="animate__animated animate__fadeIn">
          <div className="d-flex align-items-center gap-2 mb-4 bg-primary bg-opacity-10 text-primary p-3 rounded border border-blue-200">
            <FiUser size={20} />
            <h3 className="mb-0 fw-bold">Historial de: {profesorObj?.nombre} {profesorObj?.apellido}</h3>
          </div>

          <div className="inventory-panel p-4 mb-5 overflow-x-auto">
            <h2 className="text-lg font-bold text-slate-900 d-flex align-items-center gap-2 mb-3">
              <span className="rounded d-flex align-items-center justify-content-center bg-blue-50 text-blue-700" style={{ width: '30px', height: '30px' }}>
                <FiPackage size={15} />
              </span>
              Préstamos de Equipos
            </h2>
            {loadingHistory ? (
              <div className="text-center py-4 text-slate-500">Cargando préstamos...</div>
            ) : (
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Equipo</th>
                    <th>Cant.</th>
                    <th>Detalle</th>
                    <th>Fecha de Préstamo</th>
                    <th>Fecha de Entrega</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {prestamos.map((p) => (
                    <tr key={p.id}>
                      <td className="font-bold text-slate-900">{p.item_nombre}</td>
                      <td className="font-semibold">{p.cantidad}</td>
                      <td className="text-xs text-slate-600">{p.detalle || '-'}</td>
                      <td className="text-xs text-slate-500">{new Date(p.fecha_prestamo).toLocaleString('es-ES', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="text-xs text-slate-500">{p.fecha_devolucion ? new Date(p.fecha_devolucion).toLocaleString('es-ES', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      <td><StatusBadge value={p.estado} /></td>
                    </tr>
                  ))}
                  {prestamos.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-6 text-slate-500">No hay historial de préstamos para este profesor.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div className="inventory-panel p-4 overflow-x-auto">
            <h2 className="text-lg font-bold text-slate-900 d-flex align-items-center gap-2 mb-3">
              <span className="rounded d-flex align-items-center justify-content-center bg-blue-50 text-blue-700" style={{ width: '30px', height: '30px' }}>
                <FiBookOpen size={15} />
              </span>
              Reservas del Aula de Cómputo
            </h2>
            {loadingHistory ? (
              <div className="text-center py-4 text-slate-500">Cargando reservas...</div>
            ) : (
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Día de la semana</th>
                    <th>Horario</th>
                    <th>Fecha de Reserva</th>
                    <th>Motivo / Materia</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {clases
                    .sort((a, b) => (b.fecha_reserva || '').localeCompare(a.fecha_reserva || ''))
                    .map((c) => (
                      <tr key={c.id}>
                        <td className="font-semibold">{c.dia_semana}</td>
                        <td className="font-mono">{c.hora_inicio} - {c.hora_fin}</td>
                        <td className="text-xs text-slate-600">{c.fecha_reserva ? new Date(c.fecha_reserva).toLocaleString('es-ES', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Horario Base (Semestral)'}</td>
                        <td className="text-sm">{c.motivo_reserva || '-'}</td>
                        <td>
                          <span className={`badge rounded-pill ${c.estado === 'separado' ? 'bg-primary' : c.estado === 'disponible' ? 'bg-success' : 'bg-secondary'}`}>
                            {c.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  {clases.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-6 text-slate-500">No hay historial de reservas para este profesor.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
