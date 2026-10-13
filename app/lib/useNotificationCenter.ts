'use client';

import { useEffect, useState, useCallback } from 'react';

export function isLoanOverdue(fechaPrestamo: string | Date, estado: string): boolean {
  if (estado !== 'prestado') return false;
  const loanDate = new Date(fechaPrestamo);
  const now = new Date();
  const diffHours = (now.getTime() - loanDate.getTime()) / (1000 * 60 * 60);
  return diffHours >= 24 || (now.getDate() !== loanDate.getDate() && diffHours >= 12);
}

export function getDaysOverdue(fechaPrestamo: string | Date): number {
  const loanDate = new Date(fechaPrestamo);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - loanDate.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

export function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // Silencio si las políticas de audio del navegador lo bloquean
  }
}

type NotificationCenterData = {
  solicitudes: any[];
  usuarios: any[];
  prestamos: any[];
  notificaciones: any[];
  overdueLoans: any[];
  loading: boolean;
  lastFetch: number;
};

// Singleton en memoria para compartir entre todos los componentes y evitar duplicar peticiones
let globalState: NotificationCenterData = {
  solicitudes: [],
  usuarios: [],
  prestamos: [],
  notificaciones: [],
  overdueLoans: [],
  loading: true,
  lastFetch: 0,
};

let activeSubscribers = 0;
let pollingTimer: ReturnType<typeof setTimeout> | null = null;
let isFetching = false;
let previousRequestsSig: string | null = null;
let previousDocentesSig: string | null = null;
const listeners = new Set<(state: NotificationCenterData) => void>();

function notifyListeners() {
  listeners.forEach(fn => fn({ ...globalState }));
}

async function fetchResumen(silent = false) {
  if (isFetching) return;
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

  isFetching = true;
  try {
    const res = await fetch('/api/notificaciones/resumen', {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });

    if (res.ok) {
      const data = await res.json();
      const solicitudes = Array.isArray(data.solicitudes) ? data.solicitudes : [];
      const usuarios = Array.isArray(data.usuarios) ? data.usuarios : [];
      const prestamos = Array.isArray(data.prestamos) ? data.prestamos : [];
      const notificaciones = Array.isArray(data.notificaciones) ? data.notificaciones : [];
      const overdueLoans = prestamos.filter((p: any) => isLoanOverdue(p.fecha_prestamo, p.estado));

      // Detección de cambios y alertas sonoras
      const reqSig = solicitudes.map((s: any) => s.id).join(',');
      const docSig = usuarios.map((u: any) => u.id).join(',');

      if (previousRequestsSig !== null && reqSig !== previousRequestsSig && solicitudes.length > 0) {
        playNotificationChime();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('admin-requests-updated'));
        }
      }
      if (previousDocentesSig !== null && docSig !== previousDocentesSig && usuarios.length > 0) {
        playNotificationChime();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('admin-users-updated'));
        }
      }

      previousRequestsSig = reqSig;
      previousDocentesSig = docSig;

      globalState = {
        solicitudes,
        usuarios,
        prestamos,
        notificaciones,
        overdueLoans,
        loading: false,
        lastFetch: Date.now(),
      };

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('admin-notifications', { detail: notificaciones }));
        window.dispatchEvent(new CustomEvent('teacher-notifications', { detail: notificaciones }));
      }

      notifyListeners();
    }
  } catch (err) {
    // Si falla la red se mantendrá el último estado
  } finally {
    isFetching = false;
    scheduleNextPoll();
  }
}

function scheduleNextPoll() {
  if (pollingTimer) clearTimeout(pollingTimer);
  if (activeSubscribers <= 0) return;

  // Intervalo óptimo de 10 segundos: extremadamente fluido pero sin saturar la red ni la BD
  pollingTimer = setTimeout(() => {
    void fetchResumen();
  }, 10000);
}

export function revalidateNotifications() {
  void fetchResumen();
}

export function useNotificationCenter() {
  const [state, setState] = useState<NotificationCenterData>(globalState);

  useEffect(() => {
    listeners.add(setState);
    activeSubscribers++;

    // Si aún no hemos cargado o han pasado más de 8 segundos, actualiza inmediatamente
    if (globalState.lastFetch === 0 || Date.now() - globalState.lastFetch > 8000) {
      void fetchResumen();
    } else {
      setState({ ...globalState });
      scheduleNextPoll();
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && Date.now() - globalState.lastFetch > 6000) {
        void fetchResumen();
      }
    };

    const handleEventUpdate = () => {
      void fetchResumen();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('admin-requests-updated', handleEventUpdate);
    window.addEventListener('admin-users-updated', handleEventUpdate);
    window.addEventListener('teacher-requests-updated', handleEventUpdate);

    return () => {
      listeners.delete(setState);
      activeSubscribers--;
      if (activeSubscribers <= 0 && pollingTimer) {
        clearTimeout(pollingTimer);
        pollingTimer = null;
      }
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('admin-requests-updated', handleEventUpdate);
      window.removeEventListener('admin-users-updated', handleEventUpdate);
      window.removeEventListener('teacher-requests-updated', handleEventUpdate);
    };
  }, []);

  const refresh = useCallback(() => {
    return fetchResumen();
  }, []);

  return {
    ...state,
    refresh,
    isLoanOverdue,
    getDaysOverdue,
  };
}
