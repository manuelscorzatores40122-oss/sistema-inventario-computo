'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Reservation } from '@/app/lib/teacher-utils';

export type TeacherUser = { id: number; nombre: string; apellido: string; email: string; dni: string | null; area: string | null; telefono: string | null; correo_personal: string | null; role: string; activo: boolean };
export type Equipment = { id: number; nombre: string; descripcion: string | null; categoria: string; cantidad_total: number; cantidad_disponible: number; estado: string; imagen_url: string | null; marca: string | null; modelo: string | null; ubicacion: string | null; condicion: string | null };
export type TeacherRequest = { id: number; inventario_id: number | null; disponibilidad_id: number | null; item_nombre: string; cantidad_solicitada: number; estado: string; motivo: string | null; seccion: string | null; numero_aula: string | null; comentarios: string | null; fecha_solicitud: string; fecha_aprobacion: string | null; fecha_reserva: string | null; hora_inicio: string | null; hora_fin: string | null };
export type TeacherLoan = { id: number; solicitud_id?: number | null; item_nombre: string; cantidad: number; estado: string; fecha_prestamo: string; fecha_devolucion: string | null; detalle: string | null; devolucion_observacion?: string | null; devolucion_estado?: string | null };
export type TeacherNotice = { id: number; mensaje: string; tipo: string; referencia_id: number | null; fecha_envio: string };
export type TeacherData = { user: TeacherUser; inventory: Equipment[]; requests: TeacherRequest[]; loans: TeacherLoan[]; schedule: Reservation[]; template: { hora_inicio: string; hora_fin: string }[]; notifications: TeacherNotice[]; updatedAt: string };
type ContextValue = { data: TeacherData | null; loading: boolean; refreshing: boolean; error: string; refresh: () => Promise<void> };
const TeacherContext = createContext<ContextValue | null>(null);

export function TeacherProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<TeacherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef<Promise<void> | null>(null);
  const router = useRouter();
  const refresh = useCallback(() => {
    if (inFlight.current) return inFlight.current;
    setRefreshing(true);
    const task = (async () => {
      try {
        const response = await fetch('/api/profesor/resumen', { cache: 'no-store' });
        const body = await response.json();
        if (response.status === 401 || response.status === 403) { router.replace('/auth/login'); return; }
        if (!response.ok) throw new Error(body.error || 'No pudimos actualizar tu información.');
        setData(body);
        setError('');
        try { localStorage.setItem('user', JSON.stringify(body.user)); } catch { /* La sesión usa la cookie del servidor. */ }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No hay conexión. Vuelve a intentarlo.');
      } finally {
        setLoading(false); setRefreshing(false); inFlight.current = null;
      }
    })();
    inFlight.current = task;
    return task;
  }, [router]);
  useEffect(() => {
    void refresh();
    const update = () => { if (document.visibilityState === 'visible') void refresh(); };
    const timer = window.setInterval(update, 45000);
    window.addEventListener('focus', update);
    window.addEventListener('teacher-requests-updated', update);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', update); window.removeEventListener('teacher-requests-updated', update); };
  }, [refresh]);
  return <TeacherContext.Provider value={{ data, loading, refreshing, error, refresh }}>{children}</TeacherContext.Provider>;
}
export function useTeacher() {
  const context = useContext(TeacherContext);
  if (!context) throw new Error('El módulo debe estar dentro del espacio docente.');
  return context;
}
