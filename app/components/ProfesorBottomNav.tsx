'use client';

import MobileBottomNav, { MobileNavItem } from './MobileBottomNav';
import {
  FiHome,
  FiFileText,
  FiUser,
} from 'react-icons/fi';

const items: MobileNavItem[] = [
  { href: '/profesor/dashboard', title: 'Dashboard', short: 'Inicio', icon: FiHome },
  { href: '/profesor/solicitudes', title: 'Mis Solicitudes', short: 'Solicitudes', icon: FiFileText },
  { href: '/profesor/perfil', title: 'Mi Perfil', short: 'Perfil', icon: FiUser },
];

export default function ProfesorBottomNav() {
  return <MobileBottomNav items={items} />;
}