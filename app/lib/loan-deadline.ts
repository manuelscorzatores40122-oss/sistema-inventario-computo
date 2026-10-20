import { DEFAULT_SCHOOL_SLOTS, parseSchoolSlots } from './school-slots';

export function loanDeadline(delivered: string | Date, template: unknown): string | null {
  const start = new Date(delivered);
  if (!Number.isFinite(start.getTime())) return null;
  const slots = parseSchoolSlots(template, DEFAULT_SCHOOL_SLOTS);
  const close = slots.map(slot => slot.hora_fin).sort().at(-1)!;
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(start);
  const closing = new Date(`${day}T${close}:00-05:00`).getTime();
  const opening = new Date(`${day}T${slots.map(slot => slot.hora_inicio).sort()[0]}:00-05:00`).getTime();
  const tomorrow = start.getTime() + 24 * 60 * 60 * 1000;
  return new Date(start.getTime() >= opening && closing > start.getTime() ? Math.min(closing, tomorrow) : tomorrow).toISOString();
}
