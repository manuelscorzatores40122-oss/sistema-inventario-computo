'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconType } from 'react-icons';

export type MobileNavItem = {
  href: string;
  title: string;
  short: string;
  icon: IconType;
};

export default function MobileBottomNav({ items }: { items: MobileNavItem[] }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === items[0].href
      ? pathname === href
      : pathname.startsWith(href);

  return (
    <nav className="mobile-bottom-nav" aria-label="Navegación móvil">
      {items.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? 'mb-nav-item active' : 'mb-nav-item'}
            aria-current={active ? 'page' : undefined}
            onClick={() => {
              const nav = document.querySelector('.mobile-bottom-nav');
              nav?.scrollTo?.({ top: 0 });
            }}
          >
            <span className="mb-nav-icon">
              <Icon className="mb-nav-ico" size={21} strokeWidth={active ? 2.5 : 2} />
            </span>
            <span className="mb-nav-label">{item.short}</span>
          </Link>
        );
      })}
    </nav>
  );
}