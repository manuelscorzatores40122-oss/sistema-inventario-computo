'use client';

import { useId, useRef } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { calendarMonthDays, dateLabel, reservationsForDate, schoolDate, type Reservation } from '@/app/lib/teacher-utils';
import s from './TeacherWorkspace.module.css';

export default function MonthCalendar({ month, onMonthChange, value, onChange, reservations, userId, compact = false, futureOnly = false, admin = false }: {
  month: string; onMonthChange: (month: string) => void; value: string; onChange: (date: string) => void;
  reservations: Reservation[]; userId?: number; compact?: boolean; futureOnly?: boolean; admin?: boolean;
}) {
  const heading = useId();
  const grid = useRef<HTMLDivElement>(null);
  const today = schoolDate();
  function moveMonth(offset: number) {
    const next = new Date(`${month}T12:00:00Z`);
    next.setUTCMonth(next.getUTCMonth() + offset);
    onMonthChange(next.toISOString().slice(0, 10));
  }
  return <section className={`${s.almanac} ${compact ? s.almanacCompact : ''}`} data-admin={admin} aria-labelledby={heading}>
    <header className={s.almanacHeader}>
      <div><span className={s.eyebrow}>{admin ? 'CALENDARIO DE LA SALA' : compact ? 'ELIGE LA FECHA DE TU CLASE' : 'PLANIFICA TU PRÓXIMA CLASE'}</span><h2 id={heading}>{dateLabel(month, { month: 'long', year: 'numeric' })}</h2></div>
      <div className={s.almanacControls}><button type="button" className={s.iconButton} aria-label="Mes anterior" onClick={() => moveMonth(-1)}><FiChevronLeft size={17} /></button><button type="button" className={s.iconButton} aria-label="Mes siguiente" onClick={() => moveMonth(1)}><FiChevronRight size={17} /></button></div>
    </header>
    <div ref={grid} className={s.almanacGrid}>
      {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => <div key={day} className={s.almanacWeekday}>{day}</div>)}
      {calendarMonthDays(month).map(date => {
        const events = reservationsForDate(reservations, date);
        const mine = events.some(row => row.reservado_por === userId);
        const past = date < today;
        return <button type="button" key={date} className={s.almanacDate} disabled={futureOnly && past}
          aria-pressed={value === date} aria-current={date === today ? 'date' : undefined}
          data-outside={date.slice(0, 7) !== month.slice(0, 7)} data-past={past} data-mine={mine}
          aria-label={`${dateLabel(date, { weekday: 'long', day: 'numeric', month: 'long' })}${mine ? ', tienes una reserva' : ''}, ${events.length} turnos ocupados`}
          onClick={() => { onChange(date); if (date.slice(0, 7) !== month.slice(0, 7)) onMonthChange(date.slice(0, 7) + '-01'); }}>
          <strong>{Number(date.slice(8, 10))}</strong>
          <span className={s.almanacMarkers} aria-hidden="true">{events.slice(0, 3).map(row => <i key={row.id} data-mine={admin ? !row.fecha_reserva : row.reservado_por === userId} />)}</span>
          {!compact && <small>{mine ? 'Mi reserva' : events.length ? `${events.length} ${events.length === 1 ? 'turno ocupado' : 'turnos ocupados'}` : past ? '' : 'Sin reservas'}</small>}
        </button>;
      })}
    </div>
    <footer className={s.almanacFooter}><span><i />{admin ? 'Clases semanales' : 'Mis reservas'}</span><span><i />{admin ? 'Reservas por fecha' : 'Otros turnos ocupados'}</span><button type="button" onClick={() => { onMonthChange(today.slice(0, 7) + '-01'); onChange(today); }}>Ir a hoy</button></footer>
  </section>;
}
