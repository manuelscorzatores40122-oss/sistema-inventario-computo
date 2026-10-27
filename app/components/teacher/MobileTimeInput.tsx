'use client';

import { useRef, useState } from 'react';
import { FiClock, FiChevronDown } from 'react-icons/fi';
import { timeLabel } from '@/app/lib/time-label';
import m from './ScheduleMobile.module.css';

export function mobileClockValue(hour: string, minute: string, period: 'am' | 'pm'): string | null {
  if (!/^\d{1,2}$/.test(hour) || !/^\d{1,2}$/.test(minute)) return null;
  const h = Number(hour), minutes = Number(minute);
  if (h < 1 || h > 12 || minutes > 59) return null;
  return `${String(h % 12 + (period === 'pm' ? 12 : 0)).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export default function MobileTimeInput({ id, label, value, onChange, min = '00:00', max = '23:59', disabled = false, expanded, onToggle }: {
  id: string; label: 'Desde' | 'Hasta'; value: string; onChange: (value: string) => void;
  min?: string; max?: string; disabled?: boolean; expanded: boolean; onToggle: (open: boolean) => void;
}) {
  const [hour, setHour] = useState('8');
  const [minute, setMinute] = useState('00');
  const [period, setPeriod] = useState<'am' | 'pm'>('am');
  const trigger = useRef<HTMLButtonElement>(null);
  const candidate = mobileClockValue(hour, minute, period);
  const valid = !!candidate && candidate >= min && candidate <= max;
  const suffix = label === 'Desde' ? 'inicio' : 'fin';
  function close() { onToggle(false); trigger.current?.focus(); }
  function toggle() {
    if (!expanded) {
      const initial = value || (min > '00:00' ? min : '08:00');
      const h = Number(initial.slice(0, 2));
      setHour(String(h % 12 || 12));
      setMinute(initial.slice(3, 5));
      setPeriod(h >= 12 ? 'pm' : 'am');
    }
    onToggle(!expanded);
  }
  return <div className={m.timeField}>
    <button ref={trigger} id={id} type="button" className={m.timeTrigger} disabled={disabled}
      aria-label={`${label}: ${value ? timeLabel(value) : 'Elegir hora'}`} aria-expanded={expanded && !disabled} aria-controls={`${id}-clock`} onClick={toggle}>
      <FiClock size={19} aria-hidden="true" />
      <span><span className={m.timeLabel}>{label}</span><strong>{value ? timeLabel(value) : 'Elegir hora'}</strong></span>
      <FiChevronDown size={17} aria-hidden="true" />
    </button>
    {expanded && !disabled && <div id={`${id}-clock`} className={m.clockPanel} role="group" aria-label={`Elegir hora de ${suffix}`}
      onKeyDown={event => { if (event.key === 'Enter') event.preventDefault(); }}>
      <div className={m.clockDigits}>
        <label htmlFor={`${id}-hour`}>Hora
          <input id={`${id}-hour`} aria-label={`Hora de ${suffix}`} inputMode="numeric" autoComplete="off" maxLength={2} value={hour}
            onFocus={event => event.currentTarget.select()} onChange={event => setHour(event.target.value.replace(/\D/g, '').slice(0, 2))} />
        </label>
        <span className={m.clockColon} aria-hidden="true">:</span>
        <label htmlFor={`${id}-minute`}>Minutos
          <input id={`${id}-minute`} aria-label={`Minutos de ${suffix}`} inputMode="numeric" autoComplete="off" maxLength={2} value={minute}
            onFocus={event => event.currentTarget.select()} onChange={event => setMinute(event.target.value.replace(/\D/g, '').slice(0, 2))} />
        </label>
        <div className={m.clockPeriod} role="group" aria-label={`Periodo de ${suffix}`}>
          <button type="button" aria-pressed={period === 'am'} disabled={min > '11:59'} onClick={() => setPeriod('am')}>a. m.</button>
          <button type="button" aria-pressed={period === 'pm'} disabled={max < '12:00'} onClick={() => setPeriod('pm')}>p. m.</button>
        </div>
      </div>
      <small role="status">{!candidate ? 'Escribe una hora de 1 a 12 y minutos de 00 a 59.' : !valid ? `Elige entre ${timeLabel(min)} y ${timeLabel(max)}` : `Hora elegida: ${timeLabel(candidate)}`}</small>
      <div className={m.clockActions}>
        <button type="button" onClick={close}>Cancelar</button>
        <button type="button" disabled={!valid} onClick={() => { if (valid && candidate) { onChange(candidate); close(); } }}>Usar hora</button>
      </div>
    </div>}
  </div>;
}
