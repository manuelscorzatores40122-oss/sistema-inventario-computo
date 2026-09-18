'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FiInbox,
  FiPackage,
  FiUsers,
  FiCheckCircle,
  FiXCircle,
  FiArrowRight,
  FiUser,
} from 'react-icons/fi';

interface Solicitud {
  id: number;
  profesor_nombre: string;
  item_nombre: string;
  cantidad_solicitada: number;
  estado: string;
  fecha_solicitud: string;
}

export default function AdminDashboard() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [aprobarId, setAprobarId] = useState<number | null>(null);
  const [rechazarId, setRechazarId] = useState<number | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');

    if (userData) {
      setUser(JSON.parse(userData));
    }

    fetchSolicitudes();
  }, []);

  const fetchSolicitudes = async () => {
    try {
      const response = await fetch('/api/solicitudes?estado=pendiente');
      const data = await response.json();

      setSolicitudes(data.solicitudes || []);
    } catch (error) {
      console.error('Error al obtener solicitudes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAprobar = async (solicitudId: number) => {
    setAprobarId(solicitudId);
    try {
      const response = await fetch(`/api/solicitudes/${solicitudId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          estado: 'aprobada',
          admin_id: user?.id,
        }),
      });

      if (response.ok) {
        fetchSolicitudes();
      }
    } catch (error) {
      console.error('Error al aprobar:', error);
    } finally {
      setAprobarId(null);
    }
  };

  const handleRechazar = async (solicitudId: number) => {
    setRechazarId(solicitudId);
    try {
      const response = await fetch(`/api/solicitudes/${solicitudId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          estado: 'rechazada',
          admin_id: user?.id,
        }),
      });

      if (response.ok) {
        fetchSolicitudes();
      }
    } catch (error) {
      console.error('Error al rechazar:', error);
    } finally {
      setRechazarId(null);
    }
  };

  return (
    <div className="min-vh-100 bg-light">

      {/* CONTENIDO PRINCIPAL */}
      <div>

        {/* HEADER */}
        <header className="bg-white border-bottom px-4 py-3">
          <div className="d-flex justify-content-between align-items-center">

            <div>
              <h1 className="h4 fw-bold text-dark mb-1">
                Panel de Administración
              </h1>

              <p className="text-secondary small mb-0">
                Gestiona el inventario, profesores y solicitudes.
              </p>
            </div>

            <div className="text-end">
              <div className="d-flex align-items-center gap-2 justify-content-end">
                <FiUser className="text-secondary" size={18} />
                <div>
                  <div className="small text-secondary">
                    Sesión iniciada como
                  </div>

                  <div className="fw-semibold text-dark">
                    {user?.nombre || 'Administrador'}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </header>

        {/* CONTENIDO */}
        <div className="p-4">

          {/* ESTADÍSTICAS */}
          <div className="row g-4 mb-4">

            <div className="col-12 col-md-4">

              <div className="card border-0 shadow-sm h-100">

                <div className="card-body p-4">

                  <div className="d-flex justify-content-between align-items-start">

                    <div>
                      <p className="text-secondary small fw-semibold mb-2">
                        SOLICITUDES PENDIENTES
                      </p>

                      <h2 className="display-6 fw-bold text-dark mb-0">
                        {solicitudes.length}
                      </h2>
                    </div>

                    <div
                      className="rounded-3 d-flex align-items-center justify-content-center bg-warning bg-opacity-10 text-warning"
                      style={{ width: '48px', height: '48px' }}
                    >
                      <FiInbox size={24} />
                    </div>

                  </div>

                  <div className="mt-3 small text-secondary">
                    Solicitudes que requieren atención
                  </div>

                </div>

              </div>

            </div>

            <div className="col-12 col-md-4">

              <div className="card border-0 shadow-sm h-100">

                <div className="card-body p-4">

                  <div className="d-flex align-items-start mb-3">
                    <div
                      className="rounded-3 d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary me-3"
                      style={{ width: '48px', height: '48px', flexShrink: 0 }}
                    >
                      <FiPackage size={24} />
                    </div>

                    <div>
                      <p className="text-secondary small fw-semibold mb-1">
                        MÓDULO DE INVENTARIO
                      </p>

                      <h2 className="h4 fw-bold text-dark mb-0">
                        Gestión de Stock
                      </h2>
                    </div>
                  </div>

                  <p className="text-secondary small mb-3">
                    Administra productos y cantidades disponibles.
                  </p>

                  <Link
                    href="/admin/inventario"
                    className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-2"
                  >
                    Ir al inventario
                    <FiArrowRight size={14} />
                  </Link>

                </div>

              </div>

            </div>

            <div className="col-12 col-md-4">

              <div className="card border-0 shadow-sm h-100">

                <div className="card-body p-4">

                  <div className="d-flex align-items-start mb-3">
                    <div
                      className="rounded-3 d-flex align-items-center justify-content-center bg-success bg-opacity-10 text-success me-3"
                      style={{ width: '48px', height: '48px', flexShrink: 0 }}
                    >
                      <FiUsers size={24} />
                    </div>

                    <div>
                      <p className="text-secondary small fw-semibold mb-1">
                        PROFESORES
                      </p>

                      <h2 className="h4 fw-bold text-dark mb-0">
                        Usuarios del sistema
                      </h2>
                    </div>
                  </div>

                  <p className="text-secondary small mb-3">
                    Gestiona profesores y sus accesos.
                  </p>

                  <Link
                    href="/admin/profesores"
                    className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-2"
                  >
                    Ver profesores
                    <FiArrowRight size={14} />
                  </Link>

                </div>

              </div>

            </div>

          </div>

          {/* SOLICITUDES */}
          <div className="card shadow-sm border-0">

            <div className="card-header bg-white p-4">

              <div className="d-flex justify-content-between align-items-center">

                <div>
                  <h2 className="h5 fw-bold text-dark mb-1">
                    Solicitudes pendientes
                  </h2>

                  <p className="text-secondary small mb-0">
                    Revisa y administra las solicitudes de los profesores.
                  </p>
                </div>

                <Link
                  href="/admin/solicitudes"
                  className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-2"
                >
                  Ver todas
                  <FiArrowRight size={14} />
                </Link>

              </div>

            </div>

            {loading ? (

              <div className="p-5 text-center">

                <div
                  className="spinner-border text-primary mb-3"
                  role="status"
                />

                <div className="text-secondary">
                  Cargando solicitudes...
                </div>

              </div>

            ) : solicitudes.length === 0 ? (

              <div className="p-5 text-center">

                <div className="mb-3">
                  <FiCheckCircle className="text-success" size={56} />
                </div>

                <h3 className="h6 fw-bold text-dark">
                  No hay solicitudes pendientes
                </h3>

                <p className="text-secondary small mb-0">
                  Todas las solicitudes han sido procesadas.
                </p>

              </div>

            ) : (

              <div className="table-responsive">

                <table className="table table-hover align-middle mb-0">

                  <thead className="table-light">

                    <tr>

                      <th className="px-4 py-3 small text-secondary">
                        Profesor
                      </th>

                      <th className="py-3 small text-secondary">
                        Artículo
                      </th>

                      <th className="py-3 small text-secondary">
                        Cantidad
                      </th>

                      <th className="py-3 small text-secondary">
                        Fecha
                      </th>

                      <th className="py-3 small text-secondary">
                        Estado
                      </th>

                      <th className="px-4 py-3 small text-secondary">
                        Acciones
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {solicitudes.map((solicitud) => (

                      <tr key={solicitud.id}>

                        <td className="px-4">

                          <div className="d-flex align-items-center gap-2">
                            <div
                              className="rounded-circle bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center fw-bold"
                              style={{ width: '32px', height: '32px', fontSize: '13px' }}
                            >
                              {solicitud.profesor_nombre.charAt(0).toUpperCase()}
                            </div>
                            <div className="fw-semibold text-dark">
                              {solicitud.profesor_nombre}
                            </div>
                          </div>

                        </td>

                        <td>
                          {solicitud.item_nombre}
                        </td>

                        <td>
                          <span className="fw-semibold">
                            {solicitud.cantidad_solicitada}
                          </span>
                        </td>

                        <td className="text-secondary">

                          {new Date(
                            solicitud.fecha_solicitud
                          ).toLocaleDateString('es-PE')}

                        </td>

                        <td>

                          <span className="badge bg-warning text-dark d-inline-flex align-items-center gap-1">
                            <FiInbox size={12} />
                            Pendiente
                          </span>

                        </td>

                        <td className="px-4">

                          <button
                            onClick={() =>
                              handleAprobar(solicitud.id)
                            }
                            disabled={aprobarId === solicitud.id}
                            className="btn btn-success btn-sm d-inline-flex align-items-center gap-1 me-2"
                          >
                            <FiCheckCircle size={14} />
                            {aprobarId === solicitud.id ? 'Aprobando...' : 'Aprobar'}
                          </button>

                          <button
                            onClick={() =>
                              handleRechazar(solicitud.id)
                            }
                            disabled={rechazarId === solicitud.id}
                            className="btn btn-danger btn-sm d-inline-flex align-items-center gap-1"
                          >
                            <FiXCircle size={14} />
                            {rechazarId === solicitud.id ? 'Rechazando...' : 'Rechazar'}
                          </button>

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            )}

          </div>

        </div>

      </div>

    </div>
  );
}