'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiCalendar, FiClock, FiGrid, FiInbox, FiMenu, FiPackage, FiUser, FiUsers, FiX } from 'react-icons/fi';

const allLinks = [
  { href: '/admin/dashboard', label: 'Inicio', icon: FiGrid },
  { href: '/admin/inventario', label: 'Inventario', icon: FiPackage },
  { href: '/admin/solicitudes', label: 'Solicitudes', icon: FiInbox },
  { href: '/admin/prestamos', label: 'Préstamos', icon: FiPackage },
  { href: '/admin/profesores', label: 'Profesores y cuentas', icon: FiUsers },
  { href: '/admin/horario', label: 'Horario de la sala', icon: FiCalendar },
  { href: '/admin/historial', label: 'Historial por docente', icon: FiClock },
  { href: '/admin/perfil', label: 'Mi perfil', icon: FiUser },
];
export default function AdminMobileNav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    const element = dialog.current;
    if (!open || !element) return;
    const previous = document.activeElement as HTMLElement | null;
    element.showModal();
    return () => { element.close(); previous?.focus(); };
  }, [open]);
  return <>
    <nav className="admin-mobile-navigation" aria-label="Administración móvil">{allLinks.slice(0, 4).map(item => <Link key={item.href} href={item.href} aria-current={(path === item.href || (item.href === '/admin/profesores' && path.startsWith('/admin/profesores/'))) ? 'page' : undefined}><item.icon size={20} /><span>{item.label}</span></Link>)}<button onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}><FiMenu size={20} /><span>Más</span></button></nav>
    {open && <dialog ref={dialog} className="admin-navigation-dialog" aria-labelledby="admin-menu-title" onCancel={event => { event.preventDefault(); setOpen(false); }}><header><h2 id="admin-menu-title">Administración</h2><button aria-label="Cerrar menú" onClick={() => setOpen(false)}><FiX size={20} /></button></header><nav aria-label="Todos los módulos">{allLinks.map(item => <Link key={item.href} href={item.href} aria-current={(path === item.href || (item.href === '/admin/profesores' && path.startsWith('/admin/profesores/'))) ? 'page' : undefined} onClick={() => setOpen(false)}><item.icon size={21} />{item.label}</Link>)}</nav></dialog>}
  </>;
}
