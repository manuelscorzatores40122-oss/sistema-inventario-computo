'use client';

import { useState, useEffect } from 'react';

interface Solicitud {
  id: number;
  profesor_nombre: string;
  item_nombre: string;
  cantidad_solicitada: number;
  estado: string;
  fecha_solicitud: string;
}

const adminLinks = [
  {
    href: '/admin/inventario',
    title: 'Inventario',
    text: 'Control de productos y stock',
    icon: '▣',
  },
  {
    href: '/admin/profesores',
    title: 'Profesores',
    text: 'Usuarios y accesos',
    icon: '♙',
  },
  {
    href: '/admin/disponibilidad',
    title: 'Disponibilidad',
    text: 'Horarios y reservas',
    icon: '◷',
  },
  {
    href: '/admin/solicitudes',
    title: 'Solicitudes',
    text: 'Historial y aprobaciones',
    icon: '✓',
  },
];

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

      {/* MENÚ LATERAL */}
      <aside
        className="position-fixed top-0 start-0 h-100 bg-dark text-white"
        style={{
          width: '260px',
          zIndex: 1000,
        }}
      >
        {/* LOGO */}
        <div className="p-4 border-bottom border-secondary">
          <h2 className="h5 fw-bold mb-1">
            Sistema de Inventario
          </h2>

          <p className="text-secondary small mb-0">
            Panel de Administración
          </p>
        </div>

        {/* USUARIO */}
        <div className="p-4 border-bottom border-secondary">
          <div className="d-flex align-items-center">

            <div
              className="rounded-circle bg-primary d-flex align-items-center justify-content-center fw-bold me-3"
              style={{
                width: '42px',
                height: '42px',
              }}
            >
              {user?.nombre?.charAt(0)?.toUpperCase() || 'A'}
            </div>

            <div>
              <div className="fw-semibold">
                {user?.nombre || 'Administrador'}
              </div>

              <div className="text-secondary small">
                Administrador
              </div>
            </div>

          </div>
        </div>

        {/* NAVEGACIÓN */}
        <nav className="p-3">

          <div className="text-uppercase text-secondary small fw-bold px-3 mb-2">
            Menú principal
          </div>

          <a
            href="/admin"
            className="d-flex align-items-center text-white text-decoration-none rounded px-3 py-3 mb-1"
            style={{
              backgroundColor: '#0d6efd',
            }}
          >
            <span className="me-3">⌂</span>
            <span className="fw-semibold">Dashboard</span>
          </a>

          {adminLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="d-flex align-items-center text-light text-decoration-none rounded px-3 py-3 mb-1"
              style={{
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#343a40';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span
                className="me-3 d-flex align-items-center justify-content-center"
                style={{
                  width: '24px',
                }}
              >
                {link.icon}
              </span>

              <span>{link.title}</span>
            </a>
          ))}

        </nav>

        {/* PARTE INFERIOR */}
        <div
          className="position-absolute bottom-0 start-0 end-0 p-3 border-top border-secondary"
        >
          <div className="small text-secondary px-2">
            Sistema de Gestión
          </div>

          <div className="small text-secondary px-2">
            Administración
          </div>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main
        style={{
          marginLeft: '260px',
        }}
      >

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

                  <a
                    href="/admin/inventario"
                    className="btn btn-outline-primary btn-sm"
                  >
                    Ir al inventario
                  </a>

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

                  <a
                    href="/admin/profesores"
                    className="btn btn-outline-primary btn-sm"
                  >
                    Ver profesores
                  </a>

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

                <a
                  href="/admin/solicitudes"
                  className="btn btn-outline-primary btn-sm"
                >
                  Ver todas
                </a>

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

      </main>

    </div>
  );
}

