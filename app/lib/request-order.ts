type DatedRequest = { estado: string; fecha_solicitud: string; id: number };

// Primero lo que requiere atención; después, lo ya procesado.
export function compareRequests(a: DatedRequest, b: DatedRequest): number {
  const priority = Number(b.estado === 'pendiente') - Number(a.estado === 'pendiente');
  if (priority) return priority;
  const newestFirst = new Date(b.fecha_solicitud).getTime() - new Date(a.fecha_solicitud).getTime();
  return (Number.isFinite(newestFirst) && newestFirst !== 0) ? newestFirst : b.id - a.id;
}
