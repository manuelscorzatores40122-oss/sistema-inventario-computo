import AdminSidebar from '@/app/components/AdminSidebar';
import AdminBottomNav from '@/app/components/AdminBottomNav';
import MobileTopBar from '@/app/components/MobileTopBar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-vh-100 bg-light pb-nav-mobile">
      <div className="d-lg-none">
        <MobileTopBar />
      </div>
      <div className="d-none d-lg-block">
        <AdminSidebar />
      </div>
      <main className="main-content-offset">{children}</main>
      <AdminBottomNav />
    </div>
  );
}