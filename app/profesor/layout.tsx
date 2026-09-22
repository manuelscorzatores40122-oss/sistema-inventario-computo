import type { ReactNode } from 'react';
import ProfesorShell from '../components/ProfesorShell';
import ProfesorBottomNav from '../components/ProfesorBottomNav';

export default function ProfesorLayout({ children }: { children: ReactNode }) {
  return (
    <ProfesorShell>
      {children}
      <ProfesorBottomNav />
    </ProfesorShell>
  );
}
