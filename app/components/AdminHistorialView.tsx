'use client';

import { useEffect, useState } from 'react';
import {
  FiUser,
  FiSearch,
  FiPackage,
  FiBookOpen,
  FiArrowLeft,
  FiX,
  FiCalendar,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiInfo,
  FiFilter,
  FiLayers,
  FiHash,
} from 'react-icons/fi';
import Link from 'next/link';

type Profesor = {
  id: number;
  nombre: string;
  apellido: string;
  email?: string;
  area?: string;
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

  const [activeTab, setActiveTab] = useState<'prestamos' | 'reservas'>('prestamos');

  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

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
    let prestamosUrl = `/api/prestamos?profesor_id=${selectedProfesor}`;
    if (fechaInicio) prestamosUrl += `&desde=${fechaInicio}`;
    if (fechaFin) prestamosUrl += `&hasta=${fechaFin}`;

    Promise.all([
      fetch(prestamosUrl).then((r) => r.json()),
      fetch(`/api/disponibilidad?reservado_por=${selectedProfesor}`).then((r) => r.json()),
    ])
      .then(([prestamosData, clasesData]) => {
        setPrestamos(prestamosData.prestamos || []);
        setClases(clasesData.disponibilidades || []);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoadingHistory(false));
  }, [selectedProfesor, fechaInicio, fechaFin]);

  const profesorObj = profesores.find((p) => p.id === selectedProfesor);

  // Filtrado de clases por fecha de reserva si está definida
  const filteredClases = clases.filter((c) => {
    if (!c.fecha_reserva) return true;
    const dateStr = c.fecha_reserva.split('T')[0];
    if (fechaInicio && dateStr < fechaInicio) return false;
    if (fechaFin && dateStr > fechaFin) return false;
    return true;
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Superior */}
      <div className="d-flex align-items-center justify-content-between gap-3 border-b border-slate-200 pb-4">
        <div className="d-flex align-items-center gap-3">
          <Link
            href="/admin/dashboard"
            className="btn-secondary-custom d-inline-flex align-items-center justify-content-center p-2 rounded-circle shadow-sm"
            style={{ width: '42px', height: '42px', transition: 'transform 0.15s' }}
            title="Volver al dashboard"
          >
            <FiArrowLeft size={18} />
          </Link>
          <div>
            <span className="badge bg-primary bg-opacity-10 text-primary fw-bold text-uppercase px-2.5 py-1 mb-1" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>
              CONSULTA DE ACTIVIDAD
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-950 tracking-tight d-flex align-items-center gap-2 mb-0">
              Historial del Personal Docente
            </h1>
          </div>
        </div>
      </div>

      {/* Buscador de Profesor Elegante */}
      <div className="inventory-panel p-4 md:p-5 border-0 shadow-sm rounded-4 bg-white">
        <label className="fw-bold text-slate-800 mb-2 d-flex align-items-center gap-2" style={{ fontSize: '1rem' }}>
          <FiSearch className="text-primary" size={18} />
          Selecciona o busca a un profesor
        </label>
        <div className="position-relative">
          <div className="position-absolute d-flex align-items-center justify-content-center h-100" style={{ width: '48px', left: 0, top: 0 }}>
            <FiSearch className="text-slate-400" size={18} />
          </div>
          <input
            type="text"
            className="form-control shadow-none"
            style={{
              paddingLeft: '48px',
              paddingRight: selectedProfesor ? '48px' : '16px',
              height: '52px',
              fontSize: '1rem',
              borderRadius: '14px',
              border: '2px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              transition: 'all 0.2s ease',
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
              e.target.style.boxShadow = '0 0 0 4px rgba(37, 99, 235, 0.08)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e2e8f0';
              e.target.style.backgroundColor = '#f8fafc';
              e.target.style.boxShadow = 'none';
            }}
            disabled={loading}
          />
          {selectedProfesor && (
            <button
              className="position-absolute d-flex align-items-center justify-content-center h-100 bg-transparent border-0"
              style={{ width: '48px', right: 0, top: 0, cursor: 'pointer' }}
              onClick={() => {
                setSelectedProfesor(null);
                setSearchTerm('');
              }}
              title="Limpiar profesor seleccionado"
            >
              <FiX className="text-slate-400" size={20} />
            </button>
          )}

          {/* Autocompletado */}
          {searchTerm && !selectedProfesor && (
            <div
              className="position-absolute w-100 mt-2 bg-white rounded-4 overflow-hidden shadow-lg border"
              style={{ zIndex: 1000, maxHeight: '320px', borderColor: '#e2e8f0' }}
            >
              {profesores
                .filter((p) => `${p.nombre} ${p.apellido}`.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((p) => (
                  <button
                    key={p.id}
                    className="w-100 text-start d-flex align-items-center gap-3 p-3 bg-transparent border-bottom border-slate-100"
                    style={{ transition: 'background-color 0.15s ease', cursor: 'pointer' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    onClick={() => {
                      setSelectedProfesor(p.id);
                      setSearchTerm(`${p.apellido}, ${p.nombre}`);
                    }}
                  >
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary fw-bold flex-shrink-0"
                      style={{ width: '40px', height: '40px', fontSize: '15px' }}
                    >
                      {p.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="fw-bold text-slate-800" style={{ fontSize: '0.98rem' }}>
                        {p.apellido}, {p.nombre}
                      </div>
                      {p.area && (
                        <div className="text-slate-500 font-semibold" style={{ fontSize: '0.78rem' }}>
                          Área: {p.area}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              {profesores.filter((p) => `${p.nombre} ${p.apellido}`.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                <div className="p-4 text-center text-slate-500">
                  <FiSearch size={22} className="text-slate-300 mb-1" />
                  <div className="fw-semibold text-slate-700">No se encontraron profesores</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Historial del Profesor Seleccionado */}
      {selectedProfesor && profesorObj && (
        <div className="space-y-5 animate__animated animate__fadeIn">
          {/* Card Hero del Profesor */}
          <div
            className="rounded-4 p-4 text-white shadow-sm d-flex flex-column flex-md-row align-items-md-center justify-content-md-between gap-4"
            style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              border: '1px solid #334155',
            }}
          >
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow"
                style={{
                  width: '58px',
                  height: '58px',
                  fontSize: '22px',
                  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                }}
              >
                {profesorObj.nombre.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="d-flex align-items-center gap-2">
                  <h2 className="text-xl md:text-2xl font-extrabold mb-0 text-white">
                    {profesorObj.nombre} {profesorObj.apellido}
                  </h2>
                </div>
                <div className="d-flex align-items-center gap-3 mt-1 text-slate-300 text-xs flex-wrap">
                  {profesorObj.email && (
                    <span className="d-flex align-items-center gap-1">
                      <FiHash size={13} className="text-blue-400" /> DNI: <strong>{profesorObj.email}</strong>
                    </span>
                  )}
                  {profesorObj.area && (
                    <span className="d-flex align-items-center gap-1 bg-slate-800 px-2 py-0.5 rounded text-blue-300 border border-slate-700">
                      <FiBookOpen size={12} /> {profesorObj.area}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Badges de Conteo de Actividad */}
            <div className="d-flex align-items-center gap-2">
              <div className="bg-slate-800 bg-opacity-80 border border-slate-700 rounded-3 px-3 py-2 text-center" style={{ minWidth: '100px' }}>
                <span className="text-slate-400 text-xs font-bold uppercase d-block">Préstamos</span>
                <span className="text-xl font-black text-blue-400">{prestamos.length}</span>
              </div>
              <div className="bg-slate-800 bg-opacity-80 border border-slate-700 rounded-3 px-3 py-2 text-center" style={{ minWidth: '100px' }}>
                <span className="text-slate-400 text-xs font-bold uppercase d-block">Reservas</span>
                <span className="text-xl font-black text-indigo-400">{filteredClases.length}</span>
              </div>
            </div>
          </div>

          {/* Barra de Filtro de Fechas */}
          <div className="bg-white rounded-4 p-3 border shadow-sm d-flex flex-wrap align-items-center justify-content-between gap-3" style={{ borderColor: '#e2e8f0' }}>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <span className="fw-bold text-slate-700 text-sm d-flex align-items-center gap-1.5 me-2">
                <FiFilter size={15} className="text-primary" /> Filtrar por rango de fechas:
              </span>
              <div className="d-flex align-items-center gap-1.5">
                <span className="text-xs text-slate-500 font-semibold">Desde:</span>
                <input
                  type="date"
                  className="form-control form-control-sm rounded-3"
                  style={{ width: '145px', border: '1px solid #cbd5e1' }}
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                />
              </div>
              <div className="d-flex align-items-center gap-1.5">
                <span className="text-xs text-slate-500 font-semibold">Hasta:</span>
                <input
                  type="date"
                  className="form-control form-control-sm rounded-3"
                  style={{ width: '145px', border: '1px solid #cbd5e1' }}
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                />
              </div>
              {(fechaInicio || fechaFin) && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary rounded-3 d-inline-flex align-items-center gap-1 ms-1"
                  onClick={() => {
                    setFechaInicio('');
                    setFechaFin('');
                  }}
                >
                  <FiX size={14} /> Limpiar fechas
                </button>
              )}
            </div>
          </div>

          {/* Pestañas de Navegación Suaves */}
          <div className="d-flex align-items-center gap-2 border-b border-slate-200 pb-1">
            <button
              className={`px-4 py-2.5 rounded-3 fw-bold text-sm d-inline-flex align-items-center gap-2 transition-all border-0 ${
                activeTab === 'prestamos'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-transparent text-slate-600 hover:bg-slate-100'
              }`}
              onClick={() => setActiveTab('prestamos')}
              style={{ cursor: 'pointer' }}
            >
              <FiPackage size={16} />
              Préstamos de Equipos
              <span
                className={`badge rounded-pill ms-1 ${
                  activeTab === 'prestamos' ? 'bg-white text-primary' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {prestamos.length}
              </span>
            </button>

            <button
              className={`px-4 py-2.5 rounded-3 fw-bold text-sm d-inline-flex align-items-center gap-2 transition-all border-0 ${
                activeTab === 'reservas'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-transparent text-slate-600 hover:bg-slate-100'
              }`}
              onClick={() => setActiveTab('reservas')}
              style={{ cursor: 'pointer' }}
            >
              <FiBookOpen size={16} />
              Reservas del Aula de Cómputo
              <span
                className={`badge rounded-pill ms-1 ${
                  activeTab === 'reservas' ? 'bg-white text-primary' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {filteredClases.length}
              </span>
            </button>
          </div>

          {/* Contenido Pestaña 1: Préstamos */}
          {activeTab === 'prestamos' && (
            <div className="bg-white rounded-4 border shadow-sm overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
              {loadingHistory ? (
                <div className="text-center py-12 text-slate-500 font-semibold">Cargando préstamos...</div>
              ) : prestamos.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <FiPackage size={36} className="mx-auto mb-2 text-slate-300" />
                  <div className="fw-semibold text-slate-700">No hay historial de préstamos para este docente</div>
                  <p className="text-xs text-slate-400 mb-0">Prueba ajustando el rango de fechas si especificaste uno.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table align-middle mb-0" style={{ fontSize: '0.9rem' }}>
                    <thead className="bg-slate-50 border-bottom" style={{ borderColor: '#e2e8f0' }}>
                      <tr>
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Equipo / Artículo</th>
                        <th className="py-3 px-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Cant.</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Detalle</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha Préstamo</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha Devolución</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-end">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {prestamos.map((p) => (
                        <tr key={p.id} style={{ transition: 'background-color 0.15s' }}>
                          <td className="py-3 px-4 font-bold text-slate-900">{p.item_nombre}</td>
                          <td className="py-3 px-3 font-semibold text-center">
                            <span className="badge bg-slate-100 text-slate-800 border px-2.5 py-1">{p.cantidad}</span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600">{p.detalle || '-'}</td>
                          <td className="py-3 px-4 text-xs text-slate-600">
                            {new Date(p.fecha_prestamo).toLocaleString('es-PE', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600">
                            {p.fecha_devolucion
                              ? new Date(p.fecha_devolucion).toLocaleString('es-PE', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '-'}
                          </td>
                          <td className="py-3 px-4 text-end">
                            <BadgePrestamo estado={p.estado} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Contenido Pestaña 2: Reservas del Aula */}
          {activeTab === 'reservas' && (
            <div className="bg-white rounded-4 border shadow-sm overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
              {loadingHistory ? (
                <div className="text-center py-12 text-slate-500 font-semibold">Cargando reservas...</div>
              ) : filteredClases.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <FiBookOpen size={36} className="mx-auto mb-2 text-slate-300" />
                  <div className="fw-semibold text-slate-700">No hay reservas registradas del aula de cómputo</div>
                  <p className="text-xs text-slate-400 mb-0">Prueba ajustando el rango de fechas si especificaste uno.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table align-middle mb-0" style={{ fontSize: '0.9rem' }}>
                    <thead className="bg-slate-50 border-bottom" style={{ borderColor: '#e2e8f0' }}>
                      <tr>
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Día</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Horario</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha de Reserva</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Materia / Motivo</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-end">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredClases
                        .sort((a, b) => (b.fecha_reserva || '').localeCompare(a.fecha_reserva || ''))
                        .map((c) => (
                          <tr key={c.id} style={{ transition: 'background-color 0.15s' }}>
                            <td className="py-3 px-4 font-bold text-slate-900">{c.dia_semana}</td>
                            <td className="py-3 px-4 font-mono text-xs text-slate-800">
                              <span className="badge bg-slate-100 text-slate-700 border border-slate-200 px-2 py-1">
                                {c.hora_inicio} - {c.hora_fin}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-600">
                              {c.fecha_reserva
                                ? new Date(c.fecha_reserva).toLocaleString('es-PE', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : 'Horario Semestral'}
                            </td>
                            <td className="py-3 px-4 text-sm font-semibold text-slate-800">{c.motivo_reserva || '-'}</td>
                            <td className="py-3 px-4 text-end">
                              <BadgeReserva estado={c.estado} />
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BadgePrestamo({ estado }: { estado: string }) {
  if (estado === 'devuelto') {
    return (
      <span className="badge bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-pill d-inline-flex align-items-center gap-1 font-semibold" style={{ backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
        <FiCheckCircle size={12} /> Devuelto
      </span>
    );
  }
  if (estado === 'prestado') {
    return (
      <span className="badge bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-pill d-inline-flex align-items-center gap-1 font-semibold" style={{ backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>
        <FiClock size={12} /> En préstamo
      </span>
    );
  }
  return (
    <span className="badge bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-pill d-inline-flex align-items-center gap-1 font-semibold" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
      <FiInfo size={12} /> {estado}
    </span>
  );
}

function BadgeReserva({ estado }: { estado: string }) {
  if (estado === 'separado') {
    return (
      <span className="badge bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-pill d-inline-flex align-items-center gap-1 font-semibold" style={{ backgroundColor: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' }}>
        <FiCheckCircle size={12} /> Reserva Confirmada
      </span>
    );
  }
  if (estado === 'pendiente') {
    return (
      <span className="badge bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-pill d-inline-flex align-items-center gap-1 font-semibold" style={{ backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>
        <FiClock size={12} /> Pendiente
      </span>
    );
  }
  return (
    <span className="badge bg-slate-100 text-slate-700 border px-2.5 py-1 rounded-pill font-semibold">
      {estado}
    </span>
  );
}
