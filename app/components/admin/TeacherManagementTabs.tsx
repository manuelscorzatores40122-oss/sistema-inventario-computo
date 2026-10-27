'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiUserPlus, FiUsers } from 'react-icons/fi';
import s from '../TeachersDirectory.module.css';

export default function TeacherManagementTabs() {
  const path = usePathname();
  return <nav className={s.managementNav} aria-label="Profesores y cuentas">
    <Link href="/admin/profesores" aria-current={path === '/admin/profesores' ? 'page' : undefined}><FiUsers size={18} />Directorio de profesores</Link>
    <Link href="/admin/profesores/cuentas" aria-current={path.startsWith('/admin/profesores/cuentas') ? 'page' : undefined}><FiUserPlus size={18} />Solicitudes de cuenta</Link>
  </nav>;
}
