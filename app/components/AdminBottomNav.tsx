'use client';

import MobileBottomNav, { MobileNavItem } from './MobileBottomNav';
import {
  FiGrid,
  FiPackage,
  FiInbox,
  FiClock,
  FiCalendar,
  FiUser,
} from 'react-icons/fi';

const items: MobileNavItem[] = [
  { href: '/admin/dashboard', title: 'Dashboard', short: 'Inicio', icon: FiGrid },
  { href: '/admin/inventario', title: 'Inventario', short: 'Stock', icon: FiPackage },
  { href: '/admin/prestamos', title: 'Préstamos', short: 'Préstamos', icon: FiInbox },
  { href: '/admin/solicitudes', title: 'Solicitudes', short: 'Solicitud', icon: FiClock },
  { href: '/admin/horario', title: 'Horario', short: 'Horario', icon: FiCalendar },
  { href: '/admin/perfil', title: 'Perfil', short: 'Perfil', icon: FiUser },
];

export default function AdminBottomNav() {
  return <MobileBottomNav items={items} />;
}