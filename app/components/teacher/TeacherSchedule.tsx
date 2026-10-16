'use client';

import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { FiArrowRight, FiCalendar, FiCheckCircle, FiChevronLeft, FiChevronRight, FiClock, FiPlus, FiSend } from 'react-icons/fi';
import { addDays, dateLabel, isFutureSlot, overlaps, reservationsForDate, schoolDate, weekday } from '@/app/lib/teacher-utils';
import { useTeacher } from './TeacherContext';
import { DataBoundary, EmptyState, Modal, PageHeading, RefreshButton } from './TeacherUi';
import MonthCalendar from './MonthCalendar';
import ClassroomBookingForm from './ClassroomBookingForm';
import s from './TeacherWorkspace.module.css';

const defaultBlocks = [{ hora_inicio: '08:00', hora_fin: '08:45' }, { hora_inicio: '08:45', hora_fin: '09:30' }, { hora_inicio: '09:45', hora_fin: '10:30' }, { hora_inicio: '10:30', hora_fin: '11:15' }, { hora_inicio: '11:30', hora_fin: '12:15' }, { hora_inicio: '12:15', hora_fin: '13:00' }];
type Slot = { date: string; start: string; end: string };
export default function TeacherSchedule() {
  const { data, refresh } = useTeacher();
  const today = schoolDate();
  const [month, setMonth] = useState(() => today.slice(0, 7) + '-01');
  const [selectedDate, setSelectedDate] = useState(today);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<number | null>(null);
  const lock = useRef(false);
  const blocks = (data?.template.length ? data.template : defaultBlocks).filter(row => row.hora_inicio && row.hora_fin).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
  const schedule = data?.schedule || [];
  const dayReservations = reservationsForDate(schedule, selectedDate);
  const openSlot = (date: string, start?: string, end?: string) => {
    const chosen = date < today ? today : date;
    const free = blocks.find(block => isFutureSlot(chosen, block.hora_inicio) && !overlaps(block.hora_inicio, block.hora_fin, reservationsForDate(schedule, chosen)));
    setReason(''); setError(''); setSlot({ date: chosen, start: start || free?.hora_inicio || '', end: end || free?.hora_fin || '' });
  };
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current || !slot) return;
    setError('');
    if (slot.start >= slot.end || !isFutureSlot(slot.date, slot.start)) { setError('Elige un horario futuro con una hora de fin posterior al inicio.'); return; }
    if (overlaps(slot.start, slot.end, reservationsForDate(schedule, slot.date))) { setError('Este horario se cruza con una clase o reserva existente. Elige otro turno.'); return; }
    if (!reason.trim()) { setError('Describe la actividad para la que necesitas la sala.'); return; }
    lock.current = true; setBusy(true);
    try {
      const response = await fetch('/api/solicitudes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo_solicitud: 'aula', fecha_reserva: slot.date, hora_inicio: slot.start, hora_fin: slot.end, motivo: reason.trim() }) });
      const body = await response.json();
      if (!response.ok) {
        if (response.status === 409) await refresh();
        throw new Error(body.error || 'No pudimos solicitar la reserva.');
      }
      setSlot(null); setSuccess(body.solicitud.id); await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'No hay conexión. Intenta nuevamente.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <>
    <PageHeading eyebrow="ESPACIOS PARA APRENDER" title="Sala de cómputo" description="Consulta los turnos disponibles y reserva un espacio para tu clase." actions={<><RefreshButton /><button className={s.button} onClick={() => openSlot(selectedDate < today ? today : selectedDate)}><FiPlus size={16} />Solicitar reserva</button></>} />
    <DataBoundary>
      <div className={s.calendarIntro}><span><FiCalendar size={16} /> Elige un día en el almanaque</span><small>Los horarios se muestran en hora de Lima.</small></div>
      <div className={s.monthAgenda}>
        <div className={s.card}><MonthCalendar month={month} onMonthChange={setMonth} value={selectedDate} onChange={setSelectedDate} reservations={schedule} userId={data?.user.id} /></div>
        <section className={`${s.card} ${s.dayAgenda}`} aria-label="Turnos del día seleccionado"><span className={s.eyebrow}>AGENDA DEL DÍA</span><h2 style={{ textTransform: 'capitalize' }}>{weekday(selectedDate)}, {dateLabel(selectedDate, { day: 'numeric', month: 'long' })}</h2><p>Elige una hora disponible para tu clase.</p>{blocks.map(block => {
          const occupied = dayReservations.find(row => row.hora_inicio.slice(0, 5) < block.hora_fin && row.hora_fin.slice(0, 5) > block.hora_inicio);
          const mine = occupied?.reservado_por === data?.user.id;
          return <div className={s.row} key={block.hora_inicio}><div className={s.rowCopy}><strong>{block.hora_inicio} – {block.hora_fin}</strong><small>{occupied ? mine ? 'Tu reserva' : occupied.estado === 'pendiente' ? 'En revisión' : 'Ocupado' : isFutureSlot(selectedDate, block.hora_inicio) ? 'Disponible' : 'Finalizado'}</small>{occupied?.motivo_reserva && <small>{occupied.motivo_reserva}</small>}</div>{!occupied && isFutureSlot(selectedDate, block.hora_inicio) ? <button className={s.secondary} onClick={() => openSlot(selectedDate, block.hora_inicio, block.hora_fin)} aria-label={`Reservar turno de ${block.hora_inicio} a ${block.hora_fin}`}><FiPlus size={13} />Reservar</button> : <span className={s.badge} data-tone={mine ? 'green' : occupied?.estado === 'pendiente' ? 'amber' : 'gray'}>{mine ? 'Mi turno' : occupied ? 'Ocupado' : 'Finalizado'}</span>}</div>;
        })}{dayReservations.filter(row => !blocks.some(block => row.hora_inicio.slice(0, 5) < block.hora_fin && row.hora_fin.slice(0, 5) > block.hora_inicio)).map(row => <div className={s.row} key={`custom-${row.id}`}><div className={s.rowCopy}><strong>{row.hora_inicio.slice(0, 5)} – {row.hora_fin.slice(0, 5)}</strong><small>Reserva en horario personalizado</small></div><span className={s.badge} data-tone={row.reservado_por === data?.user.id ? 'green' : 'amber'}>{row.reservado_por === data?.user.id ? 'Mi turno' : 'Ocupado'}</span></div>)}<button className={`${s.secondary} ${s.full}`} style={{ marginTop: 15 }} onClick={() => openSlot(selectedDate < today ? today : selectedDate)}><FiClock size={15} />Otro horario</button></section>
      </div>
      <div className={s.columns} style={{ marginTop: 23 }}>
        <section className={s.card}><div className={s.cardHead}><div><h2>Mis próximas reservas</h2><p>Turnos aprobados y solicitudes en revisión.</p></div></div><div className={s.cardBody}>{(() => {
          const mine = Array.from({ length: 14 }, (_, index) => addDays(today, index)).flatMap(date => reservationsForDate(schedule, date).filter(row => row.reservado_por === data?.user.id && isFutureSlot(date, row.hora_fin)).map(row => ({ ...row, date })));
          return mine.length ? mine.slice(0, 6).map(row => <div className={s.row} key={`${row.id}-${row.date}`}><span className={s.resourceIcon}><FiCalendar size={20} /></span><div className={s.rowCopy}><strong>{weekday(row.date)} · {dateLabel(row.date)}</strong><small>{row.hora_inicio.slice(0, 5)} – {row.hora_fin.slice(0, 5)} · {row.motivo_reserva || 'Clase en sala'}</small></div><span className={s.badge} data-tone={row.estado === 'pendiente' ? 'amber' : 'green'}>{row.estado === 'pendiente' ? 'En revisión' : 'Confirmada'}</span></div>) : <EmptyState title="Todavía no tienes reservas próximas" description="Encuentra un turno libre en el horario o solicita un horario personalizado." />;
        })()}</div></section>
        <section className={s.card}><div className={s.cardHead}><h2>Antes de reservar</h2><FiClock color="#688878" /></div><div className={s.cardBody}><p style={{ fontSize: 12, color: '#6e8186' }}>Las clases fijas y las solicitudes en revisión ocupan el horario. Una reserva queda confirmada cuando administración la aprueba.</p><p style={{ fontSize: 12, color: '#6e8186' }}>¿Cambió tu planificación? Puedes cancelar una solicitud mientras siga en revisión.</p><Link href="/profesor/solicitudes" className={s.textLink}>Consultar mis solicitudes <FiArrowRight /></Link></div></section>
      </div>
    </DataBoundary>
    {slot && <Modal title="Reserva la sala para tu clase" onClose={() => setSlot(null)} busy={busy} wide><ClassroomBookingForm slot={slot} setSlot={setSlot} reason={reason} setReason={setReason} busy={busy} error={error} blocks={blocks} onSubmit={submit} onClose={() => setSlot(null)} /></Modal>}
    {success && <Modal title="Reserva solicitada" onClose={() => setSuccess(null)}><div className={s.successBox}><FiCheckCircle size={43} /><h2>Tu turno está en revisión</h2><p>Solicitud #{success}. Administración revisará la reserva y recibirás la respuesta en tu espacio docente.</p><Link className={s.button} href={`/profesor/solicitudes?solicitud=${success}`}>Ver mi solicitud <FiArrowRight /></Link></div></Modal>}
  </>;
}
