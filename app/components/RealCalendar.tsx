'use client';

import { useEffect, useState } from 'react';
import { FiCalendar, FiChevronLeft, FiChevronRight, FiClock } from 'react-icons/fi';

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

  const dateStr = now.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('es-ES');

  const cells: (number | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="inventory-panel p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-3 mb-3">
        <div className="d-flex align-items-center gap-3">
          <div className="rounded d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary" style={{ width: '38px', height: '38px' }}>
            <FiCalendar size={18} />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-950 mb-0">
              {MESES[month]} {year}
            </h2>
            <p className="text-xs font-semibold text-slate-500 mb-0">Calendario en tiempo real</p>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <div className="rounded-lg bg-slate-100 px-3 py-2 d-flex align-items-center gap-2">
            <FiClock size={14} className="text-primary" />
            <span className="text-sm font-bold text-slate-800 font-mono">{timeStr}</span>
          </div>
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
            <span className="text-xs font-bold text-blue-800 capitalize">{dateStr}</span>
          </div>
          <button className="btn-secondary-custom text-xs d-inline-flex align-items-center gap-1" onClick={prevMonth}>
            <FiChevronLeft size={14} />
          </button>
          <button className="btn-secondary-custom text-xs d-inline-flex align-items-center gap-1" onClick={goToday}>
            Hoy
          </button>
          <button className="btn-secondary-custom text-xs d-inline-flex align-items-center gap-1" onClick={nextMonth}>
            <FiChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
        {DIAS_CORTOS.map((dia) => (
          <div key={dia} className="text-center text-xs font-bold uppercase text-slate-400 mb-1">
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
              className="rounded d-flex align-items-center justify-content-center position-relative"
              style={{
                aspectRatio: '1',
                fontWeight: today ? 800 : 500,
                fontSize: '0.8rem',
                color: today ? '#ffffff' : past ? 'rgba(71, 85, 105, 0.4)' : '#1e293b',
                backgroundColor: today ? 'var(--color-primary)' : 'transparent',
                boxShadow: today ? '0 4px 10px rgba(37, 99, 235, 0.35)' : 'none',
              }}
            >
              {d}
              {hasReserva && !today && (
                <span
                  className="position-absolute rounded-circle"
                  style={{
                    bottom: '4px',
                    width: '5px',
                    height: '5px',
                    backgroundColor: past ? '#cbd5e1' : '#dc2626',
                  }}
                />
              )}
              {today && (
                <span
                  className="position-absolute rounded-circle"
                  style={{ bottom: '4px', width: '5px', height: '5px', backgroundColor: 'rgba(255,255,255,0.85)' }}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="d-flex flex-column gap-2 flex-md-row align-items-md-center justify-content-md-between border-t border-slate-200 pt-3 mt-3">
        <div className="d-flex align-items-center gap-4">
          <div className="d-flex align-items-center gap-2" style={{ rowGap: '0.2rem' }}>
            <span className="rounded-circle d-inline-block" style={{ width: '10px', height: '10px', backgroundColor: 'var(--color-primary)' }} />
            <span className="text-xs font-semibold text-slate-600">Hoy</span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="rounded-circle d-inline-block" style={{ width: '10px', height: '10px', backgroundColor: '#dc2626' }} />
            <span className="text-xs font-semibold text-slate-600">Día con reserva</span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="rounded-circle d-inline-block" style={{ width: '10px', height: '10px', backgroundColor: '#cbd5e1' }} />
            <span className="text-xs font-semibold text-slate-600">Día pasado</span>
          </div>
        </div>
        <span className="text-xs font-bold text-slate-500">
          {reservasHoy > 0
            ? `${reservasHoy} bloque${reservasHoy !== 1 ? 's' : ''} reservado${reservasHoy !== 1 ? 's' : ''} hoy`
            : 'Sin bloques reservados hoy'}
        </span>
      </div>
    </div>
  );
}