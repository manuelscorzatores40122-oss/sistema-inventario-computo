import { AdminActivityNotice } from '@/app/components/NotificacionesBell';
import AdminSidebar from '@/app/components/AdminSidebar';
import AdminBottomNav from '@/app/components/AdminMobileNav';
import MobileTopBar from '@/app/components/MobileTopBar';
import './admin-workspace.css';
import './admin-teacher-theme.css';
import teacherStyles from '@/app/components/teacher/TeacherWorkspace.module.css';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${teacherStyles.shell} admin-workspace min-vh-100 bg-light pb-nav-mobile`}>
      <div className="d-lg-none">
        <MobileTopBar />
      </div>
      <div className="d-none d-lg-block">
        <AdminSidebar />
      </div>
      <main className="main-content-offset">{children}</main>
      <AdminBottomNav />
      <AdminActivityNotice />
    </div>
  );
}
