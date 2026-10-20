'use client';

export default function Time12Input({ id, value, onChange }: {
  id: string; value: string; onChange: (value: string) => void;
}) {
  const hour = value ? Number(value.slice(0, 2)) : 8;
  const minute = value ? value.slice(3, 5) : '00';
  const update = (h: number, m: string, pm: boolean) =>
    onChange(`${String(h % 12 + (pm ? 12 : 0)).padStart(2, '0')}:${m}`);
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: 6, minWidth: 0 }}>
    <select id={id} required value={value ? hour % 12 || 12 : ''} onChange={e => update(Number(e.target.value), minute, hour >= 12)}>
      <option value="" disabled>Hora</option>
      {Array.from({ length: 12 }, (_, i) => i + 1).map(h => <option key={h} value={h}>{h}</option>)}
    </select>
    <select aria-label={id === 'reserve-start' ? 'Minutos de inicio' : 'Minutos de fin'} value={minute} onChange={e => update(hour % 12 || 12, e.target.value, hour >= 12)}>
      {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map(m => <option key={m} value={m}>{m}</option>)}
    </select>
    <select aria-label="Periodo del día" value={hour >= 12 ? 'pm' : 'am'} onChange={e => update(hour % 12 || 12, minute, e.target.value === 'pm')}>
      <option value="am">a. m.</option><option value="pm">p. m.</option>
    </select>
  </div>;
}
