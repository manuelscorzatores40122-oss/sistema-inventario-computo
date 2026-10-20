'use client';

import Link from 'next/link';
import { FiArrowRight, FiArrowUpRight, FiCalendar, FiCheck, FiClock, FiInbox, FiMonitor, FiPackage, FiPlus } from 'react-icons/fi';
import { dateLabel, reservationsForDate, schoolDate, weekday, addDays } from '@/app/lib/teacher-utils';
import { useTeacher } from './TeacherContext';
import { DataBoundary, EmptyState, PageHeading, RefreshButton, Status } from './TeacherUi';
import s from './TeacherWorkspace.module.css';

export default function TeacherDashboard() {
  const { data } = useTeacher();
  const pending = data?.requests.filter(row => row.estado === 'pendiente') || [];
  const collect = data?.loans.filter(row => row.estado === 'pendiente') || [];
  const active = data?.loans.filter(row => row.estado === 'prestado') || [];
  const available = data?.inventory.filter(row => row.estado === 'disponible' && row.cantidad_disponible > 0) || [];
  const today = schoolDate();
  const agenda = data ? Array.from({ length: 7 }, (_, index) => addDays(today, index)).flatMap(date =>
    reservationsForDate(data.schedule, date).filter(row => row.reservado_por === data.user.id).map(row => ({ ...row, date }))) : [];
  const stats = [
    { label: 'En revisión', value: pending.length, note: 'Solicitudes por responder', icon: FiClock, href: '/profesor/solicitudes?estado=pendiente' },
    { label: 'Por recoger', value: collect.length, note: 'Acércate a cómputo', icon: FiInbox, href: '/profesor/solicitudes?tab=prestamos&estado=pendiente' },
    { label: 'Equipos en uso', value: active.reduce((sum, row) => sum + row.cantidad, 0), note: `${active.length} préstamos activos`, icon: FiMonitor, href: '/profesor/solicitudes?tab=prestamos&estado=prestado' },
    { label: 'Mis próximos turnos', value: agenda.length, note: 'Durante los próximos 7 días', icon: FiCalendar, href: '/profesor/horario' },
  ];
  return <>
    <PageHeading eyebrow="Tu espacio, al día" title={`Hola, ${data?.user.nombre?.split(' ')[0] || 'docente'}`} description="Prepara tu próxima clase. Tus recursos y actividades, en un solo lugar." actions={<RefreshButton />} />
    <DataBoundary>
      <section className={s.stats} aria-label="Resumen de mi actividad">{stats.map(item => <Link key={item.label} className={s.stat} href={item.href}><div className={s.statTop}><span>{item.label}</span><item.icon size={17} /></div><strong>{item.value.toString().padStart(2, '0')}</strong><small>{item.note}</small></Link>)}</section>
      <section className={s.taskLaunchers} aria-label="Prepara tu clase">
        <Link className={s.taskLauncher} href="/profesor/horario"><span className={s.taskLauncherIcon}><FiCalendar size={26} /></span><div><small>PLANIFICACIÓN</small><h2>Reserva la sala</h2><p>Elige un día y encuentra tu próximo turno.</p></div><FiArrowUpRight size={22} /></Link>
        <Link className={s.taskLauncher} href="/profesor/solicitar-articulo"><span className={s.taskLauncherIcon}><FiMonitor size={26} /></span><div><small>RECURSOS PARA TU CLASE</small><h2>Solicita un equipo</h2><p>{available.length} recursos con unidades disponibles.</p></div><FiArrowUpRight size={22} /></Link>
      </section>
      <div className={s.columns}>
        <div className={s.stack}>
          <section className={s.card}><div className={s.cardHead}><div><h2>Mis solicitudes recientes</h2><p>Conoce en qué etapa está cada solicitud.</p></div><Link href="/profesor/solicitudes" className={s.textLink}>Ver todas <FiArrowRight /></Link></div><div className={s.cardBody}>
            {!data?.requests.length ? <EmptyState title="Tu próxima clase empieza aquí" description="Cuando solicites un equipo o reserves la sala, podrás seguir su estado en este espacio."><Link className={s.button} href="/profesor/solicitar-articulo">Explorar equipos <FiArrowRight /></Link></EmptyState> : data.requests.slice(0, 5).map(row => <Link key={row.id} href={`/profesor/solicitudes?solicitud=${row.id}`} className={s.row}><span className={s.resourceIcon}>{row.disponibilidad_id ? <FiCalendar size={20} /> : <FiPackage size={20} />}</span><div className={s.rowCopy}><strong>{row.item_nombre}</strong><small>#{row.id} · {dateLabel(row.fecha_solicitud)} · {row.disponibilidad_id ? 'Reserva de sala' : `${row.cantidad_solicitada} ${row.cantidad_solicitada === 1 ? 'unidad' : 'unidades'}`}</small></div><Status value={row.estado} /></Link>)}
          </div></section>
          <section className={s.card}><div className={s.cardHead}><div><h2>Equipos para tu próxima clase</h2><p>Disponibilidad actual del inventario.</p></div><Link href="/profesor/solicitar-articulo" className={s.textLink}>Explorar <FiArrowRight /></Link></div><div className={s.cardBody}>
            {available.length ? available.slice(0, 4).map(item => <Link className={s.row} key={item.id} href={`/profesor/solicitar-articulo?equipo=${item.id}`}><span className={s.resourceIcon}><FiMonitor size={21} /></span><div className={s.rowCopy}><strong>{item.nombre}</strong><small>{item.categoria}</small></div><span className={s.badge} data-tone="green">{item.cantidad_disponible} disponibles</span><FiArrowUpRight color="#7c9689" /></Link>) : <EmptyState title="Sin equipos disponibles por ahora" description="Vuelve a consultar cuando administración actualice el inventario." />}
          </div></section>
        </div>
        <div className={s.stack}>
          <section className={s.card}><div className={s.cardHead}><div><h2>Tu agenda de cómputo</h2><p>Próximos siete días</p></div><FiCalendar color="#718b7e" size={18} /></div><div className={s.cardBody}>
            {agenda.length ? agenda.slice(0, 4).map(row => <div className={s.row} key={`${row.id}-${row.date}`}><div className={s.rowCopy}><small>{weekday(row.date)} · {dateLabel(row.date)}</small><strong>{row.hora_inicio.slice(0, 5)} – {row.hora_fin.slice(0, 5)}</strong><small>{row.motivo_reserva || 'Sala de cómputo'}</small></div><Status value={row.estado === 'separado' ? 'aprobada' : row.estado} /></div>) : <EmptyState title="Tu agenda está libre" description="Elige un turno disponible para trabajar en la sala." />}
            <Link href="/profesor/horario" className={`${s.secondary} ${s.full}`}><FiCalendar size={15} />Consultar horario</Link>
          </div></section>
          <section className={s.card}><div className={s.cardHead}><div><h2>{collect.length ? 'Tienes equipos por recoger' : 'Mis préstamos'}</h2><p>{collect.length ? 'La administración ya aprobó tu equipo.' : 'Controla los equipos a tu cargo.'}</p></div><FiPackage color="#718b7e" size={18} /></div><div className={s.cardBody}>
            {[...collect, ...active].length ? [...collect, ...active].slice(0, 3).map(row => <div className={s.row} key={row.id}><div className={s.rowCopy}><strong>{row.item_nombre}</strong><small>{row.cantidad} unidades · Préstamo #{row.id}</small></div><Status value={row.estado} loan /></div>) : <div className={s.info}><FiCheck size={18} /><div><strong>Todo en orden</strong>No tienes equipos pendientes de recoger o devolver.</div></div>}
            <Link href="/profesor/solicitudes?tab=prestamos" className={s.textLink}>Consultar mis préstamos <FiArrowRight /></Link>
          </div></section>
        </div>
      </div>
    </DataBoundary>
  </>;
}
