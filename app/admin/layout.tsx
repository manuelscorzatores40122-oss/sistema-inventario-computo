import AdminSidebar from '@/app/components/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-vh-100 bg-light">
      <AdminSidebar />
      <main style={{ marginLeft: '260px' }}>{children}</main>
    </div>
  );
}