'use client';

import MobileBottomNav, { MobileNavItem } from './MobileBottomNav';
import {
  FiHome,
  FiFileText,
  FiClock,
  FiUser,
} from 'react-icons/fi';

const items: MobileNavItem[] = [
  { href: '/profesor/dashboard', title: 'Dashboard', short: 'Inicio', icon: FiHome },
  { href: '/profesor/solicitudes', title: 'Mis Solicitudes', short: 'Solicitudes', icon: FiFileText },
  { href: '/profesor/disponibilidad', title: 'Mi Disponibilidad', short: 'Horarios', icon: FiClock },
  { href: '/profesor/perfil', title: 'Mi Perfil', short: 'Perfil', icon: FiUser },
];

export default function ProfesorBottomNav() {
  return <MobileBottomNav items={items} />;
}