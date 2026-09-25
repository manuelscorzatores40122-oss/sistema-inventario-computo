'use client';

import { useEffect, useState } from 'react';
import { FiUser, FiSearch, FiPackage, FiBookOpen, FiArrowLeft, FiX } from 'react-icons/fi';
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
  const [searchTerm, setSearchTerm] = useState('');

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

      <div className="inventory-panel p-4 md:p-5 mb-4 border-0 shadow-sm rounded-4" style={{ backgroundColor: '#ffffff' }}>
        <label className="fw-bold text-slate-800 mb-3" style={{ fontSize: '1.1rem' }}>
          Buscar Profesor
        </label>
        <div className="position-relative">
          <div className="position-absolute d-flex align-items-center justify-content-center h-100" style={{ width: '50px', left: 0, top: 0 }}>
            <FiSearch className="text-slate-400" size={20} />
          </div>
          <input
            type="text"
            className="form-control shadow-none"
            style={{ 
              paddingLeft: '50px', 
              paddingRight: selectedProfesor ? '50px' : '16px',
              height: '56px', 
              fontSize: '1.05rem', 
              borderRadius: '12px',
              border: '2px solid var(--color-slate-200)',
              backgroundColor: 'var(--color-slate-50)',
              transition: 'all 0.2s ease',
              outline: 'none',
              boxShadow: 'none'
            }}
            placeholder="Escribe el nombre o apellido del profesor..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSelectedProfesor(null);
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--color-primary)';
              e.target.style.backgroundColor = '#ffffff';
              e.target.style.boxShadow = '0 0 0 4px rgba(37, 99, 235, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--color-slate-200)';
              e.target.style.backgroundColor = 'var(--color-slate-50)';
              e.target.style.boxShadow = 'none';
            }}
            disabled={loading}
          />
          {selectedProfesor && (
            <button
              className="position-absolute d-flex align-items-center justify-content-center h-100 bg-transparent border-0"
              style={{ width: '50px', right: 0, top: 0, cursor: 'pointer', transition: 'color 0.2s' }}
              onClick={() => {
                setSelectedProfesor(null);
                setSearchTerm('');
              }}
              title="Limpiar búsqueda"
            >
              <FiX className="text-slate-400" size={22} onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'} onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'} />
            </button>
          )}

          {searchTerm && !selectedProfesor && (
            <div 
              className="position-absolute w-100 mt-2 bg-white rounded-4 overflow-hidden animate__animated animate__fadeIn animate__faster" 
              style={{ zIndex: 1000, maxHeight: '350px', border: '1px solid var(--color-slate-200)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
            >
              {profesores
                .filter(p => `${p.nombre} ${p.apellido}`.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(p => (
                  <button
                    key={p.id}
                    className="w-100 text-start d-flex align-items-center gap-3"
                    style={{
                      padding: '14px 20px',
                      border: 'none',
                      borderBottom: '1px solid var(--color-slate-100)',
                      backgroundColor: 'transparent',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-slate-50)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    onClick={() => {
                      setSelectedProfesor(p.id);
                      setSearchTerm(`${p.apellido}, ${p.nombre}`);
                    }}
                  >
                    <div className="rounded-circle d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary flex-shrink-0" style={{ width: '42px', height: '42px' }}>
                      <FiUser size={18} />
                    </div>
                    <div>
                      <div className="fw-bold text-slate-800" style={{ fontSize: '1.05rem', marginBottom: '2px' }}>
                        {p.apellido}, {p.nombre}
                      </div>
                      {p.area && (
                        <div className="text-slate-500 fw-semibold" style={{ fontSize: '0.8rem' }}>
                          Área / Curso: {p.area}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              {profesores.filter(p => `${p.nombre} ${p.apellido}`.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                <div className="p-5 text-center text-slate-500 d-flex flex-column align-items-center gap-2">
                  <FiSearch size={28} className="text-slate-300 mb-2" />
                  <div className="fw-semibold text-slate-700">No se encontraron profesores</div>
                  <div className="text-sm">Prueba con otro nombre o apellido.</div>
                </div>
              )}
            </div>
          )}
        </div>
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
