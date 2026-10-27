'use client';

import { timeLabel } from '@/app/lib/time-label';

import { useState, type FormEvent, type Dispatch, type SetStateAction } from 'react';
import { FiCalendar, FiCheck, FiClock, FiInfo, FiSend } from 'react-icons/fi';
import { dateLabel, isFutureSlot, overlaps, reservationsForDate, schoolDate } from '@/app/lib/teacher-utils';
import { useTeacher } from './TeacherContext';
import { Notice } from './TeacherUi';
import Time12Input from './Time12Input';
import MonthCalendar from './MonthCalendar';
import s from './TeacherWorkspace.module.css';

export type BookingSlot = { date: string; start: string; end: string; grade?: string; section?: string };
export type TimeBlock = { hora_inicio: string; hora_fin: string };
export default function ClassroomBookingForm({ slot, setSlot, reason, setReason, busy, error, blocks, onSubmit, onClose }: {
  slot: BookingSlot; setSlot: Dispatch<SetStateAction<BookingSlot | null>>; reason: string; setReason: (value: string) => void;
  busy: boolean; error: string; blocks: TimeBlock[]; onSubmit: (event: FormEvent) => void; onClose: () => void;
}) {
  const { data } = useTeacher();
  const [month, setMonth] = useState(slot.date.slice(0, 7) + '-01');
  const [custom, setCustom] = useState(!blocks.some(block => block.hora_inicio === slot.start && block.hora_fin === slot.end));
  const occupied = reservationsForDate(data?.schedule || [], slot.date);
  const conflict = overlaps(slot.start, slot.end, occupied);
  const future = isFutureSlot(slot.date, slot.start);
  const validTime = slot.start && slot.end && slot.start < slot.end;
  const duration = validTime ? (Number(slot.end.slice(0, 2)) * 60 + Number(slot.end.slice(3))) - (Number(slot.start.slice(0, 2)) * 60 + Number(slot.start.slice(3))) : 0;
  const chooseDate = (date: string) => {
    const taken = reservationsForDate(data?.schedule || [], date);
    const free = blocks.find(block => isFutureSlot(date, block.hora_inicio) && !overlaps(block.hora_inicio, block.hora_fin, taken));
    setSlot({ date, start: free?.hora_inicio || '', end: free?.hora_fin || '' });
    setCustom(false);
  };
  return <form onSubmit={onSubmit}>
    {error && <Notice tone="error">{error}</Notice>}
    <fieldset disabled={busy} className={s.bookingFieldset}>
      <div className={s.bookingSteps}><span><b>1</b>Elige un día</span><span><b>2</b>Selecciona la hora</span><span><b>3</b>Describe tu clase</span></div>
      <div className={s.bookingColumns}>
        <div><MonthCalendar month={month} onMonthChange={setMonth} value={slot.date} onChange={chooseDate} reservations={data?.schedule || []} userId={data?.user.id} compact futureOnly />
          <div className={s.field} style={{ marginTop: 17 }}><label htmlFor="reserve-date">Fecha de la clase</label><input id="reserve-date" type="date" min={schoolDate()} required value={slot.date} onChange={event => { if (event.target.value) { chooseDate(event.target.value); setMonth(event.target.value.slice(0, 7) + '-01'); } }} /><small>Puedes tocar el almanaque o escribir la fecha.</small></div>
        </div>
        <div>
          <div className={s.bookingSelectedDate}><FiCalendar size={18} /><div><small>Tu clase será el</small><strong>{dateLabel(slot.date, { weekday: 'long', day: 'numeric', month: 'long' })}</strong></div></div>
          <label className={s.label}>Turnos de clase</label>
          <div className={s.timeChoices} aria-label="Turnos disponibles para reservar">{blocks.map(block => {
            const taken = overlaps(block.hora_inicio, block.hora_fin, occupied);
            const past = !isFutureSlot(slot.date, block.hora_inicio);
            const selected = !custom && slot.start === block.hora_inicio && slot.end === block.hora_fin;
            return <button type="button" key={block.hora_inicio} disabled={taken || past} aria-pressed={selected} onClick={() => { setCustom(false); setSlot({ ...slot, start: block.hora_inicio, end: block.hora_fin }); }}><span>{selected ? <FiCheck size={14} /> : <FiClock size={14} />}{timeLabel(block.hora_inicio)} – {timeLabel(block.hora_fin)}</span><small>{taken ? 'Ocupado' : past ? 'Finalizado' : 'Disponible'}</small></button>;
          })}</div>
          <button type="button" className={s.customTimeToggle} aria-expanded={custom} onClick={() => {
            if (custom) chooseDate(slot.date);
            else setCustom(true);
          }}>{custom ? 'Usar un turno de clase' : 'Necesito otro horario'}</button>
          {custom && <div className={s.formGrid}><div className={s.field}><label htmlFor="reserve-start">Hora de inicio</label><Time12Input id="reserve-start" value={slot.start} onChange={value => setSlot({ ...slot, start: value })} /></div><div className={s.field}><label htmlFor="reserve-end">Hora de fin</label><Time12Input id="reserve-end" value={slot.end} onChange={value => setSlot({ ...slot, end: value })} /></div></div>}
          {slot.start && (!validTime || !future || conflict) && <Notice tone="warning">{!validTime ? 'La hora de fin debe ser posterior al inicio.' : !future ? 'Este horario ya pasó. Selecciona uno futuro.' : 'Este horario está ocupado. Selecciona otro turno.'}</Notice>}
          {!slot.start && <Notice tone="warning">No hay turnos de clase libres en esta fecha. Elige otro día o consulta un horario personalizado.</Notice>}
          {occupied.length > 0 && <details className={s.occupiedDetails}><summary>Ver horas ocupadas ({occupied.length})</summary>{occupied.map(row => <p key={row.id}><strong>{timeLabel(row.hora_inicio)} – {timeLabel(row.hora_fin)}</strong> · {row.estado === 'pendiente' ? 'En revisión' : 'Reservado'}</p>)}</details>}
          <div className={s.field}><label htmlFor="reserve-reason">Actividad y sección</label><textarea id="reserve-reason" required maxLength={255} rows={3} placeholder="Ej. Investigación de Ciencias con 4.º A." value={reason} onChange={event => setReason(event.target.value)} /><small>{reason.length}/255 caracteres</small></div>
        </div>
      </div>
      <div className={s.bookingReview}><FiInfo size={18} /><div><strong>{validTime ? `${timeLabel(slot.start)} – ${timeLabel(slot.end)} · ${duration} minutos` : 'Selecciona una hora disponible'}</strong><p>Sala de cómputo. Tu reserva quedará confirmada cuando administración la apruebe.</p></div></div>
    </fieldset>
    <div className={s.bookingFooter}><button type="button" className={s.secondary} onClick={onClose} disabled={busy}>Volver al calendario</button><button className={s.button} type="submit" disabled={busy || !validTime || !future || conflict || !reason.trim()}><FiSend size={15} />{busy ? 'Enviando solicitud…' : 'Enviar solicitud'}</button></div>
  </form>;
}
