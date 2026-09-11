
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
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidad[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [motivo, setMotivo] = useState('');
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

        await fetchData();
      } else {
        const data = await response.json().catch(() => null);

        alert(data?.message || 'No se pudo crear la solicitud.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Ocurrió un error al enviar la solicitud.');
    } finally {
      setEnviando(false);
    }
  };

  const handleSalir = () => {
    const confirmar = window.confirm('¿Desea cerrar la sesión?');

    if (!confirmar) {
      return;
    }

    localStorage.removeItem('user');
    window.location.href = '/login';
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

  const inicial = user?.nombre
    ? user.nombre.charAt(0).toUpperCase()
    : 'P';

  return (
    <div className="min-vh-100 bg-light">

      {/* ================= SIDEBAR ================= */}

      <aside
        className="position-fixed top-0 start-0 h-100 bg-dark text-white shadow"
        style={{
          width: '250px',
          zIndex: 1000,
        }}
      >
        {/* LOGO */}

        <div className="p-4 border-bottom border-secondary">
          <div className="fw-bold fs-5">
            Sistema de Inventario
          </div>

          <div className="text-secondary small mt-1">
            Panel del Profesor
          </div>
        </div>

        {/* USUARIO */}

        <div className="p-4 border-bottom border-secondary">
          <div className="d-flex align-items-center">
            <div
              className="rounded-circle bg-primary d-flex align-items-center justify-content-center fw-bold me-3"
              style={{
                width: '44px',
                height: '44px',
              }}
            >
              {inicial}
            </div>

            <div className="overflow-hidden">
              <div
                className="fw-semibold text-truncate"
                style={{
                  maxWidth: '140px',
                }}
              >
                {user?.nombre || 'Profesor'}
              </div>

              <div className="text-secondary small">
                Profesor
              </div>
            </div>
          </div>
        </div>

        {/* MENU */}

        <nav className="p-3">
          <div className="text-uppercase text-secondary small fw-bold px-3 mb-2">
