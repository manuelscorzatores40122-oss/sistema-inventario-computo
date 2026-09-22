'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

/* ---------- Tipos ---------- */

export interface Item {
  id: number;
  nombre: string;
  categoria: string;
  cantidad_disponible: number;
}

export interface Usuario {
  id: number;
  [key: string]: unknown;
}

export interface Feedback {
  tipo: 'exito' | 'error';
  texto: string;
}

/* ---------- Hook: toda la lógica del panel ---------- */

export function useProfesorDashboard() {
  const [inventario, setInventario] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [user, setUser] = useState<Usuario | null>(null);
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [motivo, setMotivo] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  /* Carga de inventario */
  const cargarInventario = useCallback(async () => {
    try {
      const res = await fetch('/api/inventario');

      if (res.ok) {
        const data = await res.json();
        setInventario(data.items ?? []);
      }
    } catch (error) {
      console.error('Error al obtener datos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /* Usuario + inventario al montar */
  useEffect(() => {
    try {
      const raw = localStorage.getItem('user');
      if (raw) setUser(JSON.parse(raw));
    } catch (error) {
      console.error('Error al leer usuario:', error);
    }

    cargarInventario();
  }, [cargarInventario]);

  /* Derivados */
  const itemSeleccionado = useMemo(
    () => inventario.find((item) => item.id === selectedItem) ?? null,
    [inventario, selectedItem]
  );

  const totalDisponibles = useMemo(
    () => inventario.reduce((total, item) => total + item.cantidad_disponible, 0),
    [inventario]
  );

  const puedeEnviar = Boolean(selectedItem) && !loading && !enviando;

  /* Acciones */
  const seleccionarItem = (value: string) => {
    const id = value ? Number(value) : null;
    setSelectedItem(id);
    setFeedback(null);

    // Si la cantidad actual supera el stock del nuevo artículo, se ajusta
    const item = inventario.find((i) => i.id === id);
    if (item && cantidad > item.cantidad_disponible) {
      setCantidad(Math.max(1, item.cantidad_disponible));
    }
  };

  const cambiarCantidad = (value: string) => {
    const numero = Math.floor(Number(value));
    setCantidad(numero > 0 ? numero : 1);
    setFeedback(null);
  };

  const enviarSolicitud = async () => {
    if (!user) {
      setFeedback({
        tipo: 'error',
        texto: 'No se encontró tu sesión. Inicia sesión de nuevo.',
      });
      return;
    }

    if (!selectedItem) {
      setFeedback({
        tipo: 'error',
        texto: 'Selecciona un artículo antes de continuar.',
      });
      return;
    }

    if (cantidad < 1) {
      setFeedback({ tipo: 'error', texto: 'La cantidad debe ser mayor a 0.' });
      return;
    }

    if (itemSeleccionado && cantidad > itemSeleccionado.cantidad_disponible) {
      setFeedback({
        tipo: 'error',
        texto: `Solo hay ${itemSeleccionado.cantidad_disponible} unidades disponibles.`,
      });
      return;
    }

    setEnviando(true);
    setFeedback(null);

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
        setFeedback({ tipo: 'exito', texto: 'Solicitud creada exitosamente.' });
        setSelectedItem(null);
        setCantidad(1);
        setMotivo('');
        cargarInventario();
      } else {
        const data = await response.json().catch(() => null);
        setFeedback({
          tipo: 'error',
          texto: data?.message || 'No se pudo crear la solicitud.',
        });
      }
    } catch (error) {
      console.error('Error:', error);
      setFeedback({
        tipo: 'error',
        texto: 'Ocurrió un error al enviar la solicitud.',
      });
    } finally {
      setEnviando(false);
    }
  };

  return {
    // estado
    inventario,
    loading,
    enviando,
    selectedItem,
    itemSeleccionado,
    cantidad,
    motivo,
    feedback,
    totalDisponibles,
    puedeEnviar,
    // acciones
    seleccionarItem,
    cambiarCantidad,
    setMotivo,
    enviarSolicitud,
  };
}
