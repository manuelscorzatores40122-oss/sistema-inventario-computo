
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
    href: '/admin/horario',
    title: 'Horario',
    text: 'Vista semanal de reservas',
    icon: '▦',
  },
  {
    href: '/admin/perfil',
    title: 'Perfil',
    text: 'Información y credenciales',
    icon: '●',
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
  const [procesando, setProcesando] = useState<number | null>(null);
  const [menuUsuario, setMenuUsuario] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');

    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error al leer usuario:', error);
      }
    }

    fetchSolicitudes();
  }, []);

  const fetchSolicitudes = async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/solicitudes?estado=pendiente');

      if (!response.ok) {
        throw new Error('Error al obtener solicitudes');
      }

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
      setProcesando(solicitudId);

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
        await fetchSolicitudes();
      } else {
        alert('No se pudo aprobar la solicitud.');
      }
    } catch (error) {
      console.error('Error al aprobar:', error);
      alert('Ocurrió un error al aprobar la solicitud.');
    } finally {
      setProcesando(null);
    }
  };

  const handleRechazar = async (solicitudId: number) => {
    const confirmar = window.confirm(
      '¿Está seguro de rechazar esta solicitud?'
    );

    if (!confirmar) {
      return;
    }

    try {
      setProcesando(solicitudId);

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
        await fetchSolicitudes();
      } else {
        alert('No se pudo rechazar la solicitud.');
      }
    } catch (error) {
      console.error('Error al rechazar:', error);
      alert('Ocurrió un error al rechazar la solicitud.');
    } finally {
      setProcesando(null);
    }
  };

  const handleSalir = () => {
    const confirmar = window.confirm(
      '¿Desea cerrar la sesión?'
    );

    if (!confirmar) {
      return;
    }

    localStorage.removeItem('user');

    window.location.href = '/login';
  };

  const inicial = user?.nombre
    ? user.nombre.charAt(0).toUpperCase()
    : 'A';

  return (
    <div className="min-vh-100 bg-light">

      {/* SIDEBAR */}

      <aside
        className="position-fixed top-0 start-0 h-100 bg-dark text-white shadow"
        style={{
          width: '260px',
          zIndex: 1000,
        }}
      >

        {/* LOGO */}

        <div className="p-4 border-bottom border-secondary">

          <div className="fw-bold fs-5">
            Sistema de Inventario
          </div>

          <div className="text-secondary small mt-1">
            Panel de Administración
          </div>

        </div>

        {/* USUARIO */}

        <div className="p-4 border-bottom border-secondary">

          <div className="d-flex align-items-center">

            <div
              className="rounded-circle bg-primary d-flex align-items-center justify-content-center fw-bold me-3"
              style={{
                width: '46px',
                height: '46px',
                minWidth: '46px',
              }}
            >
              {inicial}
            </div>

            <div className="overflow-hidden">

              <div
                className="fw-semibold text-truncate"
                style={{
                  maxWidth: '150px',
                }}
              >
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
            Principal
          </div>

          {/* DASHBOARD */}

          <a
            href="/admin"
            className="d-flex align-items-center text-white text-decoration-none rounded px-3 py-3 mb-1"
            style={{
              backgroundColor: '#0d6efd',
            }}
          >
            <span
              className="me-3"
              style={{
                width: '24px',
              }}
            >
              ⌂
            </span>

            <span className="fw-semibold">
              Dashboard
            </span>

          </a>

          {/* LINKS */}

          {adminLinks.map((link) => (

            <a
              key={link.href}
              href={link.href}
              className="d-flex align-items-center text-light text-decoration-none rounded px-3 py-3 mb-1"
              style={{
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#343a40';
                e.currentTarget.style.paddingLeft = '18px';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.paddingLeft = '16px';
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

              <div>

                <div>
                  {link.title}
                </div>

                <div
                  className="text-secondary"
                  style={{
                    fontSize: '11px',
                  }}
                >
                  {link.text}
                </div>

              </div>

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

          <div className="small text-secondary px-2 mt-1">
            Administración
          </div>

        </div>

      </aside>

      {/* CONTENIDO */}

      <main
        style={{
          marginLeft: '260px',
        }}
      >

        {/* HEADER */}

        <header className="bg-white border-bottom shadow-sm">

          <div className="px-4 py-3">

            <div className="d-flex justify-content-between align-items-center">

              <div>

                <div className="text-secondary small">
                  Administración
                </div>

                <h1 className="h4 fw-bold text-dark mb-1">
                  Panel de Administración
                </h1>

                <p className="text-secondary small mb-0">
                  Gestiona el inventario, profesores y solicitudes.
                </p>

              </div>

              {/* USUARIO HEADER */}

              <div className="position-relative">

                <button
                  type="button"
                  onClick={() => setMenuUsuario(!menuUsuario)}
                  className="btn btn-light border d-flex align-items-center gap-2 px-3 py-2"
                >

                  <div
                    className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold"
                    style={{
                      width: '36px',
                      height: '36px',
                    }}
                  >
                    {inicial}
                  </div>

                  <div className="text-start d-none d-md-block">

                    <div className="fw-semibold small text-dark">
                      {user?.nombre || 'Administrador'}
                    </div>

                    <div className="text-secondary"
                      style={{
                        fontSize: '11px',
                      }}
                    >
                      Administrador
                    </div>

                  </div>

                  <span className="text-secondary">
                    ▼
                  </span>

                </button>

                {/* MENÚ PERFIL */}

                {menuUsuario && (

                  <div
                    className="position-absolute bg-white border rounded shadow mt-2 end-0"
                    style={{
                      width: '210px',
                      zIndex: 1100,
                    }}
                  >

                    <div className="p-3 border-bottom">

                      <div className="fw-semibold text-dark">
                        {user?.nombre || 'Administrador'}
                      </div>

                      <div className="small text-secondary">
                        Cuenta de administrador
                      </div>

                    </div>

                    <div className="p-2">

                      <a
                        href="/admin/perfil"
                        className="d-flex align-items-center text-decoration-none text-dark rounded px-3 py-2"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f1f3f5';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <span className="me-3">
                          ◉
                        </span>

                        <span>
                          Mi perfil
                        </span>

                      </a>

                      <button
                        type="button"
                        onClick={handleSalir}
                        className="w-100 border-0 bg-transparent d-flex align-items-center text-danger rounded px-3 py-2"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#fff1f2';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <span className="me-3">
                          ←
                        </span>

                        <span>
                          Cerrar sesión
                        </span>

                      </button>

                    </div>

                  </div>

                )}

              </div>

            </div>

          </div>

        </header>

        {/* CONTENIDO PRINCIPAL */}

        <div className="p-4">

          {/* BIENVENIDA */}

          <div className="card border-0 shadow-sm mb-4">

            <div className="card-body p-4">

              <div className="row align-items-center">

                <div className="col">

                  <div className="text-primary small fw-bold text-uppercase mb-2">
                    Resumen general
                  </div>

                  <h2 className="h4 fw-bold text-dark mb-2">
                    Bienvenido, {user?.nombre || 'Administrador'}
                  </h2>

                  <p className="text-secondary mb-0">
                    Desde este panel puedes administrar los recursos
                    principales del sistema.
                  </p>

                </div>

                <div className="col-auto d-none d-md-block">

                  <div
                    className="bg-primary bg-opacity-10 text-primary rounded-3 p-3 text-center"
                    style={{
                      minWidth: '100px',
                    }}
                  >

                    <div className="small fw-semibold">
                      Pendientes
                    </div>

                    <div className="fs-2 fw-bold">
                      {solicitudes.length}
                    </div>

                  </div>

                </div>

              </div>

            </div>

          </div>

          {/* ESTADÍSTICAS */}

          <div className="row g-4 mb-4">

            {/* SOLICITUDES */}

            <div className="col-12 col-md-4">

              <div className="card border-0 shadow-sm h-100">

                <div className="card-body p-4">

                  <div className="d-flex justify-content-between align-items-start">

                    <div>

                      <p className="text-secondary small fw-semibold mb-2">
                        SOLICITUDES PENDIENTES
                      </p>

                      <h2 className="display-6 fw-bold text-dark mb-0">
                        {loading ? '...' : solicitudes.length}
                      </h2>

                    </div>

                    <div className="rounded-3 p-3 bg-warning bg-opacity-10 text-warning fw-bold">
                      !
                    </div>

                  </div>

                  <div className="mt-3 small text-secondary">
                    Solicitudes que requieren atención.
                  </div>

                </div>

              </div>

            </div>

            {/* INVENTARIO */}

            <div className="col-12 col-md-4">

              <div className="card border-0 shadow-sm h-100">

                <div className="card-body p-4">

                  <p className="text-secondary small fw-semibold mb-2">
                    INVENTARIO
                  </p>

                  <h2 className="h4 fw-bold text-dark mb-2">
                    Gestión de Stock
                  </h2>

                  <p className="text-secondary small mb-3">
                    Administra productos, categorías y cantidades.
                  </p>

                  <a
                    href="/admin/inventario"
                    className="btn btn-outline-primary btn-sm"
                  >
                    Administrar inventario
                  </a>

                </div>

              </div>

            </div>

            {/* PROFESORES */}

            <div className="col-12 col-md-4">

              <div className="card border-0 shadow-sm h-100">

                <div className="card-body p-4">

                  <p className="text-secondary small fw-semibold mb-2">
                    PROFESORES
                  </p>

                  <h2 className="h4 fw-bold text-dark mb-2">
                    Usuarios del sistema
                  </h2>

                  <p className="text-secondary small mb-3">
                    Gestiona profesores y sus accesos.
                  </p>

                  <a
                    href="/admin/profesores"
                    className="btn btn-outline-primary btn-sm"
                  >
                    Administrar profesores
                  </a>

                </div>

              </div>

            </div>

          </div>

          {/* ACCESOS RÁPIDOS */}

          <div className="row g-3 mb-4">

            {adminLinks.map((link) => (

              <div
                key={link.href}
                className="col-12 col-sm-6 col-lg-3"
              >

                <a
                  href={link.href}
                  className="text-decoration-none"
                >

                  <div className="card border-0 shadow-sm h-100">

                    <div className="card-body p-3">

                      <div className="d-flex align-items-center">

                        <div
                          className="rounded-3 bg-light text-primary d-flex align-items-center justify-content-center me-3"
                          style={{
                            width: '44px',
                            height: '44px',
                          }}
                        >
                          {link.icon}
                        </div>

                        <div>

                          <div className="fw-semibold text-dark">
                            {link.title}
                          </div>

                          <div className="text-secondary small">
                            Acceder al módulo
                          </div>

                        </div>

                      </div>

                    </div>

                  </div>

                </a>

              </div>

            ))}

          </div>

          {/* SOLICITUDES */}

          <div className="card shadow-sm border-0">

            <div className="card-header bg-white p-4">

              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">

                <div>

                  <div className="text-primary small fw-bold text-uppercase mb-1">
                    Gestión
                  </div>

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
                  Ver todas las solicitudes
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

                <div
                  className="rounded-circle bg-success bg-opacity-10 text-success d-flex align-items-center justify-content-center mx-auto mb-3 fw-bold"
                  style={{
                    width: '60px',
                    height: '60px',
                    fontSize: '24px',
                  }}
                >
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

                      <th className="px-4 py-3 small text-secondary text-end">
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

                          <span className="badge bg-light text-dark border">
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

                        <td className="px-4 text-end">

                          <button
                            type="button"
                            onClick={() =>
                              handleAprobar(solicitud.id)
                            }
                            disabled={
                              procesando === solicitud.id
                            }
                            className="btn btn-success btn-sm me-2"
                          >

                            {procesando === solicitud.id
                              ? 'Procesando...'
                              : 'Aprobar'}

                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleRechazar(solicitud.id)
                            }
                            disabled={
                              procesando === solicitud.id
                            }
                            className="btn btn-outline-danger btn-sm"
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

          {/* FOOTER */}

          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mt-4 pt-3 border-top">

            <div className="small text-secondary">
              Sistema de Inventario
            </div>

            <div className="small text-secondary">
              Panel de Administración
            </div>

          </div>

        </div>

      </main>

    </div>
  );
}
