'use client';

import type { ReactNode } from 'react';
import { Roboto } from 'next/font/google';

import ProfesorHeader from './ProfesorHeader';
import styles from './ProfesorShell.module.css';

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
});

/**
 * Marco de todas las páginas del profesor.
 * - Define la paleta (variables CSS) que heredan header y páginas.
 * - Móvil: barra superior + contenido.
 * - Escritorio: barra lateral fija + contenido.
 */
export default function ProfesorShell({ children }: { children: ReactNode }) {
  return (
    <div className={`${styles.shell} ${roboto.className}`}>
      <ProfesorHeader />
      <div className={styles.contenido}>{children}</div>
    </div>
  );
}
