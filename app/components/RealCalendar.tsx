'use client';

import { useEffect, useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiClock } from 'react-icons/fi';

const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

type Props = {
  reservadosPorDia?: number[];
  reservasHoy?: number;
};

export default function RealCalendar({ reservadosPorDia = [], reservasHoy = 0 }: Props) {
  const [now, setNow] = useState(() => new Date());
  const [cursor, setCursor] = useState<Date>(() => new Date(now.getFullYear(), now.getMonth(), 1));

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth();
  const todayDate = now.getDate();

  const isToday = (d: number) => todayYear === year && todayMonth === month && todayDate === d;
  const weekdayOf = (d: number) => (new Date(year, month, d).getDay() + 6) % 7;
  const isPast = (d: number) => new Date(year, month, d) < new Date(todayYear, todayMonth, todayDate);

  const prevMonth = () => setCursor(new Date(year, month - 1, 1));
  const nextMonth = () => setCursor(new Date(year, month + 1, 1));
  const goToday = () => setCursor(new Date(todayYear, todayMonth, 1));

  const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const cells: (number | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="calendar-panel">
      <div className="calendar-header">
        <div className="d-flex align-items-center justify-content-between">
          <div>
            <div className="calendar-month">
              {MESES[month]} <span>{year}</span>
            </div>
            <div className="calendar-date text-capitalize">
              {dateStr}
            </div>
          </div>
          <div className="calendar-clock d-inline-flex align-items-center gap-1">
            <FiClock size={12} />
            {timeStr}
          </div>
        </div>
        <div className="d-flex align-items-center justify-content-between mt-2">
          <div className="d-flex align-items-center gap-1">
            <button className="calendar-nav-btn" onClick={prevMonth} aria-label="Mes anterior">
              <FiChevronLeft size={14} />
            </button>
            <button className="calendar-nav-btn" onClick={goToday} aria-label="Ir al día de hoy">
              Hoy
            </button>
            <button className="calendar-nav-btn" onClick={nextMonth} aria-label="Mes siguiente">
              <FiChevronRight size={14} />
            </button>
          </div>
          <span className="calendar-subtitle">
            {reservasHoy > 0
              ? `${reservasHoy} bloque${reservasHoy !== 1 ? 's' : ''} hoy`
              : 'Sin reservas hoy'}
          </span>
        </div>
      </div>

      <div className="calendar-body">
        <div className="calendar-week">
          {DIAS_CORTOS.map((dia) => (
            <div key={dia} className="calendar-dow">
              {dia}
            </div>
          ))}

          {cells.map((d, idx) => {
            if (d === null) {
              return <div key={`empty-${idx}`} />;
            }

            const today = isToday(d);
            const past = isPast(d);
            const hasReserva = reservadosPorDia.includes(weekdayOf(d));

            return (
              <div
                key={d}
                className={`calendar-day${today ? ' is-today' : ''}${past ? ' is-past' : ''}`}
              >
                {d}
                {hasReserva && <span className="calendar-dot" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="calendar-footer">
        <div className="calendar-legend">
          <span className="calendar-legend-item">
            <span className="calendar-legend-dot" style={{ backgroundColor: '#4f46e5' }} />
            Hoy
          </span>
          <span className="calendar-legend-item">
            <span className="calendar-legend-dot" style={{ backgroundColor: '#dc2626' }} />
            Reserva
          </span>
          <span className="calendar-legend-item">
            <span className="calendar-legend-dot" style={{ backgroundColor: '#cbd5e1' }} />
            Pasado
          </span>
        </div>
        <span className="calendar-reservas-today">
          Actualizado en tiempo real
        </span>
      </div>
    </div>
  );
}