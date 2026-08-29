import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Colegio - Sistema de Inventarios',
  description: 'Sistema de gestión de inventarios y disponibilidad para colegio',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        {children}
      </body>
    </html>
  );
}
