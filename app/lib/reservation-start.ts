// pg puede devolver una columna DATE como Date; conservar su fecha local.
export function reservationDate(value: unknown): string {
  if (value instanceof Date) return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  return typeof value === 'string' ? value.slice(0, 10) : '';
}

export function reservationStart(date: unknown, time: unknown): number {
  return new Date(`${reservationDate(date)}T${String(time).slice(0, 5)}:00-05:00`).getTime();
}
