'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiArrowUpRight, FiBookOpen, FiCalendar, FiChevronRight, FiGrid, FiInbox, FiLogOut, FiPackage, FiUser } from 'react-icons/fi';
import { logout } from '@/app/lib/logout';
import { dateLabel, schoolDate } from '@/app/lib/teacher-utils';
import { presentNotification } from '@/app/lib/notification-presentation';
import NotificationCenter, { ActivityToast } from '../NotificationCenter';
import { TeacherProvider, useTeacher } from './TeacherContext';
import { Notice } from './TeacherUi';
import useMobileView from './useMobileView';
import s from './TeacherWorkspace.module.css';

const links = [
  { href: '/profesor/dashboard', label: 'Resumen general', short: 'Inicio', icon: FiGrid },
  { href: '/profesor/solicitar-articulo', label: 'Solicitar equipos', short: 'Equipos', icon: FiPackage },
  { href: '/profesor/solicitudes', label: 'Mis solicitudes', short: 'Solicitudes', icon: FiInbox },
  { href: '/profesor/horario', label: 'Sala de cómputo', short: 'Horario', icon: FiCalendar },
  { href: '/profesor/perfil', label: 'Mi perfil', short: 'Perfil', icon: FiUser },
];
function Workspace({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data, error, refresh } = useTeacher();
  const [leaving, setLeaving] = useState(false);
  const mobile = useMobileView();
  const current = links.find(link => pathname.startsWith(link.href)) || links[0];
  const user = data?.user;
  const notices = data?.notifications.map(row => presentNotification(row, false)) || [];
  return <div className={s.shell}>
    <a href="#teacher-content" className="visually-hidden-focusable">Ir al contenido</a>
    <aside className={s.sidebar}>
      <Link href="/profesor/dashboard" className={s.brand}><img src="/logo.png" alt="Escudo del colegio" /><div><strong>I.E. Manuel Scorza</strong><small>ESPACIO DOCENTE</small></div></Link>
      <p className={s.navLabel}>Mi espacio de trabajo</p>
      <nav className={s.nav} aria-label="Navegación del docente">{links.map(item => <Link key={item.href} href={item.href} aria-current={pathname.startsWith(item.href) ? 'page' : undefined}><item.icon size={18} />{item.label}</Link>)}</nav>
      <div className={s.sidebarHelp}><FiBookOpen size={24} /><strong>Todo listo para tu clase</strong>Encuentra equipos, reserva la sala y sigue tus solicitudes desde aquí.<Link href="/profesor/solicitudes?tab=prestamos">Consultar mis préstamos <FiArrowUpRight /></Link></div>
      <div className={s.sidebarUser}><span className={s.avatar}>{user?.nombre?.charAt(0) || 'D'}{user?.apellido?.charAt(0)}</span><div><strong>{user?.nombre || 'Docente'}</strong><small>{user?.area || 'Profesor'}</small></div><button className={s.iconButton} aria-label="Cerrar sesión" disabled={leaving} onClick={() => { setLeaving(true); void logout(); }}><FiLogOut size={17} /></button></div>
    </aside>
    <div className={s.main}>
      <header className={s.topbar}>
        <div className={s.breadcrumb}>Espacio docente <FiChevronRight size={12} /><strong>{current.label}</strong></div>
        <Link className={s.mobileBrand} href="/profesor/dashboard"><img src="/logo.png" alt="" /><div><strong>Manuel Scorza</strong><small>Espacio docente</small></div></Link>
        <div className={s.topbarRight}><span className={s.today}>{dateLabel(schoolDate(), { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          {user && <NotificationCenter items={notices} userId={user.id} />}<Link href="/profesor/perfil" className={s.avatar} aria-label="Ver mi perfil">{user?.nombre?.charAt(0) || 'D'}</Link>
        </div>
      </header>
      <main id="teacher-content" className={s.content}>
        {error && data && <Notice tone="warning">{error} Mostramos la última información disponible. <button className={s.textLink} style={{ border: 0, background: 'none' }} onClick={() => void refresh()}>Reintentar</button></Notice>}
        {children}
      </main>
    </div>
    {data && <ActivityToast items={notices} userId={data.user.id} prominentApprovals={mobile} />}
    <nav className={s.bottomNav} aria-label="Navegación móvil del docente">{links.map(item => <Link key={item.href} href={item.href} aria-current={pathname.startsWith(item.href) ? 'page' : undefined}><item.icon size={20} /><span>{item.short}</span></Link>)}</nav>
  </div>;
}
export default function TeacherWorkspace({ children }: { children: ReactNode }) {
  return <TeacherProvider><Workspace>{children}</Workspace></TeacherProvider>;
}
