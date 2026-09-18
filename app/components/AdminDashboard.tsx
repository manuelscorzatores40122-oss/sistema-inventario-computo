'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
    }
  };

  const handleRechazar = async (solicitudId: number) => {
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
              <div className="small text-secondary">
                Sesión iniciada como
              </div>

              <div className="fw-semibold text-dark">
                {user?.nombre || 'Administrador'}
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
                      className="rounded p-3 bg-warning bg-opacity-10 text-warning"
                    >
                      ✓
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

                  <p className="text-secondary small fw-semibold mb-2">
                    MÓDULO DE INVENTARIO
                  </p>

                  <h2 className="h4 fw-bold text-dark">
                    Gestión de Stock
                  </h2>

                  <p className="text-secondary small mb-3">
                    Administra productos y cantidades disponibles.
                  </p>

                  <Link
                    href="/admin/inventario"
                    className="btn btn-outline-primary btn-sm"
                  >
                    Ir al inventario
                  </Link>

                </div>

              </div>

            </div>

            <div className="col-12 col-md-4">

              <div className="card border-0 shadow-sm h-100">

                <div className="card-body p-4">

                  <p className="text-secondary small fw-semibold mb-2">
                    PROFESORES
                  </p>

                  <h2 className="h4 fw-bold text-dark">
                    Usuarios del sistema
                  </h2>

                  <p className="text-secondary small mb-3">
                    Gestiona profesores y sus accesos.
                  </p>

                  <Link
                    href="/admin/profesores"
                    className="btn btn-outline-primary btn-sm"
                  >
                    Ver profesores
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
                  className="btn btn-outline-primary btn-sm"
                >
                  Ver todas
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

                <div className="mb-3 fs-1 text-secondary">
                  ✓
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

                          <div className="fw-semibold text-dark">
                            {solicitud.profesor_nombre}
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

                          <span className="badge bg-warning text-dark">
                            Pendiente
                          </span>

                        </td>

                        <td className="px-4">

                          <button
                            onClick={() =>
                              handleAprobar(solicitud.id)
                            }
                            className="btn btn-success btn-sm me-2"
                          >
                            Aprobar
                          </button>

                          <button
                            onClick={() =>
                              handleRechazar(solicitud.id)
                            }
                            className="btn btn-danger btn-sm"
                          >
                            Rechazar
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

