"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Reservation } from "@/app/lib/teacher-utils";
export type RequestRow = {
  id: number;
  profesor_nombre: string;
  apellido?: string;
  item_nombre: string | null;
  cantidad_solicitada: number;
  estado: string;
  fecha_solicitud: string;
  motivo?: string;
  disponibilidad_id?: number;
  seccion?: string;
  numero_aula?: string;
};
export type LoanRow = {
  id: number;
  profesor_nombre: string;
  profesor_apellido?: string;
  item_nombre: string;
  cantidad: number;
  estado: string;
  fecha_prestamo: string;
  fecha_devolucion_esperada?: string;
  fecha_devolucion_programada?: string;
};
export type TeacherRow = {
  id: number;
  nombre: string;
  apellido: string;
  activo: boolean;
  estado_registro?: 'pendiente' | 'aprobada' | 'rechazada' | null;
  area?: string;
  dni?: string;
  fecha_creacion?: string;
};
export type ItemRow = {
  id: number;
  nombre: string;
  cantidad_total: number;
  cantidad_disponible: number;
  estado: string;
};
export type Slot = { hora_inicio: string; hora_fin: string };
export type AdminData = {
  requests: RequestRow[];
  loans: LoanRow[];
  teachers: TeacherRow[];
  items: ItemRow[];
  schedule: Reservation[];
  template: Slot[];
};
export async function adminWrite(url: string, body: unknown, method = "PUT") {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: method === "DELETE" ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      data.error || "No se pudo guardar el cambio. Intenta nuevamente.",
    );
  return data;
}
export function useAdminData() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState("");
  const mounted = useRef(false),
    inFlight = useRef(false);
  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    try {
      const response = await fetch("/api/admin/resumen", { cache: "no-store" });
      if (!response.ok)
        throw new Error(
          "No se pudo actualizar la información. Vuelve a intentarlo.",
        );
      const body = await response.json();
      if (mounted.current) {
        setData(body);
        setError("");
        setUpdated(
          new Date().toLocaleTimeString("es-PE", {
            timeZone: "America/Lima",
            hour: "2-digit",
            minute: "2-digit",
          }),
        );
      }
    } catch (e) {
      if (mounted.current)
        setError(e instanceof Error ? e.message : "Error de conexión.");
    } finally {
      inFlight.current = false;
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const update = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = setInterval(update, 45000);
    window.addEventListener("focus", update);
    window.addEventListener("admin-requests-updated", update);
    window.addEventListener("admin-users-updated", update);
    return () => {
      mounted.current = false;
      clearInterval(timer);
      window.removeEventListener("focus", update);
      window.removeEventListener("admin-requests-updated", update);
      window.removeEventListener("admin-users-updated", update);
    };
  }, [refresh]);
  return { data, loading, refreshing, error, updated, refresh };
}
