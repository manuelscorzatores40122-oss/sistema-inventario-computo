/** Format a stored HH:mm[:ss] clock value without changing its time zone. */
export function timeLabel(value: string | null | undefined): string {
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(value || '');
  if (!match) return '—';
  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]} ${hour < 12 ? 'a. m.' : 'p. m.'}`;
}
