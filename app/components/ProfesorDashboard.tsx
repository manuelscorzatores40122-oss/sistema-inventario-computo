'use client';

import { useState, useEffect } from 'react';

interface Item {
  id: number;
  nombre: string;
  categoria: string;
  cantidad_disponible: number;
}

interface Disponibilidad {
  id: number;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
  reservado_por_nombre?: string;
  motivo_reserva?: string;
}

export default function ProfesorDashboard() {
  const [inventario, setInventario] = useState<Item[]>([]);
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [invRes, dispRes] = await Promise.all([
        fetch('/api/inventario'),
        fetch('/api/disponibilidad'),
      ]);

      if (invRes.ok) {
        const invData = await invRes.json();
        setInventario(invData.items || []);
      }

      if (dispRes.ok) {
        const dispData = await dispRes.json();
        setDisponibilidades(dispData.disponibilidades || []);
      }
    } catch (error) {
      console.error('Error al obtener datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSolicitar = async () => {
    if (!selectedItem || !user) return;

    try {
      const response = await fetch('/api/solicitudes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profesor_id: user.id,
          inventario_id: selectedItem,
          cantidad_solicitada: cantidad,
          motivo,
        }),
      });

      if (response.ok) {
        alert('Solicitud creada exitosamente');
        setSelectedItem(null);
        setCantidad(1);
        setMotivo('');
      } else {
        alert('Error al crear solicitud');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Panel del Profesor
        </h1>
        <p className="text-gray-600 mb-6">Hola, {user?.nombre}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <a href="/profesor/solicitudes" className="bg-white rounded-lg shadow p-5 hover:shadow-md transition">
            <h3 className="font-bold text-gray-800">Mis solicitudes</h3>
            <p className="mt-1 text-sm text-gray-600">Crear pedidos, revisar estados y cancelar pendientes.</p>
          </a>
          <a href="/profesor/disponibilidad" className="bg-white rounded-lg shadow p-5 hover:shadow-md transition">
            <h3 className="font-bold text-gray-800">Mi disponibilidad</h3>
            <p className="mt-1 text-sm text-gray-600">Agregar, editar o eliminar horarios disponibles.</p>
          </a>
        </div>

        {/* Sección de Disponibilidad */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">
              Mi Disponibilidad
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {diasSemana.map((dia) => (
                <div key={dia} className="border rounded-lg p-3">
                  <p className="font-semibold text-sm mb-2">{dia}</p>
                  {disponibilidades
                    .filter((d) => d.dia_semana === dia)
                    .map((d) => (
                      <div
                        key={d.id}
                        className={`text-xs p-2 rounded mb-2 ${
                          d.estado === 'disponible'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        <p>{d.hora_inicio} - {d.hora_fin}</p>
                        {d.estado === 'separado' && (
                          <p className="mt-1">Por: {d.reservado_por_nombre}</p>
                        )}
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sección de Solicitudes */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">
              Solicitar Artículos
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Selecciona un artículo
                </label>
                <select
                  value={selectedItem || ''}
                  onChange={(e) => setSelectedItem(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Seleccionar --</option>
                  {inventario.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre} (Disponibles: {item.cantidad_disponible})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Cantidad
                </label>
                <input
                  type="number"
                  min="1"
                  value={cantidad}
                  onChange={(e) => setCantidad(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Motivo
                </label>
                <input
                  type="text"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Ej: Reparación de equipos"
                />
              </div>
            </div>

            <button
              onClick={handleSolicitar}
              disabled={!selectedItem || loading}
              className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
            >
              Enviar Solicitud
            </button>
            <a
              href="/profesor/solicitudes"
              className="ml-3 inline-block rounded-lg border border-gray-300 px-5 py-2 font-bold text-gray-700 hover:bg-gray-50"
            >
              Ver mis solicitudes
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
