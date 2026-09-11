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
  { href: '/admin/inventario', title: 'Inventario', text: 'Crear, editar y controlar stock' },
  { href: '/admin/profesores', title: 'Profesores', text: 'Usuarios, teléfonos y accesos' },
  { href: '/admin/disponibilidad', title: 'Disponibilidad', text: 'Horarios y reservas' },
  { href: '/admin/solicitudes', title: 'Solicitudes', text: 'Historial y aprobaciones' },
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
    <div className="p-4 bg-light min-vh-100">
      <div className="container-xl mx-auto">
        <h1 className="h2 fw-bold text-dark mb-2">
          Panel de Administración
        </h1>
        <p className="text-secondary mb-4">Hola, {user?.nombre}</p>

        <div className="row g-4 mb-4">
          <div className="col-12 col-md-3">
            <div className="card shadow p-4 h-100 border-0">
              <h3 className="text-secondary small fw-bold mb-0">
                Solicitudes Pendientes
              </h3>
              <p className="h2 fw-bold text-primary mt-2 mb-0">
                {solicitudes.length}
              </p>
            </div>
          </div>
          {adminLinks.map((link) => (
            <div className="col-12 col-md-3" key={link.href}>
              <a href={link.href} className="card shadow p-4 h-100 border-0 text-decoration-none">
                <h3 className="text-dark small fw-bold mb-0">{link.title}</h3>
                <p className="mt-2 small text-secondary mb-0">{link.text}</p>
                <span className="text-primary mt-3 d-inline-block small fw-bold">Abrir</span>
              </a>
            </div>
          ))}
        </div>

        <div className="card shadow border-0">
          <div className="card-header bg-white p-4 d-flex align-items-center justify-content-between">
            <h2 className="h5 fw-bold text-dark mb-0">
              Solicitudes Pendientes
            </h2>
            <a href="/admin/solicitudes" className="small fw-bold text-primary text-decoration-none">
              Ver todas
            </a>
          </div>

          {loading ? (
            <div className="p-4 text-center text-secondary">
              Cargando...
            </div>
          ) : solicitudes.length === 0 ? (
            <div className="p-4 text-center text-secondary">
              No hay solicitudes pendientes
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="py-3 text-secondary small fw-bold">Profesor</th>
                    <th className="py-3 text-secondary small fw-bold">Artículo</th>
                    <th className="py-3 text-secondary small fw-bold">Cantidad</th>
                    <th className="py-3 text-secondary small fw-bold">Fecha</th>
                    <th className="py-3 text-secondary small fw-bold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {solicitudes.map((solicitud) => (
                    <tr key={solicitud.id}>
                      <td className="align-middle text-dark">{solicitud.profesor_nombre}</td>
                      <td className="align-middle text-dark">{solicitud.item_nombre}</td>
                      <td className="align-middle text-dark">{solicitud.cantidad_solicitada}</td>
                      <td className="align-middle text-secondary">
                        {new Date(solicitud.fecha_solicitud).toLocaleDateString()}
                      </td>
                      <td className="align-middle">
                        <button
                          onClick={() => handleAprobar(solicitud.id)}
                          className="btn btn-success btn-sm me-2"
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() => handleRechazar(solicitud.id)}
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
  );
}
