import type { Metadata, Viewport } from 'next';
import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import PwaSupport from './components/PwaSupport';

export const metadata: Metadata = {
  title: 'Colegio - Sistema de Inventarios',
  description: 'Sistema de gestión de inventarios y disponibilidad para colegio',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'Inventario', statusBarStyle: 'default' },
  icons: {
    icon: [
      { url: '/logo.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1e2938',
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
        <PwaSupport />
      </body>
    </html>
  );
}
