import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';
import AccountRequestsInbox from '@/app/components/admin/AccountRequestsInbox';
import TeacherManagementTabs from '@/app/components/admin/TeacherManagementTabs';
import s from '@/app/components/TeachersDirectory.module.css';

export default function AccountRequestsPage() {
  return <section className={s.page}>
    <header className={s.header}>
      <div>
        <Link href="/admin/dashboard" className={s.breadcrumb}><FiArrowLeft size={14} />Administración</Link>
        <h1>Profesores y cuentas</h1>
        <p>Revisa las solicitudes de acceso y administra tu equipo docente.</p>
      </div>
    </header>
    <TeacherManagementTabs />
    <AccountRequestsInbox />
  </section>;
}
