import ProfesorHeader from '@/app/components/ProfesorHeader';
import ProfesorBottomNav from '@/app/components/ProfesorBottomNav';
import MobileTopBar from '@/app/components/MobileTopBar';

export default function ProfesorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="profesor-shell min-vh-100 pb-nav-mobile">
      <div className="d-lg-none">
        <MobileTopBar />
      </div>
      <div className="d-none d-lg-block">
        <ProfesorHeader />
      </div>
      <div className="profesor-content">{children}</div>
      <ProfesorBottomNav />
    </div>
  );
}
