'use client';

import MobileBottomNav, { MobileNavItem } from './MobileBottomNav';
import {
  FiGrid,
  FiPackage,
  FiClock,
  FiInbox,
  FiUser,
} from 'react-icons/fi';

const items: MobileNavItem[] = [
  { href: '/admin/dashboard', title: 'Dashboard', short: 'Inicio', icon: FiGrid },
  { href: '/admin/inventario', title: 'Inventario', short: 'Stock', icon: FiPackage },
  { href: '/admin/solicitudes', title: 'Solicitudes', short: 'Solicitudes', icon: FiInbox },
  { href: '/admin/horario', title: 'Horario', short: 'Horario', icon: FiClock },
  { href: '/admin/perfil', title: 'Perfil', short: 'Perfil', icon: FiUser },
];

export default function AdminBottomNav() {
  return <MobileBottomNav items={items} />;
}