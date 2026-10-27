'use client';

export default function Time12Input({ id, value, onChange, min = '00:00', max = '23:59', disabled = false, periodLabel = 'Periodo del día' }: {
  id: string; value: string; onChange: (value: string) => void;
  min?: string; max?: string; disabled?: boolean; periodLabel?: string;
}) {
  const fallback = min > '00:00' ? min : '08:00';
  const hour = Number((value || fallback).slice(0, 2));
  const minute = (value || fallback).slice(3, 5);
  const clock = (h: number, m: string, pm: boolean) => `${String(h % 12 + (pm ? 12 : 0)).padStart(2, '0')}:${m}`;
  const allowed = (time: string) => time >= min && time <= max;
  const hourAllowed = (h: number, pm: boolean) => clock(h, '59', pm) >= min && clock(h, '00', pm) <= max;
  const update = (h: number, m: string, pm: boolean) => {
    const next = clock(h, m, pm);
    onChange(next < min ? min : next > max ? max : next);
  };
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: 6, minWidth: 0 }}>
    <select id={id} required disabled={disabled} value={value ? hour % 12 || 12 : ''} onChange={e => update(Number(e.target.value), minute, hour >= 12)}>
      <option value="" disabled>Hora</option>
      {Array.from({ length: 12 }, (_, i) => i + 1).map(h => <option key={h} value={h} disabled={!hourAllowed(h, hour >= 12)}>{h}</option>)}
    </select>
    <select aria-label={id.includes('start') ? 'Minutos de inicio' : 'Minutos de fin'} disabled={disabled} value={minute} onChange={e => update(hour % 12 || 12, e.target.value, hour >= 12)}>
      {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map(m => <option key={m} value={m} disabled={!allowed(clock(hour % 12 || 12, m, hour >= 12))}>{m}</option>)}
    </select>
    <select aria-label={periodLabel} disabled={disabled} value={hour >= 12 ? 'pm' : 'am'} onChange={e => update(hour % 12 || 12, minute, e.target.value === 'pm')}>
      <option value="am" disabled={min > '11:59'}>a. m.</option><option value="pm" disabled={max < '12:00'}>p. m.</option>
    </select>
  </div>;
}
