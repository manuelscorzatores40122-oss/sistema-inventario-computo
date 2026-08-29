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
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Panel de Administración
        </h1>
        <p className="text-gray-600 mb-6">Hola, {user?.nombre}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-600 text-sm font-semibold">
              Solicitudes Pendientes
            </h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {solicitudes.length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-600 text-sm font-semibold">
              Gestionar Inventario
            </h3>
            <a
              href="/admin/inventario"
              className="text-blue-600 hover:text-blue-800 mt-2 inline-block"
            >
              Ir →
            </a>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-600 text-sm font-semibold">
              Disponibilidades
            </h3>
            <a
              href="/admin/disponibilidad"
              className="text-blue-600 hover:text-blue-800 mt-2 inline-block"
            >
              Ir →
            </a>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">
              Solicitudes Pendientes
            </h2>
          </div>

          {loading ? (
            <div className="p-6 text-center text-gray-500">
              Cargando...
            </div>
          ) : solicitudes.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No hay solicitudes pendientes
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Profesor
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Artículo
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Cantidad
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {solicitudes.map((solicitud) => (
                    <tr
                      key={solicitud.id}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 text-sm text-gray-800">
                        {solicitud.profesor_nombre}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800">
                        {solicitud.item_nombre}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800">
                        {solicitud.cantidad_solicitada}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(solicitud.fecha_solicitud).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => handleAprobar(solicitud.id)}
                          className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 mr-2"
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() => handleRechazar(solicitud.id)}
                          className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
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
