import ProfesorHeader from '@/app/components/ProfesorHeader';

export default function ProfesorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-vh-100 bg-light">
      <ProfesorHeader />
      {children}
    </div>
  );
}