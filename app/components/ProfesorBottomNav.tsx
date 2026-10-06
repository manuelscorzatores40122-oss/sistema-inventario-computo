'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiHome, FiPackage, FiUser, FiCalendar } from 'react-icons/fi';

const items = [
  { href: '/profesor/dashboard', title: 'Inicio', icon: FiHome },
  { href: '/profesor/horario', title: 'Horario', icon: FiCalendar },
  { href: '/profesor/solicitar-articulo', title: 'Solicitar', icon: FiPackage, isPrimary: true },
  { href: '/profesor/perfil', title: 'Perfil', icon: FiUser },
];

export default function ProfesorBottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/profesor/dashboard'
      ? pathname === href
      : pathname.startsWith(href);

  return (
    <nav className="profesor-mobile-bottom-nav d-lg-none position-fixed bottom-0 w-100 bg-white border-top z-3 d-flex justify-content-around align-items-end pb-safe" style={{ height: '70px', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {items.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;

        if (item.isPrimary) {
          return (
            <Link key={item.href} href={item.href} className="text-decoration-none d-flex flex-column align-items-center justify-content-center position-relative pb-2" style={{ marginTop: '-24px', zIndex: 10 }}>
              <div className="d-flex align-items-center justify-content-center rounded-circle shadow" style={{ width: '60px', height: '60px', backgroundColor: '#f97316', color: '#fff', border: '4px solid #fff' }}>
                <Icon size={26} strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ea580c', marginTop: '2px' }}>{item.title}</span>
            </Link>
          );
        }

        return (
          <Link key={item.href} href={item.href} className={`text-decoration-none d-flex flex-column align-items-center justify-content-center pb-2 ${active ? '' : 'text-slate-400'}`} style={{ minWidth: '64px', height: '60px' }}>
            <div className={`d-flex align-items-center justify-content-center rounded-pill mb-1 ${active ? 'bg-orange-100' : ''}`} style={{ width: '48px', height: '32px', backgroundColor: active ? '#ffedd5' : 'transparent', color: active ? '#ea580c' : '#94a3b8', transition: 'all 0.2s' }}>
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: active ? 700 : 500, color: active ? '#ea580c' : '#94a3b8' }}>{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}