import SolicitudApprovalNotice from '@/app/components/SolicitudApprovalNotice';
import ProfesorHeader from '@/app/components/ProfesorHeader';
import ProfesorBottomNav from '@/app/components/ProfesorBottomNav';
import ProfesorMobileTopBar from '@/app/components/ProfesorMobileTopBar';

export default function ProfesorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="profesor-shell min-vh-100" style={{ paddingBottom: '75px' }}>
      <div className="d-lg-none">
        <ProfesorMobileTopBar />
      </div>
      <div className="d-none d-lg-block">
        <ProfesorHeader />
      </div>
      <div className="profesor-content">{children}</div>
      <ProfesorBottomNav />
      <SolicitudApprovalNotice />
    </div>
  );
}
