'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FiFileText,
  FiUser,
  FiArrowRight,
  FiPackage,
  FiSend,
  FiAlertCircle,
} from 'react-icons/fi';

interface Item {
  id: number;
  nombre: string;
  categoria: string;
  cantidad_disponible: number;
}

export default function ProfesorDashboard() {
  const [inventario, setInventario] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');

    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error al leer usuario:', error);
      }
    }

    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const invRes = await fetch('/api/inventario');

      if (invRes.ok) {
        const invData = await invRes.json();
        setInventario(invData.items || []);
      }
    } catch (error) {
      console.error('Error al obtener datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSolicitar = async () => {
    if (!selectedItem || !user) {
      alert('Selecciona un artículo antes de continuar.');
      return;
    }

    if (cantidad < 1) {
      alert('La cantidad debe ser mayor a 0.');
      return;
    }

    const itemSeleccionado = inventario.find(
      (item) => item.id === selectedItem
    );

    if (
      itemSeleccionado &&
      cantidad > itemSeleccionado.cantidad_disponible
    ) {
      alert(
        `Solo hay ${itemSeleccionado.cantidad_disponible} unidades disponibles.`
      );
      return;
    }

    setEnviando(true);

    try {
      const response = await fetch('/api/solicitudes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profesor_id: user.id,
          inventario_id: selectedItem,
          cantidad_solicitada: cantidad,
          motivo,
        }),
      });

      if (response.ok) {
        alert('Solicitud creada exitosamente.');

        setSelectedItem(null);
        setCantidad(1);
        setMotivo('');

        fetchData();
      } else {
        const data = await response.json().catch(() => null);

        alert(
          data?.message ||
            'No se pudo crear la solicitud.'
        );
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Ocurrió un error al enviar la solicitud.');
    } finally {
      setEnviando(false);
    }
  };

  const totalDisponibles = inventario.reduce(
    (total, item) => total + item.cantidad_disponible,
    0
  );

  return (
    <div className="min-vh-100 bg-light">

      <main className="container-xl py-4">

        {/* ACCESOS RÁPIDOS */}
        <div className="row g-4 mb-4">

          <div className="col-12 col-md-6">
            <Link
              href="/profesor/solicitudes"
              className="text-decoration-none"
            >
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4">

                  <div className="d-flex justify-content-between align-items-start">

                    <div>
                      <div className="text-primary small fw-bold text-uppercase mb-2">
                        Gestión
                      </div>

                      <h2 className="h5 fw-bold text-dark mb-2">
                        Mis solicitudes
                      </h2>

                      <p className="text-secondary small mb-0">
                        Revisa, crea y controla el estado de tus
                        solicitudes de artículos.
                      </p>
                    </div>

                  </div>

                  <div className="d-flex align-items-center justify-content-between mt-3">
                    <div
                      className="bg-primary bg-opacity-10 rounded-3 d-flex align-items-center justify-content-center"
                      style={{
                        width: '44px',
                        height: '44px',
                      }}
                    >
                      <FiFileText className="text-primary" size={22} />
                    </div>

                    <FiArrowRight className="text-primary" size={18} />
                  </div>

                </div>
              </div>
            </Link>
          </div>

          <div className="col-12 col-md-6">
            <Link
              href="/profesor/perfil"
              className="text-decoration-none"
            >
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4">

                  <div className="d-flex justify-content-between align-items-start">

                    <div>
                      <div className="text-secondary small fw-bold text-uppercase mb-2">
                        Cuenta
                      </div>

                      <h2 className="h5 fw-bold text-dark mb-2">
                        Mi Perfil
                      </h2>

                      <p className="text-secondary small mb-0">
                        Ver mi información y cambiar
                        credenciales de acceso.
                      </p>
                    </div>

                  </div>

                  <div className="d-flex align-items-center justify-content-between mt-3">
                    <div
                      className="bg-secondary bg-opacity-10 rounded-3 d-flex align-items-center justify-content-center"
                      style={{
                        width: '44px',
                        height: '44px',
                      }}
                    >
                      <FiUser className="text-secondary" size={22} />
                    </div>

                    <FiArrowRight className="text-secondary" size={18} />
                  </div>

                </div>
              </div>
            </Link>
          </div>

        </div>

        {/* ESTADÍSTICAS */}
        <div className="row g-3 mb-4">

          <div className="col-12 col-md-4">
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4">

                <div className="d-flex align-items-center justify-content-between">

                  <div>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <FiPackage className="text-primary" size={18} />
                      <p className="small text-secondary mb-0">
                        Artículos disponibles
                      </p>
                    </div>

                    <h3 className="h3 fw-bold mb-0 text-dark">
                      {loading ? '...' : totalDisponibles}
                    </h3>
                  </div>

                  <div
                    className="rounded-3 d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary"
                    style={{ width: '48px', height: '48px' }}
                  >
                    <FiPackage size={24} />
                  </div>

                </div>

              </div>
            </div>
          </div>

        </div>

        {/* SOLICITUD DE ARTÍCULOS */}
        <section className="card border-0 shadow-sm">

          <div className="card-header bg-white border-bottom p-4">

            <div>
              <h2 className="h5 fw-bold text-dark mb-1">
                <FiSend className="text-primary me-2" size={20} />
                Solicitar artículos
              </h2>

              <p className="small text-secondary mb-0">
                Selecciona un artículo del inventario y registra tu
                solicitud.
              </p>
            </div>

          </div>

          <div className="card-body p-4">

            <div className="row g-4">

              {/* ARTÍCULO */}
              <div className="col-12 col-md-5">

                <label className="form-label fw-semibold d-flex align-items-center gap-2">
                  <FiPackage className="text-primary" size={16} />
                  Artículo
                </label>

                <select
                  value={selectedItem || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedItem(
                      value ? Number(value) : null
                    );
                  }}
                  className="form-select form-select-lg"
                >

                  <option value="">
                    Seleccionar artículo
                  </option>

                  {inventario.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                      disabled={item.cantidad_disponible <= 0}
                    >
                      {item.nombre} — {item.cantidad_disponible}{' '}
                      disponibles
                    </option>
                  ))}

                </select>

                {selectedItem && (
                  <div className="small text-secondary mt-2">
                    {(() => {
                      const item = inventario.find(
                        (i) => i.id === selectedItem
                      );

                      if (!item) return null;

                      return (
                        <>
                          Categoría:{' '}
                          <strong>{item.categoria}</strong>
                        </>
                      );
                    })()}
                  </div>
                )}

              </div>

              {/* CANTIDAD */}
              <div className="col-12 col-md-3">

                <label className="form-label fw-semibold d-flex align-items-center gap-2">
                  <FiAlertCircle className="text-primary" size={16} />
                  Cantidad
                </label>

                <input
                  type="number"
                  min="1"
                  value={cantidad}
                  onChange={(e) => {
                    const value = Number(e.target.value);

                    setCantidad(
                      value > 0 ? value : 1
                    );
                  }}
                  className="form-control form-control-lg"
                />

              </div>

              {/* MOTIVO */}
              <div className="col-12 col-md-4">

                <label className="form-label fw-semibold d-flex align-items-center gap-2">
                  <FiFileText className="text-primary" size={16} />
                  Motivo de solicitud
                </label>

                <input
                  type="text"
                  value={motivo}
                  onChange={(e) =>
                    setMotivo(e.target.value)
                  }
                  className="form-control form-control-lg"
                  placeholder="Ej. Reparación de equipos"
                />

              </div>

            </div>

            {/* RESUMEN */}
            {selectedItem && (
              <div className="alert alert-primary mt-4 mb-0">

                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">

                  <div>

                    <div className="fw-bold mb-1">
                      Resumen de solicitud
                    </div>

                    <div className="small">
                      {inventario.find(
                        (item) => item.id === selectedItem
                      )?.nombre}{' '}
                      × {cantidad}
                    </div>

                  </div>

                  <div className="small">
                    Estado inicial:{' '}
                    <strong>Pendiente de aprobación</strong>
                  </div>

                </div>

              </div>
            )}

            {/* BOTONES */}
            <div className="d-flex flex-column flex-sm-row gap-2 mt-4">

              <button
                onClick={handleSolicitar}
                disabled={
                  !selectedItem ||
                  loading ||
                  enviando
                }
                className="btn btn-primary btn-lg px-4 fw-semibold d-inline-flex align-items-center justify-content-center gap-2"
              >
                <FiSend size={18} />
                {enviando
                  ? 'Enviando solicitud...'
                  : 'Enviar solicitud'}
              </button>

              <Link
                href="/profesor/solicitudes"
                className="btn btn-outline-secondary btn-lg px-4 fw-semibold d-inline-flex align-items-center justify-content-center gap-2"
              >
                <FiFileText size={18} />
                Ver mis solicitudes
              </Link>

            </div>

          </div>

        </section>

      </main>

      {/* FOOTER */}
      <footer className="container-xl py-4">

        <div className="border-top pt-3 text-center">
          <p className="small text-secondary mb-0">
            Sistema de Inventario — Panel del Profesor 
          </p>
        </div>

      </footer>

    </div>
  );
}