export const SCHOOL_TIME_ZONE = 'America/Lima';
export const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function schoolDate(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: SCHOOL_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function weekday(date: string): string {
  return WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()];
}
export function dateLabel(value: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }): string {
  if (!value) return 'Sin fecha';
  const date = new Date(value.length === 10 ? `${value}T12:00:00-05:00` : value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('es-PE', { timeZone: SCHOOL_TIME_ZONE, ...options }) : 'Sin fecha';
}
export function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
export type Reservation = {
  id: number; sala_nombre: string; dia_semana: string; hora_inicio: string; hora_fin: string;
  estado: string; reservado_por: number | null; motivo_reserva: string | null; fecha_reserva: string | null;
  reservado_por_nombre?: string; reservado_por_apellido?: string;
};
export function reservationsForDate(rows: Reservation[], date: string): Reservation[] {
  return rows.filter(row => ['separado', 'pendiente'].includes(row.estado) &&
    (row.fecha_reserva ? row.fecha_reserva.slice(0, 10) === date : row.dia_semana === weekday(date)))
    .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
}
export function overlaps(start: string, end: string, rows: Reservation[]): boolean {
  return rows.some(row => row.hora_inicio.slice(0, 5) < end && row.hora_fin.slice(0, 5) > start);
}
export function isFutureSlot(date: string, time: string, now = Date.now()): boolean {
  const start = new Date(`${date}T${time}:00-05:00`).getTime();
  return Number.isFinite(start) && start > now;
}
