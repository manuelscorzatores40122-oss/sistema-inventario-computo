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
    <div className="p-4 bg-light min-vh-100">
      <div className="container-xl mx-auto">
        <h1 className="h2 fw-bold text-dark mb-2">
          Panel del Profesor
        </h1>
        <p className="text-secondary mb-4">Hola, {user?.nombre}</p>

        <div className="row g-4 mb-4">
          <div className="col-12 col-md-6">
            <a href="/profesor/solicitudes" className="card shadow p-4 h-100 text-decoration-none border-0">
              <h3 className="h5 fw-bold text-dark mb-1">Mis solicitudes</h3>
              <p className="small text-secondary mb-0">Crear pedidos, revisar estados y cancelar pendientes.</p>
            </a>
          </div>
          <div className="col-12 col-md-6">
            <a href="/profesor/disponibilidad" className="card shadow p-4 h-100 text-decoration-none border-0">
              <h3 className="h5 fw-bold text-dark mb-1">Mi disponibilidad</h3>
              <p className="small text-secondary mb-0">Agregar, editar o eliminar horarios disponibles.</p>
            </a>
          </div>
        </div>

        {/* Sección de Disponibilidad */}
        <div className="card shadow mb-4 border-0">
          <div className="card-header bg-white p-4">
            <h2 className="h5 fw-bold text-dark mb-0">
              Mi Disponibilidad
            </h2>
          </div>
          <div className="card-body p-4">
            <div className="row g-3">
              {diasSemana.map((dia) => (
                <div key={dia} className="col-6 col-md">
                  <div className="border rounded p-3 h-100">
                    <p className="fw-bold small mb-2">{dia}</p>
                    {disponibilidades
                      .filter((d) => d.dia_semana === dia)
                      .map((d) => (
                        <div
                          key={d.id}
                          className={`small p-2 rounded mb-2 ${
                            d.estado === 'disponible'
                              ? 'bg-success text-success bg-opacity-10'
                              : 'bg-danger text-danger bg-opacity-10'
                          }`}
                        >
                          <p className="mb-0">{d.hora_inicio} - {d.hora_fin}</p>
                          {d.estado === 'separado' && (
                            <p className="mt-1 mb-0">Por: {d.reservado_por_nombre}</p>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sección de Solicitudes */}
        <div className="card shadow border-0">
          <div className="card-header bg-white p-4">
            <h2 className="h5 fw-bold text-dark mb-0">
              Solicitar Artículos
            </h2>
          </div>
          <div className="card-body p-4">
            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <label className="form-label fw-bold small">
                  Selecciona un artículo
                </label>
                <select
                  value={selectedItem || ''}
                  onChange={(e) => setSelectedItem(Number(e.target.value))}
                  className="form-select"
                >
                  <option value="">-- Seleccionar --</option>
                  {inventario.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre} (Disponibles: {item.cantidad_disponible})
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-4">
                <label className="form-label fw-bold small">
                  Cantidad
                </label>
                <input
                  type="number"
                  min="1"
                  value={cantidad}
                  onChange={(e) => setCantidad(Number(e.target.value))}
                  className="form-control"
                />
              </div>

              <div className="col-md-4">
                <label className="form-label fw-bold small">
                  Motivo
                </label>
                <input
                  type="text"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="form-control"
                  placeholder="Ej: Reparación de equipos"
                />
              </div>
            </div>

            <div>
              <button
                onClick={handleSolicitar}
                disabled={!selectedItem || loading}
                className="btn btn-primary fw-bold py-2 px-4"
              >
                Enviar Solicitud
              </button>
              <a
                href="/profesor/solicitudes"
                className="btn btn-outline-secondary fw-bold py-2 px-4 ms-2"
              >
                Ver mis solicitudes
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
