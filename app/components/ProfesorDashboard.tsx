
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

  const diasSemana = [
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
  ];

  const totalDisponibles = inventario.reduce(
    (total, item) => total + item.cantidad_disponible,
    0
  );

  const horariosDisponibles = disponibilidades.filter(
    (d) => d.estado === 'disponible'
  ).length;

  const horariosSeparados = disponibilidades.filter(
    (d) => d.estado === 'separado'
  ).length;

  return (
    <div className="min-vh-100 bg-light">

{/* ENCABEZADO */}
      <header className="bg-dark text-white shadow-sm">
        <div className="container-xl py-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">

            <div>
              <div className="text-uppercase small text-secondary fw-bold mb-1">
                Sistema de Inventario
              </div>

              <h1 className="h3 fw-bold mb-1">
                Panel del Profesor
              </h1>

              <p className="mb-0 text-white-50">
                Gestiona tus solicitudes y disponibilidad.
              </p>
            </div>

            <div className="d-flex align-items-center gap-3">

              <div className="text-end d-none d-sm-block">
                <div className="fw-semibold">
                  {user?.nombre || 'Profesor'}
                </div>

                <div className="small text-white-50">
                  Profesor
                </div>
              </div>

              <div
                className="rounded-circle bg-primary d-flex align-items-center justify-content-center fw-bold"
                style={{
                  width: '48px',
                  height: '48px',
                  fontSize: '18px',
                }}
              >
                {user?.nombre
                  ? user.nombre.charAt(0).toUpperCase()
                  : 'P'}
              </div>

            </div>
          </div>
        </div>
      </header>

      <main className="container-xl py-4">

        {/* ACCESOS RÁPIDOS */}
        <div className="row g-4 mb-4">

          <div className="col-12 col-md-6">
            <a
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

                    <div
                      className="bg-primary bg-opacity-10 rounded-3 d-flex align-items-center justify-content-center"
                      style={{
                        width: '48px',
                        height: '48px',
                      }}
                    >
                      <span className="text-primary fw-bold fs-5">
                        →
                      </span>
                    </div>

                  </div>

                </div>
              </div>
            </a>
          </div>

          <div className="col-12 col-md-6">
            <a
              href="/profesor/disponibilidad"
              className="text-decoration-none"
            >
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4">

                  <div className="d-flex justify-content-between align-items-start">

                    <div>
                      <div className="text-success small fw-bold text-uppercase mb-2">
                        Horarios
                      </div>

                      <h2 className="h5 fw-bold text-dark mb-2">
                        Mi disponibilidad
                      </h2>

                      <p className="text-secondary small mb-0">
                        Administra tus horarios disponibles y
                        reservados.
                      </p>
                    </div>

                    <div
                      className="bg-success bg-opacity-10 rounded-3 d-flex align-items-center justify-content-center"
                      style={{
                        width: '48px',
                        height: '48px',
                      }}
                    >
                      <span className="text-success fw-bold fs-5">
                        →
                      </span>
                    </div>

                  </div>

                </div>
              </div>
            </a>
          </div>

          <div className="col-12 col-md-6">
            <a
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

                    <div
                      className="bg-secondary bg-opacity-10 rounded-3 d-flex align-items-center justify-content-center"
                      style={{
                        width: '48px',
                        height: '48px',
                      }}
                    >
                      <span className="text-secondary fw-bold fs-5">
                        →
                      </span>
                    </div>

                  </div>

                </div>
              </div>
            </a>
          </div>

        </div>

        {/* ESTADÍSTICAS */}
        <div className="row g-3 mb-4">

          <div className="col-12 col-md-4">
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4">

                <div className="d-flex justify-content-between align-items-center">

                  <div>
                    <p className="small text-secondary mb-1">
                      Artículos disponibles
                    </p>

                    <h3 className="h3 fw-bold mb-0 text-dark">
                      {loading ? '...' : totalDisponibles}
                    </h3>
                  </div>

                  <div className="text-primary fs-3 fw-bold">
                    {inventario.length}
                  </div>

                </div>

              </div>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4">

                <div className="d-flex justify-content-between align-items-center">

                  <div>
                    <p className="small text-secondary mb-1">
                      Horarios disponibles
                    </p>

                    <h3 className="h3 fw-bold mb-0 text-dark">
                      {loading ? '...' : horariosDisponibles}
                    </h3>
                  </div>

                  <div className="text-success fs-3 fw-bold">
                    ✓
                  </div>

                </div>

              </div>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4">

                <div className="d-flex justify-content-between align-items-center">

                  <div>
                    <p className="small text-secondary mb-1">
                      Horarios reservados
                    </p>

                    <h3 className="h3 fw-bold mb-0 text-dark">
                      {loading ? '...' : horariosSeparados}
                    </h3>
                  </div>

                  <div className="text-danger fs-3 fw-bold">
                    {horariosSeparados}
                  </div>

                </div>

              </div>
            </div>
          </div>

        </div>

        {/* DISPONIBILIDAD */}
        <section className="card border-0 shadow-sm mb-4">

          <div className="card-header bg-white border-bottom p-4">

            <div className="d-flex flex-column flex-md-row justify-content-between gap-2">

              <div>
                <h2 className="h5 fw-bold text-dark mb-1">
                  Mi disponibilidad
                </h2>

                <p className="small text-secondary mb-0">
                  Consulta tus horarios de atención durante la semana.
                </p>
              </div>

              <a
                href="/profesor/disponibilidad"
                className="btn btn-outline-primary btn-sm align-self-start"
              >
                Administrar horarios
              </a>

            </div>

          </div>

          <div className="card-body p-4">

            <div className="row g-3">

              {diasSemana.map((dia) => {

                const horariosDia = disponibilidades.filter(
                  (d) => d.dia_semana === dia
                );

                return (
                  <div
                    key={dia}
                    className="col-12 col-sm-6 col-lg"
                  >

                    <div className="border rounded-3 h-100 bg-white">

                      <div className="border-bottom px-3 py-3">
                        <h3 className="h6 fw-bold mb-0">
                          {dia}
                        </h3>
                      </div>

                      <div className="p-3">

                        {horariosDia.length === 0 ? (

                          <div className="text-center py-3">
                            <p className="small text-secondary mb-0">
                              Sin horarios
                            </p>
                          </div>

                        ) : (

                          horariosDia.map((d) => (

                            <div
                              key={d.id}
                              className={`rounded-3 p-3 mb-2 border ${
                                d.estado === 'disponible'
                                  ? 'border-success bg-success bg-opacity-10'
                                  : 'border-danger bg-danger bg-opacity-10'
                              }`}
                            >

                              <div className="d-flex justify-content-between align-items-center mb-2">

                                <span className="fw-bold small">
                                  {d.hora_inicio} - {d.hora_fin}
                                </span>

                                <span
                                  className={`badge ${
                                    d.estado === 'disponible'
                                      ? 'text-bg-success'
                                      : 'text-bg-danger'
                                  }`}
                                >
                                  {d.estado === 'disponible'
                                    ? 'Disponible'
                                    : 'Reservado'}
                                </span>

                              </div>

                              {d.estado === 'separado' && (
                                <div className="small text-secondary">

                                  {d.reservado_por_nombre && (
                                    <div>
                                      <strong>Reservado por:</strong>{' '}
                                      {d.reservado_por_nombre}
                                    </div>
                                  )}

                                  {d.motivo_reserva && (
                                    <div className="mt-1">
                                      <strong>Motivo:</strong>{' '}
                                      {d.motivo_reserva}
                                    </div>
                                  )}

                                </div>
                              )}

                            </div>

                          ))

                        )}

                      </div>

                    </div>

                  </div>
                );
              })}

            </div>

          </div>
        </section>

        {/* SOLICITUD DE ARTÍCULOS */}
        <section className="card border-0 shadow-sm">

          <div className="card-header bg-white border-bottom p-4">

            <div>
              <h2 className="h5 fw-bold text-dark mb-1">
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

                <label className="form-label fw-semibold">
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

                <label className="form-label fw-semibold">
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

                <label className="form-label fw-semibold">
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
                className="btn btn-primary btn-lg px-4 fw-semibold"
              >
                {enviando
                  ? 'Enviando solicitud...'
                  : 'Enviar solicitud'}
              </button>

              <a
                href="/profesor/solicitudes"
                className="btn btn-outline-secondary btn-lg px-4 fw-semibold"
              >
                Ver mis solicitudes
              </a>

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

