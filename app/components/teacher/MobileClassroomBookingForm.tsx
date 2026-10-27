'use client';

import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { FiSend } from 'react-icons/fi';
import { isFutureSlot, minimumBookingTime, overlaps, reservationsForDate, schoolDate } from '@/app/lib/teacher-utils';
import { timeLabel } from '@/app/lib/time-label';
import { useTeacher } from './TeacherContext';
import { Notice } from './TeacherUi';
import type { BookingSlot } from './ClassroomBookingForm';
import MobileTimeInput from './MobileTimeInput';
import s from './TeacherWorkspace.module.css';
import m from './ScheduleMobile.module.css';

export default function MobileClassroomBookingForm({ slot, setSlot, reason, setReason, busy, error, onSubmit, onClose }: {
  slot: BookingSlot; setSlot: Dispatch<SetStateAction<BookingSlot | null>>;
  reason: string; setReason: (value: string) => void; busy: boolean; error: string;
  onSubmit: (event: FormEvent) => void; onClose: () => void;
}) {
  const { data } = useTeacher();
  const [editingTime, setEditingTime] = useState<'start' | 'end' | null>(null);
  const [minute, setMinute] = useState(() => Math.floor(Date.now() / 60000));
  useEffect(() => {
    const tick = () => setMinute(Math.floor(Date.now() / 60000));
    const timer = window.setInterval(tick, 1000);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', tick); document.removeEventListener('visibilitychange', tick); };
  }, []);
  const now = minute * 60000;
  const today = schoolDate(new Date(now));
  const earliest = minimumBookingTime(slot.date, now);
  const startAllowed = !!earliest && !!slot.start && slot.start >= earliest && slot.start <= '23:58';
  const endMinute = slot.start ? Number(slot.start.slice(0, 2)) * 60 + Number(slot.start.slice(3, 5)) + 1 : 0;
  const earliestEnd = `${String(Math.floor(endMinute / 60)).padStart(2, '0')}:${String(endMinute % 60).padStart(2, '0')}`;
  useEffect(() => {
    if (slot.start && (!earliest || slot.start < earliest)) {
      setSlot(current => current?.date === slot.date && current.start === slot.start ? { ...current, start: '', end: '' } : current);
    }
  }, [earliest, slot.date, slot.start, setSlot]);
  const occupied = reservationsForDate(data?.schedule || [], slot.date);
  const validTime = startAllowed && !!slot.end && slot.start < slot.end;
  const future = isFutureSlot(slot.date, slot.start, now);
  const conflict = validTime && overlaps(slot.start, slot.end, occupied);
  return <form className={m.booking} onSubmit={onSubmit}>
    {error && <Notice tone="error">{error}</Notice>}
    <fieldset disabled={busy}>
      <legend>Solicitar sala de cómputo</legend>
      <div className={m.booking}>
        <label htmlFor="mobile-reserve-date">Fecha
          <input id="mobile-reserve-date" type="date" required min={today} value={slot.date}
            onChange={event => { setEditingTime(null); setSlot({ ...slot, date: event.target.value }); }} />
        </label>
        <div>
          <div className={m.timeRange}>
            <MobileTimeInput id="mobile-reserve-start" label="Desde" expanded={editingTime === 'start'} onToggle={open => setEditingTime(open ? 'start' : null)} min={earliest || '00:00'} max="23:58" disabled={!earliest} value={slot.start}
              onChange={value => setSlot(current => current ? { ...current, start: value, end: current.end > value ? current.end : '' } : current)} />
            <MobileTimeInput id="mobile-reserve-end" label="Hasta" expanded={editingTime === 'end'} onToggle={open => setEditingTime(open ? 'end' : null)} min={earliestEnd} disabled={!startAllowed} value={slot.end}
              onChange={value => setSlot(current => current ? { ...current, end: value } : current)} />
          </div>
          <small role="status">{!earliest ? 'Ya no hay horas disponibles en esta fecha. Elige un día futuro.' : slot.date === today ? `Hoy puedes comenzar desde las ${timeLabel(earliest)} (hora de Lima). Las horas anteriores están bloqueadas.` : 'Horario de Lima. Selecciona a. m. para la mañana o p. m. para la tarde.'}</small>
        </div>
        <div className={m.pair}>
          <label htmlFor="mobile-reserve-grade">Grado
            <select id="mobile-reserve-grade" required value={slot.grade || ''} onChange={event => setSlot({ ...slot, grade: event.target.value })}>
              <option value="">Selecciona</option>
              {[1, 2, 3, 4, 5].map(grade => <option key={grade} value={String(grade)}>{grade}.º</option>)}
            </select>
          </label>
          <label htmlFor="mobile-reserve-section">Sección
            <select id="mobile-reserve-section" required value={slot.section || ''} onChange={event => setSlot({ ...slot, section: event.target.value })}>
              <option value="">Selecciona</option><option value="A">A</option><option value="B">B</option>
            </select>
          </label>
        </div>
        <label htmlFor="mobile-reserve-message">Mensaje
          <textarea id="mobile-reserve-message" required maxLength={247} rows={3} placeholder="Describe la actividad que realizarás." value={reason} onChange={event => setReason(event.target.value)} />
        </label>
        {slot.start && (!validTime || !future || conflict) && <Notice tone="warning">{!validTime ? 'La hora de fin debe ser posterior al inicio.' : !future ? 'Elige un horario futuro.' : 'Ese horario está ocupado. Elige otras horas.'}</Notice>}
        {occupied.length > 0 && <details><summary>Ver quién ocupa la sala ese día ({occupied.length})</summary><ul className={m.occupied}>{occupied.map(row => <li key={row.id}>
          <strong>{row.hora_inicio.slice(0, 5)} – {row.hora_fin.slice(0, 5)}</strong>
          <span>{[row.reservado_por_nombre, row.reservado_por_apellido].filter(Boolean).join(' ') || 'Docente asignado'}</span>
          <span>{row.motivo_reserva || 'Clase en sala'}</span>
        </li>)}</ul></details>}
        <small>La reserva se confirma cuando administración la aprueba.</small>
      </div>
    </fieldset>
    <div className={m.actions}>
      <button type="button" className={s.secondary} disabled={busy} onClick={onClose}>Volver al día</button>
      <button type="submit" className={s.button} disabled={busy || editingTime !== null || !validTime || !future || conflict || !slot.grade || !slot.section || !reason.trim()}><FiSend size={15} />{busy ? 'Enviando…' : 'Solicitar sala'}</button>
    </div>
  </form>;
}
