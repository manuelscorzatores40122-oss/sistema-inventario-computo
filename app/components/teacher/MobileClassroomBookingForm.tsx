'use client';

import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { FiSend } from 'react-icons/fi';
import { isFutureSlot, overlaps, reservationsForDate, schoolDate } from '@/app/lib/teacher-utils';
import { useTeacher } from './TeacherContext';
import { Notice } from './TeacherUi';
import type { BookingSlot } from './ClassroomBookingForm';
import s from './TeacherWorkspace.module.css';
import m from './ScheduleMobile.module.css';

export default function MobileClassroomBookingForm({ slot, setSlot, reason, setReason, busy, error, onSubmit, onClose }: {
  slot: BookingSlot; setSlot: Dispatch<SetStateAction<BookingSlot | null>>;
  reason: string; setReason: (value: string) => void; busy: boolean; error: string;
  onSubmit: (event: FormEvent) => void; onClose: () => void;
}) {
  const { data } = useTeacher();
  const occupied = reservationsForDate(data?.schedule || [], slot.date);
  const validTime = !!slot.start && !!slot.end && slot.start < slot.end;
  const future = isFutureSlot(slot.date, slot.start);
  const conflict = validTime && overlaps(slot.start, slot.end, occupied);
  return <form className={m.booking} onSubmit={onSubmit}>
    {error && <Notice tone="error">{error}</Notice>}
    <fieldset disabled={busy}>
      <legend>Solicitar sala de cómputo</legend>
      <div className={m.booking}>
        <label htmlFor="mobile-reserve-date">Fecha
          <input id="mobile-reserve-date" type="date" required min={schoolDate()} value={slot.date}
            onChange={event => setSlot({ ...slot, date: event.target.value })} />
        </label>
        <div className={m.pair}>
          <label htmlFor="mobile-reserve-start">Desde
            <input id="mobile-reserve-start" type="time" required step={60} value={slot.start} onChange={event => setSlot({ ...slot, start: event.target.value })} />
          </label>
          <label htmlFor="mobile-reserve-end">Hasta
            <input id="mobile-reserve-end" type="time" required step={60} value={slot.end} onChange={event => setSlot({ ...slot, end: event.target.value })} />
          </label>
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
      <button type="submit" className={s.button} disabled={busy || !validTime || !future || conflict || !slot.grade || !slot.section || !reason.trim()}><FiSend size={15} />{busy ? 'Enviando…' : 'Solicitar sala'}</button>
    </div>
  </form>;
}
