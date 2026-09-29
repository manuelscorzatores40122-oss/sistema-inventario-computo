'use client';

import MobileBottomNav, { MobileNavItem } from './MobileBottomNav';
import {
  FiHome,
  FiPackage,
  FiUser,
} from 'react-icons/fi';

const items: MobileNavItem[] = [
  { href: '/profesor/dashboard', title: 'Dashboard', short: 'Inicio', icon: FiHome },
  { href: '/profesor/solicitar-articulo', title: 'Solicitar artículo', short: 'Solicitar', icon: FiPackage },
  { href: '/profesor/perfil', title: 'Mi Perfil', short: 'Perfil', icon: FiUser },
];

export default function ProfesorBottomNav() {
  return <MobileBottomNav items={items} />;
}