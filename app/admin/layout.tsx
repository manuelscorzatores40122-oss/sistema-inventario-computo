import { AdminActivityNotice } from '@/app/components/NotificacionesBell';
import AdminSidebar from '@/app/components/AdminSidebar';
import AdminBottomNav from '@/app/components/AdminMobileNav';
import MobileTopBar from '@/app/components/MobileTopBar';
import SystemFooter from '@/app/components/SystemFooter';
import './admin-workspace.css';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-workspace min-vh-100 bg-light pb-nav-mobile">
      <div className="d-lg-none">
        <MobileTopBar />
      </div>
      <div className="d-none d-lg-block">
        <AdminSidebar />
      </div>
      <main className="main-content-offset">{children}<SystemFooter /></main>
      <AdminBottomNav />
      <AdminActivityNotice />
    </div>
  );
}
